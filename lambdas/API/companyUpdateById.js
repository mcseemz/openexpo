/**
 * @description Update given company.
 */
const validator = require('./model/validation');
const companyUtil = require('./model/company');
const poolUtil = require('./model/pool');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']) &&
      (!params['name'] || validator.isValidNonEmptyString(params['name'])) &&
      (!params['email'] || validator.isValidNonEmptyString(params['email'])) &&
      (!params['website'] || validator.isValidNonEmptyString(params['website']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyUpdateById');

  data['company']['id'] = data['companyId'];
  let client = util.emptyClient;
  try {
    if (!validateParams(data.company)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    if (user['company'] !== Number(data.company['id'])) {
      await permissionUtil.assertCanEditCompany(client, data.company['id'], user['id']);
    }

    const company = await companyUtil.updateCompanyInDb(client, data.company);
    if (company == null) {
      throw new exceptionUtil.ApiException(404, 'Company not found');
    }

    company['branding'] = data.company['branding'];
    company['standMaterials'] = data.company['standMaterials'];

    return util.handle200(data, company);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
