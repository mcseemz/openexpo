/**
 * @description Buy sponsorship for the event and given tier from current user.
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const poolUtil = require('./model/pool');
const tierUtil = require('./model/tier');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const companyUtil = require('./model/company');
const ticketUtil = require('./model/ticket');
const pricingUtil = require('./model/eventPricing');
const sponsorshipUtil = require('./model/sponsorship');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      !!params['tierId'] && validator.isNumber(params['tierId']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

function getEntityName(user, company) {
  return user['company'] ? company['name'] : user['name'] + ' ' + user['surname'] + ' (' + user['email'] + ')';
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventBuySponsorship');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);
    const tier = await tierUtil.getByIdOrThrowException(client, data['tierId'], data['language']);

    if (!tier['is_enabled']) {
      throw new exceptionUtil.ApiException(405, 'Tier is not enabled');
    }
    const tierName = tier['strings'].find(s => s['category'] === 'name')['value'];

    if (user['company'] && event['company'] !== user['company']) {
      await permissionUtil.assertCanManageCompanySponsorship(client, user['company'], user['id']);
    }

    let customerObj = new util.ObjectRef(user['company'] ? 'company' : 'user', user['company'] || user['id']);
    const relationExists = await sponsorshipUtil.sponsorshipExists(client, event['id'], customerObj);
    if (relationExists) {
      throw new exceptionUtil.ApiException(405, 'User already sponsoring the event');
    }

    const pricing = await pricingUtil.getActivePricingForTierOrThrowException(client, tier['id']);
    await ticketUtil.createTicketInDb(client, {
      event: event['id'],
      buyer: user['company'] || user['id'],
      stand: null,
      pricing: pricing['id'],
      payment_status: ticketUtil.STATUS_PAYED,
      parameter: {}
    });

    const relation = await sponsorshipUtil.sponsorshipCreate(client, event['id'], tier['id'], customerObj);

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    let moderators = await externalParamsUtil.getModeratorsList(shortDomain);

    await eventUtil.populateMultipleEventsWithData(client, [event], data['language'])

    let eventName = event['strings'].find(s => s['category'] === 'name');
    eventName = eventName ? eventName['value'] : 'No name specified';

    let enabledSwitched = tier['switches'];
    Object.keys(enabledSwitched).forEach(function (k) {
      if (!enabledSwitched[k]) {
        delete enabledSwitched[k];
      }
    });

    //Email to the sponsor
    let params = {
      "Source": sender,
      "Template": "sponsorshipBoughtToSponsor",
      "Destination": {
        "ToAddresses": [user['email']],
        "BccAddresses": moderators
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'sponsorshipBoughtToSponsor'
        },
      ],
      "TemplateData": `{ "eventName": "${eventName}", "tierName": "${tierName}", "tierOptions": "${JSON.stringify(enabledSwitched).replace(/"/g, '\'')}",
       "eventLink": "${data['origin']}/event/${event['id']}", "organizerEmail": "${event['contacts'] ? event['contacts']['email'] || '-' : ''}", 
       "organizerPhone": "${event['contacts'] ? event['contacts']['phone'] || '-' : ''}"}`
    }

    await ses.sendTemplatedEmail(params).promise();

    //Email to organizer
    const companyOwners = await personUtil.getCompanyOwnersOrThrowException(client, event['company']);
    let company;
    if (user['company']) {
      company = await companyUtil.getCompanyById(client, user['company']);
    }
    params = {
      "Source": sender,
      "Template": "sponsorshipBoughtToOrganizer",
      "Destination": {
        "ToAddresses": companyOwners.map(o => o['email'])
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'sponsorshipBoughtToOrganizer'
        },
      ],
      "TemplateData": `{ "eventName": "${eventName}", "entity": "${user['company'] ? 'Company' : 'User'}", "entityName": "${getEntityName(user, company)}", 
      "tierOptions": "${JSON.stringify(tier['switches']).replace(/"/g, '\'')}", "price": "${tier['access_price']}", "currency":"${tier['access_currency']}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data, relation);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
