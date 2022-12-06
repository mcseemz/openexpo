/**
 * @description Get sponsorship data for a given set of placeholders.
 *  checks for available sponsor data and matches with processed actions
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const ticketUtil = require('./model/ticket');
const eventUtil = require('./model/event');
const sponsorshipUtil = require('./model/sponsorship');
const tierUtil = require('./model/tier');

function validateParams(params) {
  return !!params['eventId'] &&
      !!params['placeIds'] && validator.isValidNonEmptyString(params['placeIds']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventPageGetPromos');

  const apiDomain = await poolUtil.getApiDomainFromOrigin(data['origin']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const event = (validator.isNumber(data['eventId']))
        ? await eventUtil.getEventFromDbOrThrowException(client, data['eventId'], user ? user['id'] : '')
        : await eventUtil.getEventFromDbByNameOrThrowException(client, data['eventId'], user ? user['id'] : '');

    if (event['status'] !== 'active') {
      throw new exceptionUtil.ApiException(405, 'Invalid event state');
    }

    const tickets = await ticketUtil.getActiveForUserAndEvent(client, user['id'], event['id']);
    let result = {};

    //get sponsors
    let sponsors = await sponsorshipUtil.getSponsorsForEvent(client, event['id']);
    let tiers = await tierUtil.getTiersEnabledForEventSimple(client, event['id']);
    //enrich sponsor with tier status
    for (const sponsor of sponsors) {
      let tierId = sponsor['tierId'];
      for (const tier of tiers) {
        if (tier['id'] === tierId) {
          sponsor['enabled'] = tier['is_enabled'];
          sponsor['switches'] = tier['switches'];
        }
      }
    }
    let placeIdSeen = {banner: []}  //we can collect several placeIds here

    for (const ticket of tickets) {
      let ticketrels = ticket['parameter']['sponsorship'] || []; //no sponsorship processed at all yet
      for (const ticketrel of ticketrels) {
        let relationId = ticketrel['relationId'];
        if (ticketrel['banner']) { //we can collect several placeIds here
          placeIdSeen['banner'].push(relationId);
        }
      }
    }

    const placeIds = data['placeIds'].split(',');
    for (const placeId of placeIds) {
      result[placeId] = {};
      //validate proper placeIds names
      if (!sponsorshipUtil.getValidPlaceIds().includes(placeId)) continue;

      let sponsorids = [];
      for (const sponsor of sponsors) {
        //chck if sponsor is eligible
        if (!sponsor['enabled'] || !sponsor['switches'][placeId]) continue;
        //check if sponsor was seen
        if (placeIdSeen[placeId] && placeIdSeen[placeId].includes(sponsor['id'])) continue;
        sponsorids.push(sponsor);
      }
      if (sponsorids.length > 0) {
        //pick random
        let rel = sponsorids[Math.floor(Math.random() * sponsorids.length)]

        result[placeId]['id'] = rel['id'];
        result[placeId][placeId] = rel['parameter'][placeId];
        result[placeId][placeId + 'Url'] = `https://${apiDomain}/sponsor/${rel['id']}/action/${placeId}`;
      }
    }

    return util.handle200(data, result);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
