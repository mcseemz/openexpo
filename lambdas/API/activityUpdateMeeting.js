/**
 * @description Update activity meeting.
 *  Regenerate meeting attendees from json in activity
 * @class activityUpdateMeeting 
 */
const validator = require('./model/validation');
const meetingUtils = require('./model/meeting');
const activityUtil = require('./model/activity');
const noteUtils = require('./model/notes');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const attendeesUtil = require('./model/meetingAttendees');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const permissionUtil = require("./model/permissions");

function validateParams(params) {
  return (!params['url'] || validator.isValidUrl(params['url'])) &&
      (!params['start'] || validator.isValidDateTime(params['start']) && validator.isInFuture(params['start']) && validator.isWithinThreeYears(params['start'])) &&
      (!params['end'] || validator.isValidDateTime(params['end']) && validator.isInCorrectOrder(params['start'], params['end']) && validator.isWithinThreeYears(params['end']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityUpdateMeeting');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['meeting']) || !data['language'] || !validator.isValidLanguage(data['language'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const activity = await activityUtil.getActivityFromDbOrThrowException(client, data['activityId'], data['language']);

    //check that user has permissions to edit/create activity
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    if (activity['stand']) {
      await permissionUtil.assertCanUpdateStand(client, user['id'], activity['stand']);
    } else
    if (activity['event']) {
      await permissionUtil.assertCanUpdateEvent(client, user['id'], activity['event']);
    }

    const meetingId = activity['meeting'];

    if (data['meeting']['url']) {
      await meetingUtils.updateMeetingInDb(client, activity['meeting'], data['meeting']['url']);
    } else if (['webinar', 'team_meeting', 'zoom'].includes(activity['value']['meetingType'].toLowerCase())) {
      data['meeting']['url'] = activity['meetingUrl'] || util.uuid32().replace(/-/g, '');

      await meetingUtils.updateMeetingInDb(client, activity['meeting'], data['meeting']['url']);

      //clean everything
      await attendeesUtil.deleteAttendeesFor(client, activity['meeting']);
      //refresh meeting attendees as
      if (activity['value']['attendees']) {
        for (let attendee of activity['value']['attendees']) {
          //get personnel for an attendee
          const personnel = await personnelUtil.getPersonnelById(client, attendee['id']);
          //validate that personnel has access to this event/stand
          if (activity['stand']) {
            if (personnel['stand'] !== activity['stand']) {
              throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid personnel id")
            }
          } else
          if (activity['event']) {
            if (personnel['event'] !== activity['event']) {
              throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid personnel id")
            }
          }

          if (personnel['personid'] <0 ) continue;  //fake users are not added as attendees
          switch (attendee['role']) {
            case 'attendee': (await attendeesUtil.addAttendeeFor(client, meetingId, personnel['personid'])); break;
            case 'presenter': (await attendeesUtil.addPresenterFor(client, meetingId, personnel['personid'])); break;
            case 'moderator': (await attendeesUtil.addModeratorFor(client, meetingId, personnel['personid'])); break;
          }
        }
      }
    }

    if (data['meeting']['note']) {
      if (data['meeting']['note']['userId']) {
        await noteUtils.updateNoteForUser(client, 'meeting', activity['meeting'], data['meeting']['note']['userId'], data['meeting']['note']['value']);
      } else {
        await noteUtils.updateNoteForCompany(client, 'meeting', activity['meeting'], data['meeting']['note']['companyId'], data['meeting']['note']['value']);
      }
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
