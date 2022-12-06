/**
 * @description Upgrade personnel parameters in the company.
 *  we update role, position and visibility
 */

const AWS = require('aws-sdk');
const validator = require('./model/validation');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const roleUtil = require('./model/role');
const poolUtil = require('./model/pool');
const companyUtil = require('./model/company');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['roleId'] && validator.isNumber(params['roleId']) &&
      !!params['userId'] && validator.isNumber(params['userId']) &&
      (!params['position'] || validator.isValidNonEmptyString(params['position']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyUpdateUserRole');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const manager = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const user = await personUtil.getPersonByIdOrThrowException(client, data['userId']);

    await permissionUtil.assertCanManageCompanyPersonnel(client, user['company'], manager['id']);

    if (!user['company']) {
      throw new exceptionUtil.ApiException(403, 'User is not a member of the company');
    }

    const role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId'], data['language']);
    const updatedPersonnel = await personnelUtil.assignUserToCompanyWithParameters(client, user['id'], user['company'], role['name'], data['position'] || user['position'], !!data['public']);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    const company = await companyUtil.getCompanyById(client, user['company']);

    const params = {
      "Source": sender,
      "Template": "CompanyUpdatedRoleOrPosition",
      "Destination": {
        "ToAddresses": [user['email']]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'CompanyUpdatedRoleOrPosition'
        },
      ],
      "TemplateData": `{"companyName": "${company['name']}", "roleName": "${role['roleName']}", "position": "${updatedPersonnel['position']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data, updatedPersonnel);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
