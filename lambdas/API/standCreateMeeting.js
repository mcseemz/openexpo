/**
 * @description Create stand meeting by visitor request.
 * standId
 * meeting - #/components/schemas/StandMeeting
 *   id: integer
 stand: integer 'Id of stand, null if event-level activity'
 event: integer 'Id of event'
 meeting: integer 'Id of a meeting'
 start: string 'ISO date and time string, no timezone, example: 2020-10-01T10:00:00'
 end: string 'ISO date and time string, no timezone. example: 2020-10-01T10:00:00'
 value: string (json)
 visibility: string visibility of an activity
 enum:
 - private_meeting
 - visitor_proposed
 visitor: integer
 representative: integerperson to request
 strings: strings associated with the activity (with respect to selected language)

 value has following format:
 body['value'] = JSON.stringify({
            meetingUrl: meetingUrl,
            meetingType: item.meetingType ? item.meetingType.value : '',
            enableChat: item.enableChat,
            presenter: item.meetingType && (item.meetingType.value != 'no_video') && item.presenter && item.presenter.value ? {
              name: item.presenter.value.name,
              surname: item.presenter.value.surname,
              id: item.presenter.value.id,
              logo: item.presenter.value.logo,
              position: item.presenter.value.position,
            } : ''
          });
 */
const validator = require('./model/validation');
const standUtil = require('./model/stand');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const ticketUtil = require('./model/ticket');
const personnelUtil = require('./model/personnel');
const meetingAttendeesUtil = require('./model/meetingAttendees');
const activityUtil = require('./model/activity');
const meetingUtils = require('./model/meeting');

function validateParams(params) {
  return !!params['standId'] && (!params['language'] || validator.isValidLanguage(params['language'])) &&
    !!params['meeting'] &&
    !!params['meeting']['start'] && validator.isValidDateTime(params['meeting']['start']) && validator.isInFuture(params['meeting']['start']) && validator.isWithinThreeYears(params['meeting']['start']) &&
    !!params['meeting']['end'] && validator.isValidDateTime(params['meeting']['end']) && validator.isInCorrectOrder(params['meeting']['start'], params['meeting']['end']) && validator.isWithinThreeYears(params['meeting']['end']) &&
    !!params['meeting']['visitor'] &&
    !!params['meeting']['representative'] &&
    !!params['meeting']['meetingType']
    ;

}

/**
 * create a meeting proposal
 * @param data meeting request
 * @param context
 * @returns {Promise<{body: *|string, statusCode: *}|*>}
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandCreateMeeting');

  let client = util.emptyClient;
  try {
    if (!validateParams(data) || !data['language'] || !validator.isValidLanguage(data['language'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const meeting = data['meeting'];
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);

    //checking if he can connect
    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    await ticketUtil.getForUserAndEventOrThrowException(client, user['id'], stand['eventId']);
    //TODO check that he das not have any future/active meetings with this stand yet

    const presenter = await personUtil.getPersonById(client, meeting['representative']);
    const personnel = await personnelUtil.getPersonnelParametersForStand(client, stand['id'], presenter['id']);
    //TODO validation that meeting is within bounds
    //TODO check that time slot is available

    //check that presenter is correct
    if (!personnel['public']) {
      throw new exceptionUtil.ApiException(403, 'Personnel should be publicly available');
    }
    //await permissionUtil.assertCanBeMeetingPresenterForStand(client, stand['company'], presenter['id'], data['standId']);

    //create meeting object
    const meetingBody = {};
    meetingBody['url'] = util.uuid32().replace(/-/g, '');
//    meetingBody['chat'] = chat['id'];
    meetingBody['presenter'] = presenter['id'];
    const newMeeting = await meetingUtils.createMeetingInDb(client, meetingBody);
    //attach visitor
    await meetingAttendeesUtil.addAttendeeFor(client, newMeeting['id'], user['id']);

    const activityValue = JSON.stringify({
      meetingUrl: meetingBody['url'],
      meetingType: meeting['meetingType'],  //TODO validate!
      enableChat: true,
      presenter: {
        name: personnel['name'],
        id: personnel['id'],
//        logo: item.presenter.value.logo,
        position: personnel['position'],
      }
    });
    //create activity for this meeting
    const activityBody = {};
    activityBody['stand'] = stand['id'];
    activityBody['event'] = stand['eventId'];
    activityBody['visibility'] = 'visitor_proposed';
    activityBody['meeting'] = newMeeting['id'];
    activityBody['start'] = data['meeting']['start'];
    activityBody['end'] = data['meeting']['end'];
    activityBody['value'] = activityValue;
    const activity = await activityUtil.createActivityInDb(client, activityBody, activityBody['event'], presenter['id']);
    newMeeting['activityId'] = activity['id'];

    return util.handle200(data, newMeeting);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
