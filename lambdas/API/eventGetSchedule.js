/**
 * @description Get event schedule (all activities associated with it). Branding included.
 */
const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');
const permissionsUtil = require('./model/permissions');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetSchedule');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);

    const activities = await activityUtil.getActivitiesForEvent(client, data['eventId'], data['type'], data['visibilities'], data['language']);
    await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, data['eventId'], null, activities, user?user['id']:null);
    
    return util.handle200(data, activities);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
