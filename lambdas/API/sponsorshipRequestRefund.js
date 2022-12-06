/**
 * @description Request for a refund.
 */
const AWS = require('aws-sdk');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const permissionUtil = require('./model/permissions');
const externalParamsUtil = require('./model/externalParams');
const pricingUtil = require('./model/eventPricing');
const tierUtil = require('./model/tier');
const companyUtil = require('./model/company');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

console.log("PostgreSQL POST Function");

function validateParams(params) {
  return !!params['relationId'] && validator.isNumber(params['relationId']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

function getEntityName(user, company) {
  return user['company'] ? company['name'] : user['name'] + ' ' + user['surname'] + ' (' + user['email'] + ')';
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaSponsorshipRequestRefund');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const relation = await relationUtil.getOrThrowException(client, data['relationId']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, relation['subject_ref_id']);
    const tier = await tierUtil.getByIdOrThrowException(client, relation['parameter']['tierId'], data['language']);
    const tierName = tier['strings'].find(s => s['category'] === 'name')['value'];

    const isSponsor = relation['object_ref'] === 'company' && relation['object_ref_id'] === user['company'] || relation['object_ref'] === 'user' && relation['object_ref_id'] === user['id'];
    if (!isSponsor) {
      await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);
    }

    const dayBeforeEvent = new Date(Date.parse(event['dateStart']));
    dayBeforeEvent.setDate(dayBeforeEvent.getDate() - 1);
    if (Date.now() > dayBeforeEvent) {
      throw new exceptionUtil.ApiException(405, 'You can not request refund 1 day before the event');
    }

    const pricing = await pricingUtil.getActivePricingForTierOrThrowException(client, relation['parameter']['tierId']);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    let moderators = await externalParamsUtil.getModeratorsList(shortDomain);

    await eventUtil.populateMultipleEventsWithData(client, [event], data['language'])

    let eventName = event['strings'].find(s => s['category'] === 'name');
    eventName = eventName ? eventName['value'] : 'No name specified';

    let company;
    if (user['company']) {
      company = await companyUtil.getCompanyById(client, user['company']);
    }

    let params = {
      "Source": sender,
      "Template": "refundRequest",
      "Destination": {
        "ToAddresses": moderators
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'refundRequest'
        },
      ],
      "TemplateData": `{ "eventName": "${eventName}", "eventId": "${event['id']}",
       "tier": "${relation['parameter']['tierId']}", "entity": "${relation['object_ref']}", 
       "entityId": "${relation['object_ref_id']}", "initiatorId": "${user['id']}",
        "startDate": "${event['dateStart']}", "eventStatus": "${event['status']}", 
        "pricingCost": "${pricing['access_price']}", "pricingCurrency": "${pricing['access_currency']}",
        "relationshipId": "${relation['id']}", "tierName": "${tierName}",
        "entityName": "${getEntityName(user, company)}", "initiatorSide": "${isSponsor ? 'sponsor' : ' event organizer'}",
        "userEmail": "${user['email']}", "eventLink": "${data['origin']}/event/${event['id']}"}`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
