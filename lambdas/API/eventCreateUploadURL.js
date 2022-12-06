/**
 * @description Create pre-signed URL for event attachments upload.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const binaryUtil = require('./model/binary');
const stringsUtil = require('./model/strings');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const {CATEGORY_BINARY} = require("./model/binary");

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      (!params['relationId'] || validator.isNumber(params['relationId'])) &&
      (!params['body']['description'] || validator.isValidNonEmptyString(params['body']['description'])) &&
      !!params['body']['filename'] && validator.isValidNonEmptyString(params['body']['filename'], 255) &&
      (!params['language'] || validator.isValidLanguage(params['language'])) &&
      (!params['body']['titul'] || validator.isValidNonEmptyString(params['body']['titul'])) &&
      (!params['category'] || validator.isValidUploadCategory(params['category'])) &&
      (!params['ref'] || validator.isValidUploadReference(params['ref'])) &&
      (!params['refId'] || validator.isNumber(params['refId']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventCreateUploadURL');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    if (event['status'] === 'inactive') {
      throw new exceptionUtil.ApiException(405, 'Unable to edit archived event');
    }
    await permissionUtil.assertCanUpdateEvent(client, user['id'], event['id']);

    const title = data['body']['titul'];
    const category = data['category'] || 'binary';
    const description = data['body']['description'];
    const subcategory = category !== 'binary' ? description : null;
    const filename = data['body']['filename'];
    const tags = data['body']['tags'];

    //reference for related entities. e.g. news/collections/downloadables
    //TODO more validations for ref
    let ref = data['ref'] || null;
    let ref_id = ref ? data['refId'] : null;

    //TODO validation that relation is relevant to this event. security breach, allows for deleting content fro other events
    let relation;
    if (data['relationId']) { //sponsor stuff
      relation = await relationUtil.getOrThrowException(client, data['relationId']);
    }

    const newMaterial = await binaryUtil.createUploadBinaryStub(client, 'event', event['id'], user['id'],
      category, subcategory, filename, ref, ref_id, tags
    );

    if (category === CATEGORY_BINARY) {
      //for binaries we have description. all other categories contain subcategory in description and no title
      await stringsUtil.createStringsForMaterialInDb(client, newMaterial['id'], description, title || filename,
        null, data['language'] || null);
    }

    if (data['relationId']) {
      const domain = await poolUtil.getBinaryDomainFromOrigin(data['origin']);

      if (relation['parameter'][description]) { //description is image marker in sponsor, should be one of canned names
        const start = `https://${domain}/`;
        const materialUrl = relation['parameter'][description].substring(start.length);
        const material = await binaryUtil.getMaterialByUrlOrThrowException(client, materialUrl, true);
        if (material) {
          await binaryUtil.deleteMaterialOrchestrated(client, material, client.uploadsBucket);
        }
      }

      relation['parameter'][description] = `https://${domain}/${newMaterial['url']}`;
      relation['parameter'][description + 'Url'] = data['url'];
      await relationUtil.updateParameter(client, relation['id'], relation['parameter']);
    }

    const url = binaryUtil.generateS3SignedURL(client, newMaterial['url']);

    return util.handle200(data, {url: url, id: newMaterial['id']});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
