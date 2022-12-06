/**
 * @description Cancel outgoing invitation made by company to a stand.
 * sends companyInvitationRecalled template
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const standInvitationUtil = require('./model/standInvitation');
const poolUtil = require('./model/pool');
const externalParamsUtil = require('./model/externalParams');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const eventUtil = require('./model/event');
const companyUtil = require('./model/company');

var ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['invitationId'] && validator.isNumber(params['invitationId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventInvitationCancelById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const invitation = await standInvitationUtil.getInvitationByIdOrThrowException(client, data['invitationId']);
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, invitation['event']);
    await permissionUtil.assertCanInviteToCreateStandForEvent(client, user['id'], event['id']);

    await standInvitationUtil.deleteInvitationIfExists(client, data['invitationId']);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    const company = await companyUtil.getCompanyById(client, user['company']);

    const params = {
      "Source": sender,
      "Template": "companyInvitationRecalled",
      "Destination": {
        "ToAddresses": [invitation['email_to']]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'companyInvitationRecalled'
        },
      ],
      "TemplateData": `{ "company": "${company['name']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data, `Invitation removed`);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
