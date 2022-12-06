/**
 * @description Get collection by Id.
 * @class collectionGetById
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const validator = require('./model/validation');
const collectionUtil = require('./model/collection');
const personUtil = require('./model/person');
const binaryUtil = require("./model/binary");

/**
 * checks for collectionId and language
 * @param {Object} params incoming params
 * @method validateParams
 * @return {Boolean} true if params are ok
 */
function validateParams(params) {
  return !!params['collectionId'] &&
    (!params['language'] || validator.isValidLanguage(params['language'])) &&
    !!params['entity'] && ['event','stand'].includes(params['entity']);
}

/**
 * @method handler
 * @async
 * @param {Object} data with processed params
 * @param {Object} context lambda context
 * @return {Object} collection schema object. Status:<br/>
 * 200 - ok<br/>
 * 404 - invalid Id<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCollectionGetById', '', data['entity']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);

    const collection = await collectionUtil.getCollectionFromDbOrThrowException(client, data['collectionId'],
      user ? user['id']: undefined, data['language']);

    const isEvent = data['entity'] === 'event';
    const isStand = data['entity'] === 'stand';

    //todo type coercion here, should be properly fetched for custom_name in event_id
    if (isEvent && collection.event != data['entityId']) { //validate that collection is in the event
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }
    if (isStand && collection.stand != data['entityId']) { //validate that collection is in the stand
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    const allIds = collection['content'].map(e => e['id']);
    let allBranding;

    switch (collection['ref']) {
      case 'stand':
        allBranding = await binaryUtil.getBinariesForMultipleCoreEntities(client, null, allIds, 'branding');
        allBranding.forEach(m => m['ref_id'] = m['stand']);
        break;
      case 'news':
        allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'news', collection['ref'], allIds);
        break;
      case 'activity':
      case 'user':
      case 'upload':
        allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', collection['ref'], allIds);
        break;
      default:
        allBranding = [];
    }

    collection['content'].forEach((c) => {
      c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
    });

    return util.handle200(data, collection);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
