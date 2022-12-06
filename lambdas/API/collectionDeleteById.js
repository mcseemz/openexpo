/**
 * @description Lambda for deleting a collection by id
 * @class collectionDeleteById
 */

const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const collectionUtil = require('./model/collection');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['collectionId'] && !!params['entityId'] &&
  !!params['entity'] && ['event','stand'].includes(params['entity']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCollectionDeleteById', '', data['entity']);

  let client = util.emptyClient;

  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //todo resolve event id if it is custome_name now
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const isEvent = data['entity'] === 'event';
    const isStand = data['entity'] === 'stand';

    if (isEvent) {
      await permissionUtil.assertCanUpdateEvent(client, user['id'], data['entityId']);
    }
    if (isStand) {
      await permissionUtil.assertCanUpdateStand(client, user['id'], data['entityId']);
    }

    const collection = await collectionUtil.getCollectionFromDbOrThrowException(client, data['collectionId']);


    //todo type coercion here as eventid is always tring. fix with proper check for custome name and matching field check
    if (isEvent && collection.event != data['entityId']) { //validate that collection is in the event
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }
    if (isStand && collection.stand != data['entityId']) { //validate that collection is in the stand
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }
    //actual deletion with strings and binaries
    const deleted = await collectionUtil.deleteCollectionById(client, data['collectionId']);
    if (deleted === 0) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, 'Problem deleting collection');
    }

    return util.handle200(data, collection);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
