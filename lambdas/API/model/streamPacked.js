const exceptionUtil = require('./exception');
const util = require('./util');

async function getPacksForEntity(client, entity, eventId, expanded) {
  const query = {
    text: `SELECT *, concat(object_ref, '.', object_ref_id) as objkey
           FROM stream_packed
           where object_ref = $1
             and object_ref_id = $2
           order by latest desc `,
    values: [entity, Number(eventId)]
  };

  if (!expanded) {
    query.text = query.text + ' limit 5';
  }

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("fetched:", res.rows.length);
  if (res.rows.length === 0) {
    return [];
  } else {
    return res.rows;
  }
}

async function getPacksForStreamEntries(client, type) {
  const query = {
    text: `SELECT DISTINCT ON (object_ref, object_ref_id) *, concat(object_ref, '.', object_ref_id) as objkey 
           FROM   stream_packed
           WHERE action_date = $1
             AND action = $2
           ORDER  BY object_ref, object_ref_id, latest DESC`,
    values: [new Date(), type]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);
  return res.rows;
}

/**
 * get packages for entity, latest only
 * @param client
 * @param type
 * @returns {Promise<*[]|*>}
 */
/*
async function getPacksForStreamEntries(client, type) {
  const query = {
    text: `select *
           from stream_packed
           where action_date = $1
             and action = $2
           order by latest desc `,
    values: [new Date(), type]
  };

  console.log("REQUEST:", query);
  let {rows} = await client.query(query);
  console.log("selected:", rows);

  if (rows.length > 0) {
    //filter out older duplicates
    const maxMap = {};
    for (let i in rows) {
      const key = rows[i]['object_ref'] + '.' + rows[i]['object_ref_id']
      if (!maxMap[key] || maxMap[key] < rows[i]['latest']) {
        maxMap[key] = rows[i]['latest'];
      }
    }
    return rows.filter((item) => maxMap[item['object_ref'] + '.' + item['object_ref_id']] === item['latest']);
  } else {
    return [];
  }
} */

async function createNewPacksForStreamEntries(client, object, objectId, id, latest, action, subjectRef) {
  const query = {
    text: `insert into stream_packed (object_ref, object_ref_id, action, subject_ref, parameter, latest)
           VALUES ($1, $2, $3, $4, $5, $6)`,
    values: [object, Number(objectId), action, subjectRef, JSON.stringify(id), latest]
  };

  console.log("REQUEST:", query);
  await client.query(query);
  console.log("inserted");
}

async function updateExistingPackWithStreamEntries(client, packId, ids) {
  const query = {
    text: `update stream_packed
           set parameter = $1
           where id = $2`,
    values: [JSON.stringify(ids), Number(packId)]
  };

  console.log("REQUEST:", query);
  await client.query(query);
  console.log("updated");
}

async function deleteForEvent(client, eventId, standIds) {
  const query = {
    text: `delete
           from stream_packed
           where object_ref = 'event' and object_ref_id = $1
              or object_ref = 'stand' and object_ref_id = ANY ($2)
           returning *`,
    values: [Number(eventId), standIds]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("deleted", res.rows.length);
}

exports.getPacksForEntity = getPacksForEntity;
exports.getPacksForStreamEntries = getPacksForStreamEntries;
exports.createNewPacksForStreamEntries = createNewPacksForStreamEntries;
exports.updateExistingPackWithStreamEntries = updateExistingPackWithStreamEntries;
exports.deleteForEvent = deleteForEvent;