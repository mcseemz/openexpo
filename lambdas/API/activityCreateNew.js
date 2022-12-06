/**
 * @description Lambda for creating new activity for event. Upon successful execution generates new entry for event stream </br>
 * @class activityCreateNew
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');
const personUtil = require('./model/person');
const meetingUtil = require('./model/meeting');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return !params['id'] &&
      (!params['stand'] || validator.isNumber(params['stand'])) &&
      !!params['event'] && validator.isNumber(params['event']) &&
      (!params['meeting'] || validator.isNumber(params['meeting'])) &&
      !!params['start'] && validator.isValidDateTime(params['start']) && validator.isInFuture(params['start']) && validator.isWithinThreeYears(params['start']) &&
      !!params['end'] && validator.isValidDateTime(params['end']) && validator.isInCorrectOrder(params['start'], params['end']) && validator.isWithinThreeYears(params['end']) &&
      validator.isValidActivityVisibility(params['visibility']) &&
      validator.isValidNonEmptyString(params['value']) &&
      (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName'])));
}

/**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} data object containing necessary information<br/>
 * - data['activity'] activity object to be saved <br />
 * Example:
 * <pre>
 * {
 *    stand: 1,
 *    event: 2,
 *    meeting: 3,
 *    start: "2020-10-14T04:00:53.636Z",
 *    end: "2020-10-15T04:00:53.636Z",
 *    value: {"value": "worktime"},
 *    visibility: "event_published",
 *    tags: ['some', 'interesting', 'activity']
 * }
 * </pre>
 * Stand id and meeting id are optional.<br/>
 * Start date should be before end date and they both should be in future (limited to next 3 years).<br/>
 * Timezone is a number ranging from -15 up to 15 (exclusive).<br/>
 * Value is a free-form json object.<br/>
 * Visibility is one of the following values: 'stand_internal', 'stand_public', 'stand_proposed', 'stand_promoted', 'stand_rejected', 'event_internal', 'event_published', 'cancelled', 'event_timeframe', 'private_meeting'.<br/>
 * Tags are represented with an array of free-form strings (tag should not contain coma in it). There are service tags. They start with ":" like
 *
 * - data['language'] language code (e.g. ru_RU)
 * @param {Object} context of invocation
 * @return {Object} new activity object.<br/>
 * Status:<br/>
 * 200 - ok<br/>
 * 404 - some of referrenced information can not be found (see the error message for more details)<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityCreateNew', 'activity_add', data['activity']['stand'] ? 'stand' : 'event', data['activity']['stand'] || data['activity']['event']);

let client = util.emptyClient;
  try {
    if (!validateParams(data['activity'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);
    const llog = client.log || util.log;

    const event = await eventUtil.getEventFromDbOrThrowException(client, data['activity']['event']);
    llog.debug('event: ', event);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    data['activity']['creator'] = user['id'];

    if (!!data['activity']['stand']) {
      const standExists = await standUtil.standExistsInDb(client, data['activity']['stand']);
      if (!standExists) {
        throw new exceptionUtil.ApiException(404, 'Stand not found');
      }
    }

    if (!!data['activity']['meeting']) {
      const meetingExists = await meetingUtil.meetingExistsInDb(client, data['activity']['meeting']);
      if (!meetingExists) {
        throw new exceptionUtil.ApiException(404, 'Meeting not found');
      }
    }

    data['activity']['customName'] = await validator.getValidCustomNameOrThrowException(client, data['activity']['customName']);

    //todo validate that attendee is in valid event/stand personnel.
    //possible security breach by injecting rogue personnel, then creating meeting with it.
    delete data['activity']['presenter'];
    const newActivity = await activityUtil.createActivityInDb(client, data['activity'], event['id'], user['id']);
    data['activity']['id'] = newActivity['id'];

    return util.handle200(data, newActivity);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
