/**
 * @description Get role by entity type.
 */
const validator = require('./model/validation');
const roleUtil = require('./model/role');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return !!params['type'] && validator.isValidRoleEntity(params['type']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaRoleGetByType');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const roles = await roleUtil.getRolesByEntityType(client, data['type']);

    return util.handle200(data, roles);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
