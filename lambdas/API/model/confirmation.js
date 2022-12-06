const util = require('./util');
const exceptionUtil = require('./exception');

async function createRejectableConfirmation(client, entity, entityId, acceptLink, rejectLink, redirectLink) {
  const id = util.uuid();

  await insertConfirmation(client, id, entity, Number(entityId), 'accept', acceptLink, redirectLink);
  await insertConfirmation(client, id, entity, Number(entityId), 'reject', rejectLink, redirectLink);

  return id;
}

/**
 * Insert new confirmation entry to the DB.
 * @param client - Postgres client
 * @param id - uuid of the confirmation
 * @param entity - the source of the confirmation (e.g. personnel_invitation, stand_invitation etc.)
 * @param entityId - id  of the entity
 * @param resolution - action for the given entry (one of: accept, reject, confirm)
 * @param resolveLink - link to be used for resolution
 * @param redirectLink - link to redirect to after the confirmation resolved
 * @returns {Promise<void>}
 */
async function insertConfirmation(client, id, entity, entityId, resolution, resolveLink, redirectLink) {
  const llog = client.log || util.log;

  let query = {
    text: 'INSERT INTO confirmation(id, ref, ref_id, action, should_login, action_link, redirect_link) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    values: [id, entity, Number(entityId), resolution, true, resolveLink || '', redirectLink || '']
  };

  llog.debug("REQUEST:", query);
  const acceptRes = await client.query(query);
  llog.debug("created:", acceptRes);
}

async function createRejectConfirmation(client, entity, entityId, rejectLink, redirectLink) {
  const id = util.uuid();

  await insertConfirmation(client, id, entity, entityId, 'reject', rejectLink, redirectLink);

  return id;
}

async function getConfirmation(client, confirmationId, type) {
  const llog = client.log || util.log;

  let query = {
    text: 'SELECT * FROM confirmation where id = $1 and action = $2',
    values: [confirmationId, type]
  };

  llog.debug("REQUEST:", query);
  const userRes = await client.query(query);
  llog.debug("fetched:", userRes);
  if (userRes.rows.length === 0) {
    return null;
  } else {
    return userRes.rows[0];
  }
}

async function getConfirmationOrThrowException(client, confirmationId, type) {
  const llog = client.log || util.log;

  let query = {
    text: 'SELECT * FROM confirmation where id = $1 and action = $2',
    values: [confirmationId, type]
  };

  llog.debug("REQUEST:", query);
  const userRes = await client.query(query);
  llog.debug("fetched:", userRes);
  if (userRes.rows.length === 0) {
    throw new exceptionUtil.ApiException(404, 'Confirmation not found');
  } else {
    return userRes.rows[0];
  }
}

/**
 * Get any confirmation (if there are multiple) by given id. If the confirmation not found - throws an exception
 * @param client - PG client
 * @param confirmationId - id of the confirmation (or confirmation group)
 * @returns {Object} confirmation information
 */
async function getAnyConfirmationByIdOrThrowException(client, confirmationId) {
  const llog = client.log || util.log;
  let query = {
    text: 'SELECT * FROM confirmation where id = $1 limit 1',
    values: [confirmationId]
  };

  llog.debug('REQUEST getAnyConfirmationByIdOrThrowException: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);

  if (userRes.rows.length === 0) {
    throw new exceptionUtil.ApiException(404, 'Confirmation not found');
  } else {
    return userRes.rows[0];
  }
}

/**
 * Get confirmations by object
 * @param {Object} client - PG client
 * @param {util.ObjectRef} objectRef -
 * @returns {Object[]} confirmation information
 */
async function getConfirmationsByObject(client, objectRef) {
  const llog = client.log || util.log;
  let query = {
    text: 'SELECT * FROM confirmation where ref = $1 and ref_id = $2',
    values: [objectRef.entity, objectRef.entityId]
  };

  llog.debug('REQUEST getConfirmationsByObject: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * Get confirmations by object
 * @param {Object} client - PG client
 * @param {string} entityType
 * @param {number[]} entityIds
 * @returns {Object[]} confirmation information
 */
async function getConfirmationsForMultipleEntities(client, entityType, entityIds) {
  const llog = client.log || util.log;
  let query = {
    text: 'SELECT * FROM confirmation where ref = $1 and ref_id = ANY($2::int[]) ',
    values: [entityType, entityIds]
  };

  llog.debug('REQUEST getConfirmationsForMultipleEntities: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

async function deleteConfirmation(client, confirmationId) {
  const llog = client.log || util.log;
  let query = {
    text: 'DELETE FROM confirmation where id = $1 returning *',
    values: [confirmationId]
  };

  llog.debug('REQUEST deleteConfirmation: ', query);
  const userRes = await client.query(query);
  llog.debug(`deleted: ${userRes.rows.length}`);

  return userRes.rows.length;
}

exports.createRejectableConfirmation = createRejectableConfirmation;
exports.createRejectConfirmation = createRejectConfirmation;
exports.getConfirmation = getConfirmation;
exports.deleteConfirmation = deleteConfirmation;
exports.getAnyConfirmationByIdOrThrowException = getAnyConfirmationByIdOrThrowException;
exports.getConfirmationOrThrowException = getConfirmationOrThrowException;
exports.getConfirmationsByObject = getConfirmationsByObject;
exports.getConfirmationsForMultipleEntities = getConfirmationsForMultipleEntities;