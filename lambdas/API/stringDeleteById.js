/**
 * @description Delete string record by id.
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
  util.handleStart(data, 'lambdaEventGetSchedule');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //TODO permission check. Only stand/event owner can delete the string for the object
    const numDeleted = await stringUtils.deleteStringIfExists(client, data['stringId']);
    if (numDeleted <= 0) {
      throw new exceptionUtil.ApiException(404, 'String not found');
    }
    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
