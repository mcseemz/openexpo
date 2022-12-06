/**
 * @description Get company profile.
 */
const validator = require('./model/validation');
const userUtil = require('./model/person');
const companyUtil = require('./model/company');
const binaryUtil = require('./model/binary');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return !!params['companyId'] && (validator.isNumber(params['companyId']) || params['companyId'] === '@me') &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyGetProfile');

  let client = util.emptyClient;
  try {
      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    let removePrivateData = true;
    if (data['companyId'] === '@me') {
      removePrivateData = false;
      const user = await userUtil.getPersonFromDB(client, data.context['email']);
      if (!user['company']) {
        throw new exceptionUtil.ApiException(404, 'User has no configured company');
      }

      data['companyId'] = user['company'];
    }

    const company = await companyUtil.getCompanyById(client, data['companyId']);
    if (company == null) {
      throw new exceptionUtil.ApiException(404, 'Company not found');
    }

    if (removePrivateData) {
      delete company['vat'];
      if (company['address'] && company['address']['use_as_billing']) {
        delete company['address']['use_as_billing'];
      }
    }

    company['branding'] = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', 'company',
      [company['id']], true, data['language']);
    company['standMaterials'] = await binaryUtil.getMaterialsForCompany(client, company['id'], data['language']);
    //todo get branding for stand parameters?

    return util.handle200(data, company);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
