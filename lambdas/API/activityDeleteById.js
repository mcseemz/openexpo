/**
 * @description Lambda for deleting activity</br>
 * @class activityDeleteById
 */
const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const meetingUtils = require('./model/meeting');
const noteUtils = require('./model/notes');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

function validateParams(params) {
  return !!params['activityId'] && validator.isNumber(params['activityId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityDeleteById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    let activity = await activityUtil.getActivityFromDbOrThrowException(client, data['activityId'], data['language']);

    if (activity['start'] < new Date()) {
      throw new exceptionUtil.ApiException(405, 'Can not delete past activities');
    }
    
    //TODO: add permission validation
    const deleted = await activityUtil.deleteActivityById(client, data['activityId']);
    if (deleted === 0) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, 'Problem deleting activity');
    }

    if (activity['meeting']) {
      const meeting = await meetingUtils.getMeetingFromDb(client, activity['meeting']);

      await noteUtils.deleteFromDb(client, 'meeting', meeting['id']);
      await meetingUtils.deleteMeetingFromDb(client, activity['meeting']);
    }

    return util.handle200(activity);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
