/**
 * @description Create pre-signed URL for user uploads (e.g. logo).
 */
const validator = require('./model/validation');
const binaryUtil = require('./model/binary');
const stringsUtil = require('./model/strings');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const roleUtil = require('./model/role');
const util = require('./model/util');
const {CATEGORY_BINARY} = require("./model/binary");

function validateParams(params) {
  return !!params['userId'] && validator.isNumber(params['userId']) &&
      (!params['body']['description'] || validator.isValidNonEmptyString(params['body']['description'])) &&
      !!params['body']['filename'] && validator.isValidNonEmptyString(params['body']['filename'], 255) &&
      (!params['language'] || validator.isValidLanguage(params['language'])) &&
      (!params['body']['titul'] || validator.isValidNonEmptyString(params['body']['titul'])) &&
      (!params['category'] || validator.isValidUploadCategory(params['category'])) &&
      (!params['ref'] || validator.isValidUploadReference(params['ref'])) &&
      (!params['refId'] || validator.isNumber(params['refId']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserCreateUploadURL');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    if (data['userId'] != user['id']  //attempt to change other's avatar
    && !(await roleUtil.getMyGrantsForPlatform(client, user['id'])).includes('platform-access-event')) {
      throw new exceptionUtil.ApiException(403, 'Operation forbidden');
    }

    const title = data['body']['titul'];
    const category = data['category'] || 'binary';
    const description = data['body']['description'];
    const subcategory = category !== 'binary' ? description : null;
    const filename = data['body']['filename'];
    const tags = data['body']['tags'];

    //reference for related entities. e.g. news/collections/downloadables
    //TODO more validations for ref
    // 1. validate that refId points to the same event/stand
    // 2. validate that refId object exists
    // 3. validate that this user/company/event/stand can have this reference.
    let ref = 'user';
    let ref_id = user['id'];

    const newMaterial = await binaryUtil.createUploadBinaryStub(client, 'user', user['id'], user['id'],
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
