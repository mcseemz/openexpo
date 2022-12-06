/**
 * @description Get stands for a given event.
 * works in two modes:
 * - unauthenticated user browsing stands /open/event/{eventid}/stands
 * - event management console, stands tab - user authenticated /event/{eventid}/stands
 */
const validator = require('./model/validation');
const standUtil = require('./model/stand');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
    (!params['str'] || validator.isValidNonEmptyString(params['str'])) &&
    (!params['industry'] || validator.isValidNonEmptyString(params['industry'])) &&
    (!params['company'] || validator.isNumber(params['company'])) &&
    (!params['type'] || validator.isValidEventFilterType(params['type'])) &&
    (!params['status'] || validator.isValidStandFilterStatus(params['status'])) &&
    (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetStands');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const userid = user ? user['id'] : null;
    if (data['status'] && data['status'] !== 'published') {
      if (!userid) {
        throw new exceptionUtil.ApiException(405, 'Unauthorized user cannot filter stands by status');
      }
      //we need additional permission check that user can see filtered stands
      await permissionUtil.assertCanUpdateEvent(client, user['id'], data['eventId']);
    }
    console.log("a1");
    const stands = await standUtil.getStandsForEvent(client, data['eventId'],
      data['str'] || '', data['industry'] || '', data['company'] || 0,
      data['type'] || 'all', data['status'] || 'published', userid);
    console.log("a2");
    await standUtil.populateStandsWithAdditionalData(client, stands, data['language']);
    
    return util.handle200(data, stands);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
