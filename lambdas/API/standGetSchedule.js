/**
 * @description Get stand schedule (all activities associated with it).
 */

const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');
const permissionsUtil = require('./model/permissions');
const standUtil = require('./model/stand');

function validateParams(params) {
  return !!params['standId'] && !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data,'lambdaStandGetSchedule');

  let client = util.emptyClient;
  try {
      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);
    
    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId'], user['id']);
    const activities = await activityUtil.getActivitiesForStand(client, stand['id'], data['type'], data['visibilities'], data['language']);
    await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, null,  stand['id'], activities, user?user['id']:null);

    return util.handle200(data, activities);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
