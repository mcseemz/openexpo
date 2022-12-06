/**
 * @description Promote stand activity.
 */
const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

function validateParams(params) {
  return !!params['activityId'] && !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandActivityPromote');

  let client = util.emptyClient;
  try {
      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const activity = await activityUtil.getActivityFromDb(client, data['activityId'], data['language']);
    if (activity == null) {
      throw new exceptionUtil.ApiException(404, 'Activity not found');
    }

    if (!activity['stand']) {
      throw new exceptionUtil.ApiException(405, 'Operation is not allowed for given activity');
    }

    const updatedActivity = await activityUtil.proposeForPromotion(client, activity['id'], data['language']);

    return util.handle200(data, updatedActivity);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
