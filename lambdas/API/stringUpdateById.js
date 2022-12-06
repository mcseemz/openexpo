/**
 * @description Update string record by id.
 */
const validator = require('./model/validation');
const stringUtils = require('./model/strings');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']) &&
      validator.isValidNonEmptyString(params['value']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStringUpdateById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['strings']) || Number(data['strings']['id']) !== Number(data['stringId'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //TODO permission validation
    //TODO SQL Injection validation. XSS validation

    const updatedString = await stringUtils.updateStringIfExists(client, data['strings']);
    if (updatedString == null) {
      throw new exceptionUtil.ApiException(404, 'String not found');
    }

    return util.handle200(data, updatedString);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
