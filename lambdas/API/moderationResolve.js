/**
 * @description event Moderation resolve.
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const confirmationUtil = require('./model/confirmation');
const poolUtil = require('./model/pool');
const externalParamsUtil = require('./model/externalParams');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

let ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['confirmationId'] &&
      !!params['res'] && validator.isValidModerationResolution(params['res']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaModerationResolve');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByApiDomain(data['context']['domain'], context);

    const confirmation = await confirmationUtil.getConfirmationOrThrowException(client, data['confirmationId'], data['res']);

    //check for moderator
    //todo enable authorization first
    //const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    //permissionUtil.assertIsPlatformEventAccess(client, user['id']);

    const event = await eventUtil.getEventFromDbOrThrowException(client, confirmation['ref_id']);

    if (event['status'] !== 'moderation') {
      throw new exceptionUtil.ApiException(405, 'Event id not suitable for publishing');
    }

    const companyOwners = await personUtil.getCompanyOwnersOrThrowException(client, event['company']);

    const origin = await poolUtil.getOriginFromApiDomain(data['context']['domain']);
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
      "TemplateData": `{ "url": "${data['context']['domain'] + '/event/' + event['id']}", "resolution": "${confirmation['action']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    await confirmationUtil.deleteConfirmation(client, confirmation['id']);
    const updatedEvent = await eventUtil.updateEventStatus(client, event['id'], data['res'] === 'accept' ? 'active' : 'draft');

    return util.handle200(data, updatedEvent);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
