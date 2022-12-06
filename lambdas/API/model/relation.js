const exceptionUtil = require('./exception');
const util = require('./util');

/**
 * Create arbitrary relation
 * @param client
 * @param {ObjectRef} objectRef - object from
 * @param {ObjectRef} subjectRef - object to
 * @param {string} operation - relation type
 * @param {Object} parameter - JSON parameters for relation
 * @returns {Promise<null|*>}
 */
async function relationCreate(client, objectRef, subjectRef, operation, parameter) {
  const query = {
    text: `INSERT into relation (object_ref, object_ref_id, operation, subject_ref, subject_ref_id, parameter)
           values ($1, $2, $3, $4, $5, $6)
           returning *`,
    values: [objectRef.entity, Number(objectRef.entityId), operation, subjectRef.entity, Number(subjectRef.entityId), parameter]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("created:", res.rows);

  if (res.rows.length) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * check that relation exists
 * @param client
 * @param {ObjectRef} objectRef - object from
 * @param {ObjectRef} subjectRef - object to
 * @param {string} operation - relation type
 * @returns {Promise<boolean>}
 */
async function relationExists(client, objectRef, subjectRef, operation) {
  const query = {
    text: `select 1
           from relation
           where object_ref = $1
             and object_ref_id = $2
             and operation = $3
             and subject_ref = $4
             and subject_ref_id = $5`,
    values: [objectRef.entity, Number(objectRef.entityId), operation, subjectRef.entity, Number(subjectRef.entityId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("created:", res.rows);

  return !!res.rows.length;
}

async function relationGet(client, objectRef, subjectRef, operation) {
  const query = {
    text: `select *
           from relation
           where object_ref = $1
             and object_ref_id = $2
             and operation = $3
             and subject_ref = $4
             and subject_ref_id = $5  LIMIT 1`,
    values: [objectRef.entity, Number(objectRef.entityId), operation, subjectRef.entity, Number(subjectRef.entityId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  if (res.rows.length) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function relationsGetBySubject(client, subjectRef, operation) {
  const query = {
    text: `select *
           from relation
           where operation = $1
             and subject_ref = $2
             and subject_ref_id = $3`,
    values: [operation, subjectRef.entity, Number(subjectRef.entityId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  return res.rows;
}

//======================================================================================
/**
 * get relation data enriched by object naming for sponsorship mentions
 * @param client
 * @param relationId
 * @returns {Promise<*>}
 */
async function getOrThrowException(client, relationId) {
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
           where r.id = $1`,
    values: [Number(relationId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  if (res.rows.length) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(405, 'Relation does not exist');
  }
}

async function updateParameter(client, relationId, parameter) {
  const query = {
    text: `update relation
           set parameter = $2::jsonb
           where id = $1
           returning *`,
    values: [Number(relationId), parameter]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("updated:", res.rows);

  return res.rows.length ? res.rows[0] : null;
}

exports.getOrThrowException = getOrThrowException;
exports.updateParameter = updateParameter;

//version 2 rels
exports.relationCreate = relationCreate
exports.relationExists = relationExists
exports.relationGet = relationGet
exports.relationsGetBySubject = relationsGetBySubject

