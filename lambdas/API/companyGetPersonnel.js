/**
 * @description Get company personnel.
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const roleUtil = require('./model/role');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const binaryUtils = require('./model/binary');

function validateParams(params) {
  return !!params['companyId'] && validator.isNumber(params['companyId']) &&
      (!params['roleId'] || validator.isNumber(params['roleId'])) &&
      (!params['str'] || validator.isValidNonEmptyString(params['str'])) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyGetPersonnel');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const viewer = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let role;
    if (data['roleId']) {
      role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId']);
    }
    let personnel = await personnelUtil.getPersonnelForCompany(client, data['companyId'], role ? role['id'] : null, data['str'] || '');
    personnel = personnel.filter(p => p['id'] !== viewer['id']);

    if (Number(data['companyId']) !== viewer['company']) {
      // const eligibleRoles = await roleUtil.getRolesHavingPrivilege(client, 'company-public');
      personnel = []; //personnel.filter(p => eligibleRoles.includes(p.role));
    }

    if (personnel.length) {
      const ids = personnel.map(p => p['id'])

      const allBranding = await binaryUtils.getBrandingMaterialsForMultipleUsers(client, ids, viewer['language'] || data['language']);
      personnel.forEach((person) => {
        person['branding'] = allBranding.filter(s => s['person'] === person['id']);
      });
    }

    return util.handle200(data, personnel);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
