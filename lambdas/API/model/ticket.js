/**
 * @description ticket lifecycle library
 * 1. not_payed → payed|cancelled
 * 2. payed → refunded|archived|banned
 * 3. banned → payed
 * 4. archived → payed
 * @type {{Forbidden?: string, Invalid?: string, InternalServerError?: string, NotFound?: string, ApiException?: function(*, *): void, ApiError?: ApiError}}
 */

const exceptionUtil = require('./exception');
const util = require('./util');
const dateUtil = require('./date');
const STATUS_PAYED = 'payed';   //statuses match database enum ticket_payment_status_type
const STATUS_NOT_PAYED = 'not_payed';
const STATUS_CANCELLED = 'cancelled';
const STATUS_REFUNDED = 'refunded';
const STATUS_BANNED = 'banned';
const STATUS_ARCHIVED = 'archived';
const STATUS_PERSONNEL = 'personnel';

const STATUS_ALL_CUSTOMER = [STATUS_PAYED, STATUS_NOT_PAYED, STATUS_CANCELLED, STATUS_REFUNDED, STATUS_BANNED, STATUS_ARCHIVED];

async function createTicketInDb(client, ticket) {
  const llog = client.log || util.log;

  const query = {
    text: 'INSERT into ticket (event, buyer, stand, pricing, payment_status, tags, parameter) values ($1, $2, $3, $4, $5, $6, $7)  returning *',
    values: [Number(ticket['event']),
      Number(ticket['buyer']),
      ticket['stand'] ? Number(ticket['stand']) : null,
      Number(ticket['pricing']),
      ticket['payment_status'],
      ticket['tags'] ? JSON.stringify(ticket['tags']) : '[]',
      ticket['parameter'] ? ticket['parameter'] : {}]
  };

  llog.debug('REQUEST createTicketInDb: ', query);
  const res = await client.query(query);
  llog.debug('created: ', res.rows[0]);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * check if user has active ti
 * @param {Object} client
 * @param {number} eventId
 * @param {number} buyerId
 * @param {String[]} statuses - array of statuses to check ticket against. We consider banned ticket as active, so user cannot buy another one
 * @returns {Promise<boolean>}
 */
async function checkTicketExists(client, eventId, buyerId, statuses = [STATUS_PAYED,STATUS_NOT_PAYED,STATUS_BANNED]) {
  const llog = client.log || util.log;
  const query = {
    text: `select id, event from ticket where event = $1 and buyer = $2 and payment_status = ANY ($3)`,
    values: [Number(eventId), Number(buyerId), statuses]
  };

  llog.debug('REQUEST checkActiveTicketExists: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  const noTickets = res.rows.length === 0;
  return !(noTickets);
}

/**
 * Get user ticket for an event
 * @param {Object} client database
 * @param {number} buyerId user id
 * @param {number} eventId event id
 * @param {boolean} silent should throw
 * @returns {Promise<*>}
 */
async function getForUserAndEventOrThrowException(client, buyerId, eventId, silent = false) {
  const llog = client.log || util.log;
  const query = {
    text: 'select * from ticket where event = $1 and buyer = $2',
    values: [Number(eventId), Number(buyerId)]
  };

  llog.debug('REQUEST getForUserAndEventOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length) {
    return res.rows[0];
  }

  if (silent) {
    return null;
  }
  throw new exceptionUtil.ApiError(exceptionUtil.NotFound, 'Ticket not found');
}

/**
 * Get active tickets for user ticket for an event
 * @param {Object} client database
 * @param {number} personId user id
 * @param {number} eventId event id
 * @returns {Promise<*>}
 */
async function getActiveForUserAndEvent(client, personId, eventId) {
  const llog = client.log || util.log;
  const query = {
    text: 'select * from ticket where event = $1 and buyer = $2 and payment_status = ANY ($3)',
    values: [Number(eventId), Number(personId), [STATUS_PAYED,STATUS_PERSONNEL]]
  };

  llog.debug('REQUEST getActiveForUserAndEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}


/**
 * Get user ticket for an event
 * @param {Object} client database
 * @param {number[]} ids user ids
 * @param {number} eventId event id
 * @returns {Promise<*>}
 */
async function getForMultipleUsersAndEvent(client, ids, eventId) {
  const llog = client.log || util.log;
  const query = {
    text: 'select * from ticket where event = $1 and buyer = ANY($2::int[])',
    values: [Number(eventId), ids]
  };

  llog.debug('REQUEST getForMultipleUsersAndEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * Get all pricing tags for all active tickets of user for event
 * @param {Object} client database
 * @param {number} buyerId user id
 * @param {number[]} events array of event ids
 * @returns {Promise<*>}
 */
async function getActivePricingTagsForUserAndEvent(client, buyerId, event) {
  const llog = client.log || util.log;
  const query = {
    text: `SELECT jsonb_agg(t.tags) as tags, t.event
    FROM (SELECT DISTINCT jsonb_array_elements_text(tags) AS tags, event FROM ticket WHERE event = $1 and buyer=$2) AS t
      WHERE t.tags LIKE 'pricing:%'
      Group by t.event `,
    values: [Number(event), Number(buyerId)]
  }
    
  llog.debug('REQUEST getActivePricingTagsForUserAndEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * Get all pricing tags for all active tickets of user for every stand
 * @param {Object} client database
 * @param {number} buyerId user id
 * @param {number[]} stands array of stand ids
 * @returns {Promise<*>}
 */
 async function getActivePricingTagsForUserAndStand(client, buyerId, stand) {
  const llog = client.log || util.log;
  const query = {
    text: `SELECT jsonb_agg(t.tags) as tags, t.stand
    FROM (SELECT DISTINCT jsonb_array_elements_text(ticket.tags) AS tags, stand.id AS stand FROM ticket 
    	RIGHT JOIN stand ON stand.event=ticket.event  
    	WHERE stand.id = $1 and ticket.buyer=$2) AS t
      WHERE t.tags LIKE 'pricing:%'
      Group by t.stand `,
    values: [Number(stand), Number(buyerId)]
  }
    
  llog.debug('REQUEST getActivePricingTagsForUserAndStand: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * Get user ticket by id
 * @param {Object} client database
 * @param {number} ticketId ticket id
 * @returns {Promise<*>}
 */
async function getByIdOrThrowException(client, ticketId) {
  const llog = client.log || util.log;

  const query = {
    text: 'select * from ticket where id = $1',
    values: [Number(ticketId)]
  };

  llog.debug('REQUEST getByIdOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length) {
    return res.rows[0];
  }
  throw new exceptionUtil.ApiException(404, 'Ticket not found');
}

/**
 * overwrite parameter value for ticket
 * @param {Object} client
 * @param {number} ticketId
 * @param {Object} parameter - json with ticket additional data
 * @returns {Promise<void>}
 */
async function updateParameter(client, ticketId, parameter) {
  const llog = client.log || util.log;

  const query = {
    text: 'update ticket set parameter = $1 where id = $2', //returning *
    values: [parameter, Number(ticketId)]
  };

  llog.debug('REQUEST updateParameter: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);
}

/**
 * update ticket status for ticket
 * @param {Object} client
 * @param {number} ticketId
 * @param {Object} status
 * @returns {Promise<void>}
 */
async function updatePaymentStatus(client, ticketId, status) {
  const llog = client.log || util.log;

  const query = {
    text: 'update ticket set payment_status = $1 where id = $2', //returning *
    values: [status, Number(ticketId)]
  };

  llog.debug('REQUEST updatePaymentStatus: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);
}

/**
 * check if user has active ti
 * @param {Object} client
 * @param {String[]} statuses - array of statuses to check ticket against. We consider banned ticket as active, so user cannot buy another one
 * @returns {Promise<boolean>}
 */
async function getExpiredTickets(client, statuses = [STATUS_PAYED,STATUS_BANNED]) {
  const llog = client.log || util.log;
  const query = {
    text: `select id, buyer, event, (ticket.parameter::json #> '{expiration}')::text::date as expiration from ticket 
                 WHERE (ticket.parameter::jsonb ? 'expiration')
                   and (ticket.parameter::json #> '{expiration}')::text::date < now()
                  AND payment_status = ANY ($1)`,
    values: [statuses]
  };

  llog.debug('REQUEST getExpiredTickets: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * calculate expiration date
 * @param {Date} date date in JS object
 * @param expiration string in format NN[d|m], e.g. 12m or 14d
 */
function calculateExpirationDate(date, expiration) {
  let expDate = date;
  const number = Number(expiration.substring(0, expiration.length-1));
  if (expiration.endsWith('m')) {
    expDate = dateUtil.addMonths(date,number );
  } else if (expiration.endsWith('d')) {
    expDate = dateUtil.addDays(date, number)
  }
  return expDate;
}

/**
 * remove sensitive data for output to front
 * @param {Object} ticket
 * @returns {{date_action, expiration: (string|*), event, status}}
 */
function prepareTicketForOutput(ticket) {
  return {
    expiration: ticket.parameter.expiration,
    payment_status: ticket.payment_status,
    date_action: ticket.date_action,
    event: ticket.event
  }
}

exports.createTicketInDb = createTicketInDb;
exports.checkTicketExists = checkTicketExists;
exports.getForUserAndEventOrThrowException = getForUserAndEventOrThrowException;
exports.getActiveForUserAndEvent = getActiveForUserAndEvent;
exports.getForMultipleUsersAndEvent = getForMultipleUsersAndEvent;
exports.getByIdOrThrowException = getByIdOrThrowException;
exports.updateParameter = updateParameter;
exports.updatePaymentStatus = updatePaymentStatus;
exports.getActivePricingTagsForUserAndEvent = getActivePricingTagsForUserAndEvent;
exports.getActivePricingTagsForUserAndStand = getActivePricingTagsForUserAndStand;
exports.getExpiredTickets = getExpiredTickets;
exports.calculateExpirationDate = calculateExpirationDate;
exports.prepareTicketForOutput = prepareTicketForOutput;

exports.STATUS_PAYED = STATUS_PAYED;
exports.STATUS_NOT_PAYED = STATUS_NOT_PAYED;
exports.STATUS_CANCELLED = STATUS_CANCELLED;
exports.STATUS_REFUNDED = STATUS_REFUNDED;
exports.STATUS_BANNED = STATUS_BANNED;
exports.STATUS_ARCHIVED = STATUS_ARCHIVED;
exports.STATUS_PERSONNEL = STATUS_PERSONNEL;
exports.STATUS_ALL_CUSTOMER = STATUS_ALL_CUSTOMER;
