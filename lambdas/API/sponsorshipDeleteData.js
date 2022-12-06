/**
 * @description Delete sponsorship data.
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const personUtil = require('./model/person');
const binaryUtil = require('./model/binary');
const permissionUtil = require('./model/permissions');
const eventUtil = require('./model/event');

function validateParams(params) {
  return true;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaSponsorshipDeleteData');
  const domain = await poolUtil.getBinaryDomainFromOrigin(data['origin']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //6. transactioned business logic
    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const relation = await relationUtil.getOrThrowException(client, data['relationId']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, relation['subject_ref_id']);

    await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);

    const binaryKey = data['placeId'];
    const binaryPrefix = `https://${domain}/`;
    const url = relation['parameter'][binaryKey].substring(binaryPrefix.length);
    delete relation['parameter'][binaryKey];
    await relationUtil.updateParameter(client, relation['id'], relation['parameter']);

    const material = await binaryUtil.getMaterialByUrlOrThrowException(client, url, true);
    if (material) {
      await  binaryUtil.deleteMaterialOrchestrated(client, material, client.uploadsBucket);
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
