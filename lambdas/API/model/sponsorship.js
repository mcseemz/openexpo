const util = require('./util');
const relationUtil = require('./relation');
const ticketUtil = require('./ticket');
const exceptionUtil = require('./exception');
const validator = require('./validation');
const eventUtil = require('./event');
const tierUtil = require('./tier');

const LOTTERY = 'lottery';
const SURVEY = 'survey';
const BANNER = 'banner';
const VIDEO = 'video';
const LOGO = 'logo';

/**
 * get list of valid relation sponsorship parameters. Used for sanity filter while updating relation
 * @returns {string[]}
 */
function getValidEntries() {
  return [BANNER, 'bannerUrl', VIDEO, 'videoUrl', LOGO, 'logoUrl', 'tierId', LOTTERY, SURVEY]
}

/**
 * get list of valid sponsorship placeholders. Used for sanity filter while updating relation
 * @returns {string[]}
 */
function getValidPlaceIds() {
  return [BANNER, VIDEO, LOGO, LOTTERY, SURVEY]
}


/**
 * get sponsor relations along with sponsor data for set of tiers
 * @param client
 * @param eventId
 * @param tierIds
 * @returns {Promise<*[]|*>}
 */
async function getRelationDataForTiers(client, eventId, tierIds) {
  const query = {
    text: `select r.*,
                  p.name || ' ' || p.surname as userName,
                  p.email                    as userEmail,
                  p.address                  as userAddress,
                  c.name                     as companyName,
                  c.email                    as companyEmail,
                  c.address                  as companyAddress
           from relation r
                    left join person p on p.id = r.object_ref_id and r.object_ref = 'user'
                    left join company c on c.id = r.object_ref_id and r.object_ref = 'company'
           where subject_ref = 'event'
             and subject_ref_id = $1
             and (parameter::json #> '{tierId}')::text::int = ANY ($2)`,
    values: [Number(eventId), tierIds]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  if (res.rows.length) {
    return res.rows;
  } else {
    return [];
  }
}

/**
 * Create sponsorship relation
 * @param {Object} client
 * @param {number} eventId
 * @param {number} tierId
 * @param {ObjectRef} customer
 */
async function sponsorshipCreate(client, eventId, tierId, customer) {
  return relationUtil.relationCreate(client, customer, new util.ObjectRef('event', eventId), 'sponsor', {"tierId": tierId});
}

/**
 * check for existence
 * @param {Object} client
 * @param {number} eventId
 * @param {ObjectRef} customer
 * @returns {Promise<boolean>} true if exists
 */
async function sponsorshipExists(client, eventId, customer) {
  return relationUtil.relationExists(client, customer, new util.ObjectRef('event', eventId), 'sponsor');
}

/**
 * get sponsor relation for specific event and customer
 * @param client
 * @param eventId
 * @param customer
 * @returns {Promise<*|null>}
 */
async function sponsorshipGet(client, eventId, customer) {
  return relationUtil.relationGet(client, customer, new util.ObjectRef('event', eventId), 'sponsor');
}

/**
 * get sponsor relations for this event
 * @param client
 * @param eventId
 * @returns {Promise<*>}
 */
async function getSponsorsForEvent(client, eventId) {
  return relationUtil.relationsGetBySubject(client, new util.ObjectRef('event', eventId), 'sponsor');
}

/**
 * validate that this relation is applicable for actions (i.e. we can record stats on that)
 * @param {Object} client
 * @param {Object} relation - relation object
 * @param {string} placeId - sponsorship location name
 * @returns {Promise<void>} nothing
 * @throws 405 ApiException with explanation
 */
async function isValidForActions(client, relation, placeId) {
  //check that this is sponsored relation
  if (relation['operation'] !== 'sponsor') {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  if (!getValidPlaceIds().includes(placeId)) {
    throw new exceptionUtil.ApiException(405, 'Invalid location supplied');
  }
  const event = (validator.isNumber(relation['subject_ref_id']))
    ? await eventUtil.getEventFromDbOrThrowException(client, relation['subject_ref_id'], '')
    : await eventUtil.getEventFromDbByNameOrThrowException(client, relation['subject_ref_id'], '');

  //check that event is in proper state
  if (event['status'] !== 'active') {
    throw new exceptionUtil.ApiException(405, 'Invalid event state');
  }

  //check that tier has that placeId enabled
  let tier = await tierUtil.getByIdOrThrowException(client, relation['parameter']['tierId'])
  if (!tier['switches'][placeId]) {
    throw new exceptionUtil.ApiException(405, 'Invalid sponsorship switch');
  }

  //check that sponsor has that data configured
  if (!relation['parameter'][placeId]) {
    throw new exceptionUtil.ApiException(405, 'Sponsorship setup is not complete');
  }
}


/**
 * properly update ticket with banner view
 * @param {Object} client - database client
 * @param {number} ticketId - ticket id
 * @param {Object} relation - relation object
 * @returns {Promise<void>}
 */
async function updateTicketWithBannerView(client, ticket, relation) {
  const parameter = ticket['parameter'];
  const relationId = relation.id;
/* duplicates array elements on different parameters combination, does not work properly
  const query = {
    text: `update ticket set parameter = jsonb_merge(parameter::jsonb, '{"sponsorship": [{"relationId": $1, "banner": true}]}'::jsonb) 
      where id = $2`, //returning *
    values: [Number(relationId),Number(ticketId)]
  };
*/
  let update = false;
  if (!parameter['sponsorship']) {
    parameter['sponsorship'] = [{ relationId: relation['id'], banner:true }];
    update = true;
  } else {
    let ticketrel = parameter['sponsorship'].find(e => e.relationId === relationId);
    if (!ticketrel) {  //initialization
      ticketrel = {relationId: relation['id'], banner:true};
      parameter['sponsorship'].push(ticketrel);
      update = true;
    } else {
      if (!ticketrel['banner']) {
        ticketrel['banner'] = true;
        update = true;
      }
    }
  }
  if (update) {
    await ticketUtil.updateParameter(client, ticket['id'], parameter);
  }
}

/**
 * update ticket paratemeter with lottery data.
 * Potential dat loss if ticket is updated with other sponsorship data at the same time
 * @param {Object} client
 * @param {Object} ticket
 * @param {Object} relation
 * @param {string} prizeId - unique prize option code
 * @returns {Promise<void>}
 */
async function updateTicketWithLotteryRoll(client, ticket, relation, prizeId) {
  const parameter = ticket['parameter'];
  const relationId = relation.id;
  const lottery = { last: new Date(Date.now()), prizeId: prizeId };
  if (!parameter['sponsorship']) {
    parameter['sponsorship'] = [{ relationId: relation['id'], lottery: lottery }];
  } else {
    let ticketrel = parameter['sponsorship'].find(e => e.relationId === relationId);
    if (!ticketrel) {  //initialization
      ticketrel = {relationId: relation['id'], lottery: lottery};
      parameter['sponsorship'].push(ticketrel);
    } else {
      if (!ticketrel['lottery']) {
        ticketrel['lottery'] = lottery;
      }
      else {
        if (ticketrel['lottery']['prizeId']) { //prize already assigned
          throw new exceptionUtil.ApiException(405, 'Prize cannot be overridden');
        }
        else if (Date.now() - new Date(ticketrel['lottery']['last']).getTime() < 60*60*1000) {
          throw new exceptionUtil.ApiException(405, 'Too early to roll');
        }
        else {
          ticketrel['lottery']['last'] = new Date(Date.now());
        }
      }
    }
  }

  await ticketUtil.updateParameter(client, ticket['id'], parameter);
}

/**
 *
 * @param {Object} client
 * @param {Object} ticket
 * @param {Object} relation
 * @param {Object} questions in the form
[ {
    "id": "uuid8asd",
    "value": [ "mammoth" ]
  },{
    "id": "uuid8xcv",
    "value": [ "mammoth", "birch" ]
  },{
    "id": "uuid8qwe",
    "value": [ "free-form text goes here escaped" ]
  } ]
 * @returns {Promise<void>}
 */
async function updateTicketWithSurveyResult(client, ticket, relation, questions) {
  const parameter = ticket['parameter'];
  const relationId = relation.id;
  const survey = { last: new Date(), questions: questions};
  if (!parameter['sponsorship']) {
    parameter['sponsorship'] = [{ relationId: relation['id'], survey: survey }];
  } else {
    let ticketrel = parameter['sponsorship'].find(e => e.relationId === relationId);
    if (!ticketrel) {  //initialization
      ticketrel = {relationId: relation['id'], survey: survey};
      parameter['sponsorship'].push(ticketrel);
    } else {
      if (!ticketrel['survey']) {
        ticketrel['survey'] = survey;
      }
      else {  //cannot do survey twice
        throw new exceptionUtil.ApiException(405, 'Survey already processed');
      }
    }
  }

  await ticketUtil.updateParameter(client, ticket['id'], parameter);
}

exports.sponsorshipCreate = sponsorshipCreate;
exports.sponsorshipExists = sponsorshipExists;
exports.sponsorshipGet = sponsorshipGet;
exports.getRelationDataForTiers = getRelationDataForTiers;
exports.getSponsorsForEvent = getSponsorsForEvent;
exports.getValidEntries = getValidEntries;
exports.getValidPlaceIds = getValidPlaceIds;
exports.updateTicketWithBannerView = updateTicketWithBannerView
exports.updateTicketWithLotteryRoll = updateTicketWithLotteryRoll
exports.updateTicketWithSurveyResult = updateTicketWithSurveyResult
exports.isValidForActions = isValidForActions
exports.LOTTERY = LOTTERY
exports.SURVEY = SURVEY
exports.BANNER = BANNER
exports.VIDEO = VIDEO
exports.LOGO = LOGO
