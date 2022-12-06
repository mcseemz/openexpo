/**
 * @description Get dictionary entries by type.
 */
const validator = require('./model/validation');
const dictionaryUtil = require('./model/dictionary');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

function validateParams(params) {
  return !!params['type'] && validator.isValidType(params['type']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaDictionaryGet');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const dict = await dictionaryUtil.getRecordsFromDb(client, data['type'], data['language'], data['ignoreLanguage']);

    return util.handle200(data, dict);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
