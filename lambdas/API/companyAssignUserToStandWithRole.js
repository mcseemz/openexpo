/**
 * @description Assign user for the stand with a given role.
 *  Position is taken from current user position in company
 *  Email template: CompanyAssignUserToStand
 */

const AWS = require('aws-sdk');
const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const roleUtil = require('./model/role');
const standUtil = require('./model/stand');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

// connection details inherited from environment
let pool;

function validateParams(params) {
  return !!params['userId'] && validator.isNumber(params['userId']) &&
      !!params['roleId'] && validator.isNumber(params['roleId']) &&
      !!params['standId'] && validator.isNumber(params['standId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyAssignUserToStandWithRole');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const companyOwner = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);

    if (stand['company'] !== companyOwner['company']) {
      await permissionUtil.assertCanAssignPersonnelToTheStand(client, companyOwner['id'], stand['id']);
    }

    const user = await personUtil.getPersonByIdOrThrowException(client, data['userId']);
    const role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId'], data['language']);

    const userIsInCompanyPersonnel = await personnelUtil.isInCompanyPersonnel(client, companyOwner['company'], user['id']);
    if (!userIsInCompanyPersonnel) {
      throw new exceptionUtil.ApiException(403, 'User is not a member of the company');
    }

    await personnelUtil.assignUserToStandWithParameters(client, user['id'], stand['id'], role['name'], user['position']);
    await standUtil.populateStandsWithAdditionalData(client, [stand], data['language']);

    let standName = stand['strings'].find(s => s['category'] === 'name');
    standName = standName ? standName['value'] : 'No name specified';

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    const params = {
      "Source": sender,
      "Template": "CompanyAssignUserToStand",
      "Destination": {
        "ToAddresses": [user['email']]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'CompanyAssignUserToStand'
        },
      ],
      "TemplateData": `{"standName": "${standName}", "role": "${role['roleName']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
