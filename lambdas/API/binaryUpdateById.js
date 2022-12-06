/**
 * @description Update binary by id. Only tags canbe updated via this call
 * @class binaryUpdateById  
 */
const validator = require('./model/validation');
const binaryUtil = require('./model/binary');
const stringUtil = require('./model/strings');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const standUtil = require('./model/stand');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaBinaryUpdateById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const material = await binaryUtil.getMaterialByIdOrThrowException(client, data['id']);
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    if (material['ref'] === 'news') {
      if (material['stand']) {
        const stand = await standUtil.getStandFromDbOrThrowException(client, material['stand']);
        await permissionUtil.assertCanManageStandNews(client, user['id'], stand['id']);
      } else if (material['event']) {
        const event = await eventUtil.getEventFromDbOrThrowException(client, material['event']);
        await permissionUtil.assertCanManageEventNews(client, user['id'], event['id']);
      }
    }
    else {
      if (material['stand']) {
        const stand = await standUtil.getStandFromDbOrThrowException(client, material['stand']);
        await permissionUtil.assertCanUpdateStand(client, user['id'], stand['id']);
      } else if (material['event']) {
        const event = await eventUtil.getEventFromDbOrThrowException(client, material['event']);
        await permissionUtil.assertCanUpdateEvent(client, user['id'], event['id']);
      } else if (material['ref'] === 'company') {
        await permissionUtil.assertCanEditCompany(client, material['ref'], user['id']);
      }
    }

    // await stringUtil.deleteStringsRelatedToEntityIfExists(client, material.id, 'upload');
    //todo content validation
    await binaryUtil.updateMaterialInDB(client, material['id'], null, data['body']['tags']);

    return util.handle200(data, 'Successfully updated');
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
