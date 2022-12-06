/**
 * @description Update collection by id 
 * @class collectionUpdateById
 */
const validator = require('./model/validation');
const collectionUtil = require('./model/collection');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['collectionId'] && validator.isNumber(params['collectionId']) &&
      params['collection']['tags'] && params['collection']['tags'].length > 0 &&
      (!params['language'] || validator.isValidLanguage(params['language'])) &&
      !!params['entity'] && ['event','stand'].includes(params['entity']) &&
      (!!params['entityId'] || validator.isNumber(params['entityId'])) && 
      (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName'])));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCollectionUpdateById', '', data['entity']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const isEvent = data['entity'] === 'event';
    const isStand = data['entity'] === 'stand';

    if (isEvent) {
      await permissionUtil.assertCanUpdateEvent(client, user['id'], data['entityId']);
    }
    if (isStand) {
      await permissionUtil.assertCanUpdateStand(client, user['id'], data['entityId']);
    }

    let collection = await collectionUtil.getCollectionFromDbOrThrowException(client, data['collectionId'], user['id'], data['language']);

    if (isEvent && collection.event != data['entityId']) { //validate that collection is in the event
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }
    if (isStand && collection.stand != data['entityId']) { //validate that collection is in the stand
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }
    
    data['collection']['id'] = data['collectionId'];
    data['collection']['customName'] = await validator.getValidCustomNameOrThrowException(client, data['collection']['customName'],'collection',data['collection']['id']);

    collection = await collectionUtil.updateCollectionInDbOrThrowException(client, data['collection'], data.language, user['id']);

    return util.handle200(data, collection);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
