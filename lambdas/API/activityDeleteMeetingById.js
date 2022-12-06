/**
 * @description Delete a meeting created for an activity by meeting id.
 * @class activityDeleteMeetingById  
 */
const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const meetingUtils = require('./model/meeting');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

/**
* checks for something
* @param {Object} incoming params
* @method validateParams
* @return {Boolean} true if params are ok
*/
function validateParams(params) {
  return !!params['activityId'] && validator.isNumber(params['activityId']);
}

exports.handler = async function (data, context) {
  if (!validateParams(data)) {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  let client = util.emptyClient;
  try {

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const activity = await activityUtil.getActivityFromDb(client, data['activityId'], data['language']);
    if (activity == null) {
      throw new exceptionUtil.ApiException(405, 'Activity not found');
    }

    //TODO: add permission validation
    if (activity['meeting']) {
      await activityUtil.detachMeeting(client, data['activityId']);
      await meetingUtils.deleteMeetingFromDb(client, activity['meeting']);
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
