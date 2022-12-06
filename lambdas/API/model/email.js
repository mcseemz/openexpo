const eventUtil = require("./event");
const externalParamsUtil = require("./externalParams");

const AWS = require('aws-sdk');
let ses = new AWS.SES({ apiVersion: '2010-12-01' });

/**
 * send email for eventRegistrationConfirmation3 template
 * @param client
 * @param event
 * @param pricing
 * @param origin
 * @param email
 * @param language
 * @returns {Promise<void>}
 */
async function sendEventRegistrationEmail(client, event, pricing, origin, email, language = undefined) {

  await eventUtil.populateMultipleEventsWithData(client, [event], language)

  let eventName = event['strings'].find(s => s['category'] === 'name');
  eventName = eventName ? eventName['value'] : 'No name specified';

  let eventText = event['strings'].find(s => s['category'] === 'description_short');
  eventText = eventText ? eventText['value'] : '';

  let customMessage = pricing['strings'].find(s => s['category'] === 'email_content');
  customMessage = customMessage ? customMessage['value'] : '';

  const shortDomain = origin.substring(origin.lastIndexOf('/') + 1);
  let sender = await externalParamsUtil.getSenderEmail(shortDomain);
  const eventUrl = `${origin}/event/${event['id']}`;

  const dateStart = new Date(event['dateStart']).toDateString();
  const dateEnd = new Date(event['dateEnd']).toDateString();

  console.log(`{ "name": "${eventName}", "url": "${eventUrl}", "text": "${eventText}", 
        "dateStart": "${dateStart}", "dateEnd": "${dateEnd}", "customMessage":"${customMessage}" }`);

  const params = {
    "Source": sender,
    "Template": "eventRegistrationConfirmation3",
    "Destination": {
      "ToAddresses": [email]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: 'eventRegistrationConfirmation'
      },
    ],
    "TemplateData": `{ "name": "${eventName}", "url": "${eventUrl}", "text": "${eventText}", 
        "dateStart": "${dateStart}", "dateEnd": "${dateEnd}", "customMessage":"${customMessage}" }`
  }

  await ses.sendTemplatedEmail(params).promise();

}

/**
 * send email for ticketExpired template
 * @param client
 * @param event
 * @param origin
 * @param email
 * @param language
 * @returns {Promise<void>}
 */
async function sendTicketExpiredEmail(client, event, origin, email, language = undefined) {

  await eventUtil.populateMultipleEventsWithData(client, [event], language)

  let eventName = event['strings'].find(s => s['category'] === 'name');
  eventName = eventName ? eventName['value'] : 'No name specified';

  let eventText = event['strings'].find(s => s['category'] === 'description_short');
  eventText = eventText ? eventText['value'] : '';

  const shortDomain = origin.substring(origin.lastIndexOf('/') + 1);
  let sender = await externalParamsUtil.getSenderEmail(shortDomain);
  const eventUrl = `${origin}/event/${event['id']}`;

  const dateStart = new Date(event['dateStart']).toDateString();
  const dateEnd = new Date(event['dateEnd']).toDateString();

  client.log.debug(`{ "name": "${eventName}", "url": "${eventUrl}", "text": "${eventText}", 
        "dateStart": "${dateStart}", "dateEnd": "${dateEnd}" }`);

  const params = {
    "Source": sender,
    "Template": "ticketExpired",
    "Destination": {
      "ToAddresses": [email]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: 'ticketExpired'
      },
    ],
    "TemplateData": `{ "name": "${eventName}", "url": "${eventUrl}", "text": "${eventText}", 
        "dateStart": "${dateStart}", "dateEnd": "${dateEnd}" }`
  }

  await ses.sendTemplatedEmail(params).promise();
}


exports.sendEventRegistrationEmail = sendEventRegistrationEmail;
exports.sendTicketExpiredEmail = sendTicketExpiredEmail;
