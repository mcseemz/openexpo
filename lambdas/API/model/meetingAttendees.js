const util = require('./util');

async function getPresentersFor(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT *
           from meeting_attendies
           where meeting = $1
             and status in ('presenter','moderator')`,
    values: [Number(meetingId)]
  };

  llog.debug('REQUEST getPresentersFor: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

async function getAttendeesFor(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT *
           from meeting_attendies
           where meeting = $1
             and status = 'attendee'`,
    values: [Number(meetingId)]
  };

  llog.debug('REQUEST getAttendeesFor: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

async function getAttendeeFor(client, meetingId, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT *
           from meeting_attendies
           where meeting = $1
             and person = $2`,
    values: [Number(meetingId), Number(userId)]
  };

  llog.debug('REQUEST getAttendeeFor: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * get everyone attending meeting enriched from persons table
 * @param {Object} client
 * @param {number} meetingId
 * @returns {Promise<*[]|*>}
 */
async function getEveryoneAsPersons(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT p.*, meeting_attendies.status as "meeting_status"
           from meeting_attendies join person p on p.id = meeting_attendies.person
           where meeting_attendies.meeting = $1`,
    values: [Number(meetingId)]
  };

  llog.debug('REQUEST getEveryoneAsPersons: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}


/**
 * get attendees as persons
 * @param {Object} client
 * @param {number} meetingId
 * @returns {Promise<*[]|*>}
 */
async function getAttendeesAsPersons(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT p.*, meeting_attendies.status as "meeting_status"
           from meeting_attendies join person p on p.id = meeting_attendies.person
           where meeting_attendies.meeting = $1
             and meeting_attendies.status = 'attendee'`,
    values: [Number(meetingId)]
  };

  llog.debug('REQUEST getAttendeesAsPersons: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

async function addRoleFor(client, meetingId, userId, role) {
  const llog = client.log || util.log;

  const query = {
    text: `INSERT INTO meeting_attendies (meeting, person, status)
           VALUES ($1, $2, $3)
           ON CONFLICT ON CONSTRAINT meeting_attendies_uq
               DO UPDATE SET status = $3
           RETURNING *`,
    values: [Number(meetingId), Number(userId), role]
  };

  llog.debug('REQUEST addRoleFor: ', query);
  const res = await client.query(query);
  llog.debug(`inserted: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function addPresenterFor(client, meetingId, userId) {
  return await addRoleFor(client, meetingId, userId, 'presenter');
}

async function addAttendeeFor(client, meetingId, userId) {
  return await addRoleFor(client, meetingId, userId, 'attendee');
}

async function addModeratorFor(client, meetingId, userId) {
  return await addRoleFor(client, meetingId, userId, 'moderator');
}

async function deleteAttendeesFor(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `delete
           from meeting_attendies
           where meeting = $1`,
    values: [Number(meetingId)]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("deleted");
}

async function deleteAttendeesForMultipleMeetings(client, meetingIds) {
  const query = {
    text: `delete
           from meeting_attendies
           where meeting = ANY ($1)`,
    values: [meetingIds]
  };

  llog.debug('REQUEST deleteAttendeesForMultipleMeetings: ', query);
  const res = await client.query(query);
  llog.debug('deleted');
}

/**
 * validate for a person to allowed in meeting
 * @param {Object} client
 * @param {number } meetingId - meeting id
 * @param {number} userId - user id
 * @returns {Promise<boolean>} true if exists as attendee
 */
async function isAttendee(client, meetingId, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT 1
           from meeting_attendies
           where meeting = $1
             and person = $2`,
    values: [Number(meetingId), Number(userId)]
  };

  llog.debug('REQUEST isAttendee: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length > 0
}



exports.getPresentersFor = getPresentersFor;
exports.getAttendeesFor = getAttendeesFor;
exports.getEveryoneAsPersons = getEveryoneAsPersons;
exports.getAttendeesAsPersons = getAttendeesAsPersons;
exports.addPresenterFor = addPresenterFor;
exports.addAttendeeFor = addAttendeeFor;
exports.addModeratorFor = addModeratorFor;
exports.deleteAttendeesFor = deleteAttendeesFor;
exports.deleteAttendeesForMultipleMeetings = deleteAttendeesForMultipleMeetings;
exports.isAttendee = isAttendee;
exports.getAttendeeFor = getAttendeeFor;