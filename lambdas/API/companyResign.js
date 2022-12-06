/**
 * @description Resign from the company.
 */

const AWS = require('aws-sdk');
const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const companyUtil = require('./model/company');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['companyId'] && validator.isNumber(params['companyId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyResign');

  data['reason'] = data['reason']['reason'] || 'No reason provided';
  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    if (!user['company']) {
      throw new exceptionUtil.ApiException(404, 'User is not a member of a company');
    }

    const company = await companyUtil.getCompanyByIdOrThrowException(client, user['company']);

    await personnelUtil.removePersonnelFromCompanyOrThrowException(client, user['id'], company['id']);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    const companyOwners = await personUtil.getCompanyOwnersOrThrowException(client, company['id']);

    const params = {
      "Source": sender,
      "Template": "CompanyUserResigned",
      "Destination": {
        "ToAddresses": companyOwners.map(o => o['email'])
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'CompanyUserResigned'
        },
      ],
      "TemplateData": `{"company": "${company['name']}", "reason": "${data['reason']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
