/**
 * @description Remove user from the company.
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
const permissionUtil = require('./model/permissions');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['userId'] && validator.isNumber(params['userId']) &&
      !!params['reason'] && validator.isValidNonEmptyString(params['reason']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyRemoveUser');

  data['reason'] = data['reason']['reason'];
  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const companyOwner = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const userToLetGo = await personUtil.getPersonById(client, data['userId']);
    await permissionUtil.assertCanManageCompanyPersonnel(client, companyOwner['company'], companyOwner['id']);

    await personnelUtil.removePersonnelFromCompanyOrThrowException(client, userToLetGo['id'], companyOwner['company']);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    const company = await companyUtil.getCompanyById(client, companyOwner['company']);

    const params = {
      "Source": sender,
      "Template": "CompanyReleasePersonnel",
      "Destination": {
        "ToAddresses": [userToLetGo['email']
        ]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'CompanyReleasePersonnel'
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
