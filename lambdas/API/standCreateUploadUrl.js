/**
 * @description Create pre-signed URL for stand attachments upload.
 */
const validator = require('./model/validation');
const binaryUtil = require('./model/binary');
const stringsUtil = require('./model/strings');
const personUtil = require('./model/person');
const companyUtil = require('./model/company');
const standUtil = require('./model/stand');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');
const {CATEGORY_BINARY} = require("./model/binary");

function validateParams(params) {
  return !!params['standId'] &&
      (!params['body']['description'] || validator.isValidNonEmptyString(params['body']['description'])) &&
      !!params['body']['filename'] && validator.isValidNonEmptyString(params['body']['filename'], 255) &&
      (!params['language'] || validator.isValidLanguage(params['language'])) &&
      (!params['body']['titul'] || validator.isValidNonEmptyString(params['body']['titul'])) &&
      (!params['category'] || validator.isValidUploadCategory(params['category'])) &&
      (!params['ref'] || validator.isValidUploadReference(params['ref'])) &&
      (!params['refId'] || validator.isNumber(params['refId']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandCreateUploadURL');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);
    await permissionUtil.assertCanUpdateStand(client, user['id'], stand['id']);

    user['company'] = await companyUtil.createCompanyIfNotExistsForUser(client, user);

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

    //todo validation that if ref for upload, it should not be in stub

    //6. transactioned business logic
    const newMaterial = await binaryUtil.createUploadBinaryStub(client, 'stand', stand['id'], user['id'],
      category, subcategory, filename, ref, ref_id, tags
    );

    if (category === CATEGORY_BINARY) {
      //for binaries we have description. all other categories contain subcategory in description and no title
      await stringsUtil.createStringsForMaterialInDb(client, newMaterial['id'], description, title || filename,
        null, data['language'] || null);
    }

    const url = binaryUtil.generateS3SignedURL(client, newMaterial['url']);

    return util.handle200(data, {url: url, id: newMaterial['id']});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
