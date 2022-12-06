/**
 * @description Cancel sent personnel invitation.
 * depending on invitation type uses following email templates to notify user
 * - CompanyCancelInvitation
 * - eventCancelInvitation
 * - standCancelInvitation
 */
const AWS = require('aws-sdk');
const poolUtil = require('./model/pool');
const confirmationUtil = require('./model/confirmation');
const exceptionUtil = require('./model/exception');
const personnelInvitationUtil = require('./model/personnelInvitation');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const companyUtil = require('./model/company');
const validator = require('./model/validation');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');
const stringsUtil = require('./model/strings');
const standUtil = require('./model/stand');
const eventUtil = require('./model/event');

let ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['confirmationId'] && validator.isValidNonEmptyString(params['confirmationId']);
}

/**
* 
* @returns {object} status:
* - 200 ok
* - 403 forbidden
* - 404 not found
* - 405 invalid
*/
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserPersonnelInvitationCancel');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const confirmation = await confirmationUtil.getAnyConfirmationByIdOrThrowException(client, data['confirmationId']);

    if (confirmation['ref'] !== 'personnel_invitation') {
      throw new exceptionUtil.ApiException(405, 'Wrong entity');
    }

    const invitation = await personnelInvitationUtil.getInvitationById(client, confirmation['ref_id']);

//    await permissionUtil.assertCanManageCompanyPersonnel(client, invitation['company'], user['id']);
    await personnelInvitationUtil.deleteInvitation(client, confirmation['ref_id']);
    await confirmationUtil.deleteConfirmation(client, confirmation['id']);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    let entity;
    let entityName;
    let template;
    if (invitation['company']) {
      template = 'CompanyCancelInvitation';
      entity = 'company';
      entityName = await companyUtil.getCompanyById(client, invitation['company']);

      data['entity'] = 'company';
      data['entity_id'] = invitation['company'];
    } else if (invitation['event']) {
      template = 'eventCancelInvitation';
      entity = 'eventName';
      const event = await eventUtil.getEventFromDbOrThrowException(client, invitation['event']);
      let eventNameString = await stringsUtil.getStringsForEntity(client, 'event', event['id'], data['language']);
      eventNameString = eventNameString.find(s => s['category'] === 'name');
      entityName = eventNameString['value'];

      data['entity'] = 'event';
      data['entity_id'] = invitation['event'];
    } else if (invitation['stand']) {
      template = 'standCancelInvitation';
      entity = 'standName';
      const stand = await standUtil.getStandFromDbOrThrowException(client, invitation['stand']);
      let standNameString = await stringsUtil.getStringsForEntity(client, 'stand', stand['id'], data['language']);
      standNameString = standNameString.find(s => s['category'] === 'name');
      entityName = standNameString['value'];

      data['entity'] = 'stand';
      data['entity_id'] = invitation['stand'];
    } else {
      throw new exceptionUtil.ApiException(405, 'Inconsistent object');
    }

    const params = {
      "Source": sender,
      "Template": template,
      "Destination": {
        "ToAddresses": [invitation['email_to']
        ]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: template
        },
      ],
      "TemplateData": `{ "${entity}": "${entityName}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
