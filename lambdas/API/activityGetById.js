/**
 * @description Get activity by Id.
 * @class activityGetById
 */
const validator = require('./model/validation');
const activityUtil = require('./model/activity');
const permissionUtil = require('./model/permissions');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');

// connection details inherited from environment
let pool;

/**
* checks for activityId and language
* @param {Object} incoming params
* @method validateParams
* @return {Boolean} true if params are ok 
*/
function validateParams(params) {
  return !!params['activityId'] && validator.isNumber(params['activityId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

/**
 * @method handler
 * @async
 * @param {Object} data with processed params
 * @param {Object} context lambda context
 * @return {Object} activity schema object. Status:<br/> 
 * 200 - ok<br/>
 * 403 - have no permission br/>
 * 404 - invalid Id<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
*/
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityGetById');

  let client = util.emptyClient;
  try {
      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    //todo populate activity data should be after permission check, to lessen the resource use.
    const activity = await activityUtil.getActivityFromDbOrThrowException(client, data['activityId'], data['language']);
    //check for permissions to view activity
    if (!(await permissionUtil.assertUserHasTicketWithAccessToContent(client, user['id'], activity['event'], activity['stand'], activity['tags']))) {
      throw new exceptionUtil.ApiException(403, 'You are not allowed to view this content');  
    }

    return util.handle200(data, activity);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
