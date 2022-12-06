/**
 * @description Create new collection
 * @class collectionCreateNew
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const collectionUtil = require('./model/collection');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !params['id'] && validator.isValidRefType(params['collection']['ref']) &&
    !!params['entity'] && ['event','stand'].includes(params['entity']) &&
    params['collection']['tags'] && params['collection']['tags'].length > 0 &&
    !!params['entityId'] && validator.isNumber(params['entityId']) &&
    !!params['language'] && validator.isValidLanguage(params['language']) &&
    (!params['collection']['customName'] || (!!params['collection']['customName'] && !validator.isNumber(params['collection']['customName'])));
}

/**
 * Main method
 * @method handler
 * @param {String} data object containing necessary information<br/>
 * - data['collection'] collection object to be saved <br />
 * Example:
 * <pre>
 * {
 *    customName: 'test-collection',
 *    event: 2,
 *    ref: 'activity',
 *    tags: ['some', 'interesting', 'activity']
 * }
 * </pre>
 * Custom name is used instead of id <br/>
 * Ref the name of the entity for which the collection is being created.<br/>
 * Tags are represented with an array of free-form strings (tag should not contain coma in it). There are service tags. They start with ":" like
 *
 * - data['language'] language code (e.g. ru_RU)
 * @param {Object} context of invocation
 * @return {Object} new collection schema object.<br/>
 * Status:<br/>
 * 200 - ok<br/>
 * 404 - some of referrenced information can not be found (see the error message for more details)<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
 */

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCollectionCreateNew', '', data['entity']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const isEvent = data['entity'] === 'event';
    const isStand = data['entity'] === 'stand';
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    if (isEvent) {
      await permissionUtil.assertCanUpdateEvent(client, user['id'], data['entityId']);
    }
    if (isStand) {
      await permissionUtil.assertCanUpdateStand(client, user['id'], data['entityId']);
    }

    const collection = data['collection'];
    collection['customName'] = await validator.getValidCustomNameOrThrowException(client,  collection['customName']);

    const res = await collectionUtil.createCollectionInDb(client, isEvent ? data['entityId'] : null,
      isStand ? data['entityId'] : null,
      collection['customName'],
      collection['ref'], collection['tags'], user['id'], data['language']);

    return util.handle200(data, res);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
