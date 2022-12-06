/**
 * @description Get all available coolections for a given event
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const collectionUtil = require('./model/collection');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['entityId'] && (!params['language'] || validator.isValidLanguage(params['language'])) &&
    !!params['entity'] && ['event', 'stand'].includes(params['entity']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCollectionsGet', '', data['entity']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    //todo check for private event

    const isEvent = data['entity'] === 'event';
    const isStand = data['entity'] === 'stand';

    let collections = [];
    if (isEvent) {
      collections = await collectionUtil.getCollectionsForEvent(client, data['entityId'], data['language']);
      await permissionUtil.populateMultipleEntitiesWithAllowedProperty(client, data['entityId'], null, collections, user?user['id']:null);
    }
    
    if (isStand) {
      collections = await collectionUtil.getCollectionsForStand(client, data['entityId'], data['language']);
      await permissionUtil.populateMultipleEntitiesWithAllowedProperty(client, null, data['entityId'], collections, user?user['id']:null);
    }

    return util.handle200(data, collections);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
}
