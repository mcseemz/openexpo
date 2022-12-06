/**
 * @description Update activity by id.
 * @class activityUpdateById
 */
const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']) &&
      (!params['stand'] || validator.isNumber(params['stand'])) &&
      !!params['event'] && validator.isNumber(params['event']) &&
      (!params['meeting'] || validator.isNumber(params['meeting'])) &&
      !!params['start'] && validator.isValidDateTime(params['start']) && validator.isInFuture(params['start']) && validator.isWithinThreeYears(params['start']) &&
      !!params['end'] && validator.isValidDateTime(params['end']) && validator.isInCorrectOrder(params['start'], params['end']) && validator.isWithinThreeYears(params['end']) &&
      validator.isValidNonEmptyString(params['value']) &&
      (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName'])));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityUpdateById');

  data['activity']['id'] = data['activityId'];

  let client = util.emptyClient;
  try {
    if (!validateParams(data['activity'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //TODO permission check
    data['activity']['customName'] = await validator.getValidCustomNameOrThrowException(client, data['activity']['customName'], 'activity', data['activity']['id']);
    delete data['activity']['presenter'];   //todo this is cleanup, should be removed on frontend
    const activity = await activityUtil.updateActivityById(client, data['activity'], data['language']);

    if (activity != null) {
      return util.handle200(data, activity);
    } else {
      throw new exceptionUtil.ApiException(404, 'Activity not found');
    }
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
