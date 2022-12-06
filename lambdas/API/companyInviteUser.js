/**
 * @description Invite external user to a company.
 * uses template: CompanyInvitation
 */

const AWS = require('aws-sdk');
const validator = require('./model/validation');
const roleUtil = require('./model/role');
const personUtil = require('./model/person');
const companyUtil = require('./model/company');
const confirmationUtil = require('./model/confirmation');
const poolUtil = require('./model/pool');
const externalParamsUtil = require('./model/externalParams');
const personnelInvitationUtil = require('./model/personnelInvitation');
const personnelUtil = require('./model/personnel');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');

let ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['roleId'] && validator.isNumber(params['roleId']) &&
      !!params['companyId'] && validator.isNumber(params['companyId']) &&
      !!params['userEmail'] && validator.isValidEmail(params['userEmail']) &&
      !!params['position'] && validator.isValidNonEmptyString(params['position']) &&
      !!params['text'] && validator.isValidNonEmptyString(params['text']);
}

/**
 * we take company from URL as user can theoretically manage multiple companies
 * @param data
 * @param context
 * @returns {Promise<{body: *|string, statusCode: *}|*>}
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyInviteUser');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    await roleUtil.getRoleFromDbOrThrowException(client, data['roleId']);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    // if (!user['company']) {
    //   throw new exceptionUtil.ApiException(405, `User doesn't have a company`);
    // }

    if (data['context']['email'] === data['userEmail']) {
      throw new exceptionUtil.ApiException(405, 'You can not invite this user to the company');
    }

    //in case we have platform manager
    await permissionUtil.assertCanManageCompanyPersonnel(client, data['companyId'], user['id']);

    const invExists = await personnelInvitationUtil.invitationExists(client, data['companyId'], data['userEmail']);
    if (invExists) {
      throw new exceptionUtil.ApiException(409, 'Invitation already exists');
    }

    const userToInvite = await personUtil.getPersonId(client, data['userEmail']);

    if (userToInvite !== -1) {
      const userIsInCompanyPersonnel = await personnelUtil.isInCompanyPersonnel(client, data['companyId'], userToInvite);
      if (userIsInCompanyPersonnel) {
        throw new exceptionUtil.ApiException(409, 'User is already a member of the company');
      }
    }

    const invitationId = await personnelInvitationUtil.createInvitation(client, user['id'], data['userEmail'], data['roleId'], data['position'], data['companyId']);
    const confirmationId = await confirmationUtil.createRejectableConfirmation(client, 'personnel_invitation', invitationId, 'acceptLink', 'rejectLink', 'redirectLink');
    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    const company = await companyUtil.getCompanyById(client, data['companyId']);
    const url = `${data['origin']}/accept-invitation?invitationId=${confirmationId}&roleId=${data['roleId']}&type=company&email=${data['userEmail']}`;

    const params = {
      "Source": sender,
      "Template": "CompanyInvitation",
      "Destination": {
        "ToAddresses": [data['userEmail']
        ]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'CompanyInvitation'
        },
      ],
      "TemplateData": `{ "url": "${url}", "company": "${company['name']}", "text": "${data['text']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data, confirmationId);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
