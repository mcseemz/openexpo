/**
 * @description functional for invitation to create stand in the event
 * @type {{ApiException?: function(*, *): void}}
 */

const exceptionUtil = require('./exception');
const util = require('./util');

async function createInvitation(client, standPerson, eventOrganizer, eventId) {
  let query = {
    text: 'INSERT INTO Stand_invitation(event, email_to , event_organiser, stand_owner_ok, event_organiser_ok) VALUES($1, LOWER($2), $3, $4, $5) RETURNING *',
    values: [Number(eventId), standPerson, Number(eventOrganizer), true, false]
  };

  console.log("REQUEST:", query);
  const invitationRes = await client.query(query);
  console.log("created:", invitationRes);

  if (invitationRes.rows.length === 0 || !invitationRes.rows[0]) {
    return -1;
  } else {
    return invitationRes.rows[0].id;
  }
}

async function invitationExists(client, eventId, userEmail ) {
  let query = {
    text: 'SELECT 1 from Stand_invitation where event = $1 and LOWER(email_to) = LOWER($2) and stand_owner_ok = $3 and event_organiser_ok = $4',
    values: [Number(eventId), userEmail, true, false]
  };

  console.log("REQUEST:", query);
  const invitationRes = await client.query(query);
  console.log("created:", invitationRes);

  return invitationRes.rows.length !== 0;
}

async function deleteInvitationIfExists(client, invitationId) {
  let query = {
    text: 'DELETE FROM stand_invitation where id = $1 returning 1',
    values: [Number(invitationId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("deleted strings: ", res.rows.length);

  return res.rows.length;
}

/**
 * get all invitations to create stand
 * @param {Object} client database
 * @param {string} email user email
 * @returns {Promise<*|*[]>}
 */
async function getInvitationsForUser(client, email) {
  const llog = client.log || util.log;
  const query = {
    text: 'SELECT * from Stand_invitation where LOWER(email_to) = LOWER($1)',
    values: [email]
  };

  llog.debug('REQUEST getInvitationsForUser: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows : [];
}

async function getInvitationsForEvent(client, eventId) {
  const llog = client.log || util.log;
  const query = {
    text: 'SELECT * from Stand_invitation where event = $1 ',
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getInvitationsForEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows : [];
}

async function getInvitationById(client, invitationId) {
  let query = {
    text: 'SELECT * FROM Stand_invitation where id = $1',
    values: [Number(invitationId)]
  };

  console.log("REQUEST:", query);
  const inv = await client.query(query);
  if (inv.rows.length === 0 || !inv.rows[0]) {
    return null;
  } else {
    return inv.rows[0];
  }
}

/**
 * Get invitation by id. If not found - throw an exception
 * @param client - PG client
 * @param invitationId - id of the invitation
 * @returns invitation, if found.
 * @throws ApiException if not found
 */
async function getInvitationByIdOrThrowException(client, invitationId) {
  const llog = client.log || util.log;
  let query = {
    text: 'SELECT * FROM Stand_invitation where id = $1',
    values: [Number(invitationId)]
  };

  llog.debug('REQUEST getInvitationByIdOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length === 0 || !res.rows[0]) {
    throw new exceptionUtil.ApiException(404, 'Invitation not found');
  } else {
    return res.rows[0];
  }
}

exports.createInvitation = createInvitation;
exports.invitationExists = invitationExists;
exports.deleteInvitationIfExists = deleteInvitationIfExists;
exports.getInvitationsForUser = getInvitationsForUser;
exports.getInvitationById = getInvitationById;
exports.getInvitationsForEvent = getInvitationsForEvent;
exports.getInvitationByIdOrThrowException = getInvitationByIdOrThrowException;