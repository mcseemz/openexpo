/**
 * @description Send event for moderation before publishing.
 */

const AWS = require('aws-sdk');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const confirmationUtil = require('./model/confirmation');
const externalParamsUtil = require('./model/externalParams');
const poolUtil = require('./model/pool');
const permissionUtil = require('./model/permissions');
const util = require("./model/util");
const exceptionUtil = require("./model/exception");

var ses = new AWS.SES({apiVersion: '2010-12-01'});

// connection details inherited from environment
let pool;

console.log("PostgreSQL POST Function");

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  const apiDomain = await poolUtil.getApiDomainFromOrigin(data['origin']);

  const fullDomain = data['origin'];

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    if (event['company'] !== user['company']) {
      await permissionUtil.assertCanUpdateEvent(client, user['id'], event['id']);
    }

    if (event['status'] !== 'draft') {
      throw new exceptionUtil.ApiException(405, 'Event id not suitable for publishing');
    }

    const confirmationId = await confirmationUtil.createRejectableConfirmation(client, 'event', event['id'], 'acceptLink', 'rejectLink', 'redirectLink');

    console.log('shortdomain', shortDomain );
    let moderators = await externalParamsUtil.getModeratorsList(client.shortDomain);
    let sender = await externalParamsUtil.getSenderEmail(client.shortDomain);
    console.log(moderators, sender, shortDomain );
    const eventLink = `${fullDomain}/event/${event['id']}`;
    const acceptLink = `https://${apiDomain}/moderation/resolve/${confirmationId}?res=accept`;
    const rejectLink = `https://${apiDomain}/moderation/resolve/${confirmationId}?res=reject`;

    const params = {
      "Source": sender,
      "Template": "eventAwaitsModeration",
      "Destination": {
        "ToAddresses": moderators
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'eventAwaitsModeration'
        },
      ],
      "TemplateData": `{ "eventLink": "${eventLink}", "acceptLink": "${acceptLink}", "rejectLink": "${rejectLink}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    const updatedEvent = await eventUtil.updateEventStatus(client, event['id'], 'moderation', user['id']);

    return util.handle200(data, updatedEvent);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
