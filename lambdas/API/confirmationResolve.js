/**
 * @description Confirmation resolve for multiple activities.
 * Works when link clicked in email.
 * For stand invitation accept in UI @see standInvitationAcceptById.js
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const confirmationUtil = require('./model/confirmation');
const poolUtil = require('./model/pool');
const externalParamsUtil = require('./model/externalParams');
const companyUtil = require('./model/company');
const personnelUtil = require('./model/personnel');
const personnelInvitationUtil = require('./model/personnelInvitation');
const activityUtil = require('./model/activity');
const chatUtil = require('./model/chat');
const meetingUtil = require('./model/meeting');
const standUtil = require('./model/stand');
const standInvitationUtil = require('./model/standInvitation');
const customNameUtil = require('./model/customname');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

var ses = new AWS.SES({apiVersion: '2010-12-01'});
const lambda = new AWS.Lambda({
  region: 'eu-central-1'
});

let llog = util.log;

function validateParams(params) {
  return !!params['confirmationId'] &&
      !!params['res'] && validator.isValidModerationResolution(params['res']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

/**
 * event moderation - confirmation
 * @param {Object} client database client
 * @param {Object} confirmation db object
 * @param {String} origin
 * @param {String} domain
 * @returns {Promise<*|null|{body: string, statusCode: number}>}
 */
async function handleEventConfirmation(client, confirmation, origin, domain) {
  const event = await eventUtil.getEventFromDbOrThrowException(client, confirmation['ref_id']);

  if (event['status'] !== 'moderation') {
    throw new exceptionUtil.ApiException(405, 'Event id not suitable for publishing');
  }

  const companyOwners = await personUtil.getCompanyOwnersOrThrowException(client, event['company']);

  const shortDomain = origin.substring(origin.lastIndexOf('/') + 1);
  let sender = await externalParamsUtil.getSenderEmail(shortDomain);

  const params = {
    "Source": sender,
    "Template": "eventModerationResolved",
    "Destination": {
      "ToAddresses": companyOwners.map(o => o['email'])
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: 'eventModerationResolved'
      },
    ],
    "TemplateData": `{ "url": "${domain + '/event/' + event['id']}", "resolution": "${confirmation['action']}" }`
  }

  await ses.sendTemplatedEmail(params).promise();

  await confirmationUtil.deleteConfirmation(client, confirmation['id']);

  return await eventUtil.updateEventStatus(client, event['id'], confirmation['action'] === 'accept' ? 'active' : 'draft');
}

/**
 * invitation to create stand - accepted
 * @param client
 * @param confirmation
 * @param origin
 * @returns {Promise<void>}
 */
async function handleStandConfirmation(client, confirmation, origin) {
  const invitation = await standInvitationUtil.getInvitationByIdOrThrowException(client, confirmation['ref_id']);
  const companyOwners = await personUtil.getCompanyOwnersOrThrowException(client, invitation['event_organiser']);
  const user = await personUtil.getPersonFromDbOrThrowException(client, invitation['email_to']);

  //6. transactioned business logic
  if (confirmation['action'] === 'accept') {
    const stand = await standUtil.createStandInDb(client, invitation['event_organiser'], invitation['event'], user['language'], null, customNameUtil.getSubstituteName());
    if (stand == null) {
      throw new exceptionUtil.ApiException(405, 'Couldn\'t create a stand');
    }
    //initial stand owner
    await personnelUtil.assignUserToStandWithParameters(client, user['id'], stand['id'], 'stand-owner');

    const shortDomain = origin.substring(origin.lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    const params = {
      "Source": sender,
      "Template": "companyInvitationResolved", //TODO proper template
      "Destination": {
        "ToAddresses": companyOwners.map(o => o['email'])
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'companyInvitationResolved'
        },
      ],
      "TemplateData": `{ "user": "${user['name'] + ' ' + user['surname']}", "resolution": "${confirmation['action']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();
  } else {  //reject invitation
    const shortDomain = origin.substring(origin.lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    const params = {
      "Source": sender,
      "Template": "companyInvitationResolved", //TODO proper template
      "Destination": {
        "ToAddresses": companyOwners.map(o => o['email'])
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'companyInvitationResolved'
        },
      ],
      "TemplateData": `{ "user": "${user['name'] + ' ' + user['surname']}", "resolution": "${confirmation['action']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();
  }

  await confirmationUtil.deleteConfirmation(client, confirmation['id']);
  await standInvitationUtil.deleteInvitationIfExists(client, invitation.id);
}

/**
 * invitation to join as a personnel
 * @param {Object} client
 * @param {Object} confirmation
 * @param {String} origin
 * @returns {Promise<void>}
 */
async function handlePersonnelConfirmation(client, confirmation, origin) {
  const invitation = await personnelInvitationUtil.getInvitationById(client, confirmation['ref_id']);
  const user = await personUtil.getPersonFromDbOrThrowException(client, invitation['email_to']);
  const userFrom = await personUtil.getPersonByIdOrThrowException(client, invitation['person_from']);

  let emailTemplate;
  if (invitation['company']) {  //to company personnel
    emailTemplate = 'companyInvitationResolved';
    const company = await companyUtil.getCompanyByIdOrThrowException(client, invitation['company']);

    if (confirmation['action'] === 'accept') {
      if (user['company']) {
        throw new exceptionUtil.ApiException(405, 'User has to leave the current company before joining new');
      }

      await personnelUtil.assignUserToCompanyWithParameters(client, user['id'], company['id'], invitation['role_name'], invitation['position']);
    }
  } else if (invitation['event']) { //to event personnel
    emailTemplate = 'eventInvitationResolved';

    const event = await eventUtil.getEventFromDbOrThrowException(client, invitation['event']);
    if (confirmation['action'] === 'accept') {
      await personnelUtil.assignUserToEventWithParameters(client, user['id'], event['id'], invitation['role_name'], invitation['position']);
    }
  } else if (invitation['stand']) { //to stand personnel
    emailTemplate = 'standInvitationResolved2';

    const stand = await standUtil.getStandFromDbOrThrowException(client, invitation['stand']);
    if (confirmation['action'] === 'accept') {
      await personnelUtil.assignUserToStandWithParameters(client, user['id'], stand['id'], invitation['role_name'], invitation['position']);
    }
  } else {
    throw new exceptionUtil.ApiException(405, 'Invalid arguments');
  }

  const shortDomain = origin.substring(origin.lastIndexOf('/') + 1);
  let sender = await externalParamsUtil.getSenderEmail(shortDomain);

  const tusername = user['name'] + ' ' + user['surname'];
  const tresolution = confirmation['action'];
  // const tname = confirmation['action'];
  // const tname = confirmation['action'];

/*
username
resolution - accept/reject
name - stand/event/company name
url - management url
date - event date
 */

  const params = {
    "Source": sender,
    "Template": emailTemplate,
    "Destination": {
      "ToAddresses": [userFrom['email']
      ]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: emailTemplate
      },
    ],
    "TemplateData": `{ "user": "${user['name'] + ' ' + user['surname']}", "resolution": "${confirmation['action']}" }`
  }

  await ses.sendTemplatedEmail(params).promise();

  await confirmationUtil.deleteConfirmation(client, confirmation['id']);
  await personnelInvitationUtil.deleteInvitation(client, confirmation['ref_id']);
}

/**
 * TODO what flow is here?
 * @param client
 * @param data
 * @param confirmation
 * @returns {Promise<void>}
 */
async function handleActivityConfirmation(client, data, confirmation) {

  const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
  let sender = await externalParamsUtil.getSenderEmail(shortDomain);
  const activity = await activityUtil.getSimpleActivityFromDb(client, confirmation['ref_id']);
  const meeting = await meetingUtil.getMeetingFromDb(client, activity['meeting']);
  const chat = await chatUtil.getChatById(client, meeting['chat']);
  const userOrganizer = await personUtil.getPersonById(client, chat['person_to']);
  if (!chat['person_from']) {
    throw new exceptionUtil.ApiException(405, 'No information about chat initiator');
  }

  const userWhoRejected = await personUtil.getPersonById(client, chat['person_from']);

  const params = {
    "Source": sender,
    "Template": "meetingRejectedNotification",
    "Destination": {
      "ToAddresses": [userOrganizer['email']
      ]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: 'meetingRejectedNotification'
      },
    ],
    "TemplateData": `{ "user": "${userWhoRejected['name'] + ' ' + userWhoRejected['surname']}" }`
  }

  await ses.sendTemplatedEmail(params).promise();

  const lambdaParams = {
    FunctionName: 'activityDeleteById',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({"origin": data['origin'], "activityId": confirmation['ref_id'], "context": data['context']})
  };
  const lambdaInvokeResult = await lambda.invoke(lambdaParams).promise();

  if (lambdaInvokeResult['StatusCode'] === 200) {
    llog.debug('Success');
  } else {
    throw new exceptionUtil.ApiException(502, lambdaInvokeResult['Payload']);
  }

  await confirmationUtil.deleteConfirmation(client, confirmation['id']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaConfirmationResolve');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const confirmation = await confirmationUtil.getConfirmationOrThrowException(client, data['confirmationId'], data['res']);

    //TODO check for moderator
    /*const user = await personUtil.getPersonByCompanyId(client, invitation['event_organiser']);
    if (user == null) {
      return {
        statusCode: 404,
        body: 'User not registered'
      };
    }*/

    let result;
    switch (confirmation['ref']) {
      case 'event':
        result = await handleEventConfirmation(client, confirmation, data['origin'], data['context']['domain']);
        break;
      case 'stand_invitation':
        result = await handleStandConfirmation(client, confirmation, data['origin']);
        break;
      case 'personnel_invitation':
        result = await handlePersonnelConfirmation(client, confirmation, data['origin']);
        break;
      case 'activity':
        //only reject flow exists at the moment
        result = await handleActivityConfirmation(client, data, confirmation);
        break;
    }

    return util.handle200(data, result);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
