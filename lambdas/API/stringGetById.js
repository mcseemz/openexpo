/**
 * @description Get string record by id.
 */
const validator = require('./model/validation');
const stringUtils = require('./model/strings');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return !!params['stringId'] && validator.isNumber(params['stringId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStringGetById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const str = await stringUtils.getStringByIdOrThrowException(client, data['stringId']);

    return util.handle200(data, str);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
