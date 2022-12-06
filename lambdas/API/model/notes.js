const util = require('./util');

async function deleteFromDb(client, entity, entityId) {
  const llog = client.log || util.log;

  const query = {
    text: 'DELETE from notes where ref = $1 and ref_id = $2',
    values: [entity, Number(entityId)]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("deleted:", res.rows.length);
  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function deleteNotesForMeeting(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `DELETE
           from notes
           where ref_id = $1
             and ref = 'meeting'
           returning *`,
    values: [Number(meetingId)]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("deleted:", res.rows.length);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function deleteNotesForMultipleMeetings(client, meetingIds) {
  const llog = client.log || util.log;

  const query = {
    text: `DELETE
           from notes
           where ref_id = ANY ($1)
             and ref = 'meeting'
           returning *`,
    values: [meetingIds]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("deleted:", res.rows.length);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function createNote(client, entity, entityId, person, company, value) {
  const llog = client.log || util.log;

  const query = {
    text: 'insert into notes (ref, ref_id, person, company, value, is_default) VALUES ($1, $2, $3, $4, $5, $6) returning *',
    values: [entity, Number(entityId), person || null, company || null, value, true]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("inserted:", res.rows.length);
  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function updateNoteForUser(client, entity, entityId, person, value) {
  const llog = client.log || util.log;

  const query = {
    text: 'update notes set value = $1 where ref = $2 and ref_id = $3 and person = $4',
    values: [value, entity, Number(entityId), person]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("updated");
}

async function updateNoteForCompany(client, entity, entityId, company, value) {
  const llog = client.log || util.log;

  const query = {
    text: 'update notes set value = $1 where ref = $2 and ref_id = $3 and company = $4',
    values: [value, entity, Number(entityId), company]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("updated");
}

exports.deleteFromDb = deleteFromDb;
exports.createNote = createNote;
exports.updateNoteForUser = updateNoteForUser;
exports.updateNoteForCompany = updateNoteForCompany;
exports.deleteNotesForMeeting = deleteNotesForMeeting;
exports.deleteNotesForMultipleMeetings = deleteNotesForMultipleMeetings;