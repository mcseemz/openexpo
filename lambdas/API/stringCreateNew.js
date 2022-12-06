/**
 * @description Create new String record.
 */
const validator = require('./model/validation');
const stringUtils = require('./model/strings');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  if (!params || params.length === 0) {
    return false;
  }

  //TODO permission validation
  //TODO SQL Injection validation. XSS validation

  const ref = params[0]['ref'];
  const ref_id = params[0]['ref_id'];

  if (!validator.isValidRefType(ref)) {
    return false;
  }

  if (!ref || !ref_id) {
    return false;
  }

  params.forEach(p => {
    if (p['ref'] !== ref || p['ref_id'] !== ref_id || !validator.isValidStringCategory(p['category']) ||
        !params['language'] || !validator.isValidLanguage(params['language']) || !validator.isValidNonEmptyString(p['value'])) {
      return false;
    }
  });

  return true;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStringCreateNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['strings'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    data['strings'].forEach(s => {
      delete s['id'];
      delete s['is_default'];
    });

    await client.query('BEGIN');
    const newEntries = await stringUtils.insertStringsIntoDB(client, data['strings']);
    await client.query('COMMIT');

    return util.handle200(data, newEntries);
  } catch (err) {
    await client.query('ROLLBACK');
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
