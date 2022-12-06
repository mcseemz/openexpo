/**
 * @description stand management operations
 */

const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const validator = require('./model/validation');
const standUtil = require('./model/stand');
const util = require('./model/util');

function validateParams(params) {
  return !!params['standId'] && !!params['operation'] && validator.isValidStandManagementOperation(params['operation'])
    ;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandManagementById', '', 'stand', data['standId']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);

    //check if that's event owner with permissions
    const eventOwner = await permissionUtil.assertCanInviteToCreateStandForEvent(client, user['id'], stand['eventId'], true);
    const standOwner = await permissionUtil.assertCanUpdateStand(client, user['id'], stand['id'], true);

    const status = stand['status'];
    // console.log("eventOwner standOwner status", eventOwner, standOwner, status);

    if (data['operation'] === 'ban' && ['draft','published'].includes(status) && eventOwner) {
      await standUtil.updateStandStatus(client, stand['id'], 'inactive', user['id']);
      stand['status'] = 'inactive';
    } else if (data['operation'] === 'unban' && ['inactive'].includes(status) && eventOwner) {
      await standUtil.updateStandStatus(client, stand['id'], 'draft', user['id']);
      stand['status'] = 'draft';
    } else if (data['operation'] === 'publish' && ['draft'].includes(status) && standOwner) {

      //TODO publish checks: image, personnel, description, contacts
      await standUtil.updateStandStatus(client, stand['id'], 'published', user['id']);
      stand['status'] = 'published';
      //stream update
      data["activity_type"] = 'stand_add';
      data["entity"] = 'event';
      data["entity_id"] = stand['eventId'];
      data['stand'] = {
        id: data['standId']
      };
    } else if (data['operation'] === 'unpublish' && ['published'].includes(status) && (eventOwner || standOwner)) {
      await standUtil.updateStandStatus(client, stand['id'], 'draft', user['id']);
      stand['status'] = 'draft';
    } else if (data['operation'] === 'archive' && ['published', 'inactive', 'draft'].includes(status) && (eventOwner || standOwner)) { //closing it forevet
      await standUtil.updateStandStatus(client, stand['id'], 'cancelled', user['id']);
      stand['status'] = 'cancelled';
    } else {
      throw new exceptionUtil.ApiException(405, 'Invalid stand status');
    }

    return util.handle200(data, stand);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
