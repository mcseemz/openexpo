/**
 * @description Assign user for the event with a given role.
 */

const AWS = require('aws-sdk');
const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const roleUtil = require('./model/role');
const eventUtil = require('./model/event');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['userId'] && validator.isNumber(params['userId']) &&
      !!params['roleId'] && validator.isNumber(params['roleId']) &&
      !!params['eventId'] && validator.isNumber(params['eventId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaCompanyAssignUserToEventWithRole');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const companyOwner = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    if (event['company'] !== companyOwner['company']) {
      await permissionUtil.assertCanAssignPersonnelToTheEvent(client, companyOwner['id'], event['id']);
    }

    const user = await personUtil.getPersonByIdOrThrowException(client, data['userId']);
    const role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId'], data['language']);

    const userIsInCompanyPersonnel = await personnelUtil.isInCompanyPersonnel(client, companyOwner['company'], user['id']);
    if (!userIsInCompanyPersonnel) {
      throw new exceptionUtil.ApiException(403, 'User is not a member of the company');
    }

    await personnelUtil.assignUserToEventWithParameters(client, user['id'], event['id'], role['name'], user['position']);
    await eventUtil.populateMultipleEventsWithData(client, [event], data['language'])

    let eventName = event['strings'].find(s => s['category'] === 'name');
    eventName = eventName ? eventName['value'] : 'No name specified';

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    const params = {
      "Source": sender,
      "Template": "CompanyAssignUserToEvent",
      "Destination": {
        "ToAddresses": [user['email']]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'CompanyAssignUserToEvent'
        },
      ],
      "TemplateData": `{"eventName": "${eventName}", "role": "${role['roleName']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
