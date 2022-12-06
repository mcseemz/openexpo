/**
 * @description module for personnel invitation
 * @type {{uuid?: function(): string, uuid32?: function(): string, handleStart?: function(*, *=, *=, *=, *=): void, handle200?: function(*, *=): *, handle301?: function(*, *=): {headers: {Location: *}, body: null, statusCode: number}, handleError?: function(*, *=): {body: *|string, statusCode: *}, handleFinally?: function(*=, *=): void, ObjectRef?: ObjectRef, log?: *}}
 */
const util = require('./util');

async function createInvitation(client, userId, emailTo, roleId, position, companyId) {
  const llog = client.log || util.log;

  let query = {
    text: 'INSERT INTO personnel_invitation(person_from, email_to , role, position, company) VALUES($1, $2, $3, $4, $5) RETURNING *',
    values: [Number(userId), emailTo, Number(roleId), position, Number(companyId)]
  };

  llog.debug("REQUEST:", query);
  const invitationRes = await client.query(query);
  llog.debug("created:", invitationRes.rows.length);

  if (invitationRes.rows.length === 0 || !invitationRes.rows[0]) {
    return -1;
  } else {
    return invitationRes.rows[0].id;
  }
}

async function invitationExists(client, companyId, emailTo) {
  let query = {
    text: 'SELECT * from personnel_invitation where company = $1 and email_to = $2',
    values: [Number(companyId), emailTo]
  };

  console.log("REQUEST:", query);
  const invitationRes = await client.query(query);
  console.log("fetched:", invitationRes);

  return invitationRes.rows.length !== 0;
}

async function deleteInvitation(client, invitationId) {
  let query = {
    text: 'DELETE FROM personnel_invitation where id = $1 returning *',
    values: [Number(invitationId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("deleted strings: ", res.rows.length);

  return res.rows.length;
}

/**
 * get all invitations for a user by his email
 * @param {Object} client
 * @param {string} email
 * @returns {Promise<void>}
 */
async function getInvitationsForEmail(client, email) {
  const llog = client.log || util.log();
  let query = {
    text: `SELECT p.*, r.name as rolename FROM personnel_invitation p 
        JOIN role r on r.id = p.role
        WHERE LOWER(p.email_to) = LOWER($1)`,
    values: [email]
  };

  llog.debug('REQUEST getInvitationsForEmail: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);
  return res.rows || [];
}

async function getInvitationById(client, invitationId) {
  let query = {
    text: 'SELECT *, role.name as role_name FROM personnel_invitation INNER JOIN role ON personnel_invitation.role = role.id where personnel_invitation.id = $1',
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
 * Get invitations sent by given company.
 * @param client - PG client
 * @param companyId - id of the company sender
 * @returns - either array of invitations or empty array
 */
async function getInvitationsFromCompany(client, companyId) {
  let query = {
    text: `SELECT distinct c.id, pi.email_to, pi.role, pi.position
           FROM personnel_invitation pi
                    left join confirmation c on pi.id = c.ref_id
           where company = $1`,
    values: [Number(companyId)]
  };

  console.log("REQUEST: ", query);
  const inv = await client.query(query);
  console.log("selected: ", inv.rows.length);

  if (inv.rows.length === 0) {
    return [];
  } else {
    return inv.rows;
  }
}

exports.createInvitation = createInvitation;
exports.deleteInvitation = deleteInvitation;
exports.getInvitationById = getInvitationById;
exports.invitationExists = invitationExists;
exports.getInvitationsFromCompany = getInvitationsFromCompany;
exports.getInvitationsForEmail = getInvitationsForEmail;
