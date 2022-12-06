/**
 * @description Lambda for creating a meeting for a given activity.
 * @class activityCreateMeeting 
 */

const validator = require('./model/validation');
const meetingUtils = require('./model/meeting');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const attendeesUtil = require('./model/meetingAttendees');
const personUtil = require("./model/person");
const personnelUtil = require("./model/personnel");
const permissionUtil = require("./model/permissions");

function validateParams(params) {
  return !params['id'];
}

/**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} data object containing necessary information<br/>
 * - data['meeting'] meeting object to be saved <br />
 * Example:
 * <pre>
 * {
 *    url: "https://vimeo.com/12345",
 *    chat: 42
 * }
 * </pre>
 * If activity has <b>meetingType</b> of 'webinar' or 'team_meeting' URL will be automatically generated and replaced (so, this parameter may be omitted). For other <b>meetingType</b>s URL is required.<br />
 * Chat id is optional.
 * - data['language'] language code (e.g. ru_RU)
 * @param {Object} context of invocation
 * @return {Object} new meeting object.<br/>
 * Status:<br/>
 * 200 - ok<br/>
 * 404 - activity not found<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityCreateMeeting');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['meeting']) || !data['language'] || !validator.isValidLanguage(data['language'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const activity = await activityUtil.getActivityFromDbOrThrowException(client, data['activityId'], data['language']);

    if (['webinar', 'team_meeting'].includes(activity['value']['meetingType'].toLowerCase())) {
      data['meeting']['url'] = util.uuid32().replace(/-/g, '');
    } else if (!data['meeting']['url'] || !validator.isValidUrl(data['meeting']['url'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    //check that user has permissions to edit/create activity
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    if (activity['stand']) {
      await permissionUtil.assertCanUpdateStand(client, user['id'], activity['stand']);
    } else
    if (activity['event']) {
      await permissionUtil.assertCanUpdateEvent(client, user['id'], activity['event']);
    }

    const newMeeting = await meetingUtils.createMeetingInDb(client, data['meeting']);

    if (activity['value']['attendees']) {
      for (let attendee of activity['value']['attendees']) {
        if (!attendee['id'] || attendee['id'] < 0) continue;  //we have garbage in the attendees list

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
          case 'attendee': (await attendeesUtil.addAttendeeFor(client, newMeeting['id'], personnel['personid'])); break;
          case 'presenter': (await attendeesUtil.addPresenterFor(client, newMeeting['id'], personnel['personid'])); break;
          case 'moderator': (await attendeesUtil.addModeratorFor(client, newMeeting['id'], personnel['personid'])); break;
        }
      }
    }

    await activityUtil.attachMeeting(client, activity['id'], newMeeting['id'], data['language']);

    return util.handle200(data, newMeeting);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
