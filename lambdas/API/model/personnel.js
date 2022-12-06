const AWS = require('aws-sdk');
const exceptionUtil = require('./exception');
const util = require('./util');
const stringUtils = require("./strings");
const binaryUtil = require("./binary");
const eventUtil = require("./event");
const stringsUtil = require("./strings");

let ses;  //singleton

const PERSONNEL_FIELDS =
  `cp.id as "id",
  COALESCE(cp.name, CONCAT(p.name, ' ', p.surname)) AS name,
  p.address,
  cp.role,
  cp.position,
  cp.assigned_at,
  cp.visible as "public",
  cp.tags`;

const PERSONNEL_FIELDS_EXTENDED =
  `${PERSONNEL_FIELDS},
  cp.status,
  CASE WHEN p.id<0 THEN '' ELSE p.email END as "email",
  cp.stand,
  cp.event,
  cp.company,
  cp.person as "personid"`;

const SELECT_BASIC =
  `SELECT ${PERSONNEL_FIELDS}
   FROM personnel cp
            LEFT JOIN person p ON cp.person = p.id`;

const SELECT_EXTENDED =
  `SELECT ${PERSONNEL_FIELDS_EXTENDED}
   FROM personnel cp
            LEFT JOIN person p ON cp.person = p.id`;

async function createCompanyPersonnelEntry(client, userId, companyId, roleName, position, isPublic = false) {
  return createPersonnelEntry(client, userId, companyId, roleName, null, null, position, isPublic);
}

/**
 * create personnl record for event
 * @param {Object} client
 * @param {number} userId, -1 for fake user
 * @param {number} eventId
 * @param {string} roleName unique role name
 * @param {string} position public user title
 * @param {boolean} isPublic flag if this is public-facing user
 * @param {string|null} name public user name, null if we have real user and want to use a name from their profile
 * @param {string[]} tags personnel tags
 * @param {string} status personnel lifecycle status for future use (tracking consent from real person)
 * @returns {Promise<Object|null>}
 */
async function createEventPersonnelEntry(client, userId, eventId, roleName, position, isPublic = false,
                                         name = null, tags = undefined, status = 'incomplete') {
  return createPersonnelEntry(client, userId, null, roleName, eventId, null, position, isPublic,
    name, tags, status);
}

/**
 * create personnel record for stand
 * @param {Object} client
 * @param {number} userId, -1 for fake user
 * @param {number} standId
 * @param {string} roleName unique role name
 * @param {string} position public user title
 * @param {boolean} isPublic flag if this is public-facing user
 * @param {string|null} name public user name, null if we have real user and want to use a name from their profile
 * @param {string[]} tags personnel tags
 * @param {string} status personnel lifecycle status for future use (tracking consent from real person)
 * @returns {Promise<Object|null>}
 */

async function createStandPersonnelEntry(client, userId, standId, roleName, position, isPublic = false,
                                         name = null, tags = undefined, status = 'incomplete') {
  return createPersonnelEntry(client, userId, null, roleName, null, standId, position, isPublic,
    name, tags, status);
}

async function updateCompanyPersonnelEntry(client, userId, companyId, roleName, position, isPublic = false) {
  return await updatePersonnelEntry(client, {
    text: 'update personnel set role = r.id, position = $2, visible = $3 from role r where r.name LIKE $1 and person = $4 and company = $5 returning *',
    values: [roleName, position || '', isPublic, Number(userId), Number(companyId)]
  });
}

/**
 * fasttrack personnel update
 * @param {Object} client
 * @param {number} personnelId
 * @param {string} roleName
 * @param {string} position
 * @param {boolean} isPublic
 * @param {string|null} name
 * @param {string[]}tags
 * @param {string} status
 * @returns {Promise<void>}
 */
async function updatePersonnelById(client, personnelId, roleName, position, isPublic = false,
                                         name = null, tags = undefined, status = 'incomplete') {
  return await updatePersonnelEntry(client, {
    text: `UPDATE personnel cp SET
                                role = r.id,
                                position = $1,
                                visible = $2,
                                name = COALESCE($3, cp.name),
                                tags = COALESCE($4::jsonb, cp.tags),
                                status = COALESCE($5, cp.status)
            FROM role r, person p 
            WHERE r.name LIKE $6 
            AND cp.id = $7
            AND CASE WHEN cp.person < 0 THEN TRUE ELSE cp.person = p.id END
            RETURNING ${PERSONNEL_FIELDS_EXTENDED}`,
    values: [position || '', isPublic, name, tags ? JSON.stringify(tags) : '[]', status, roleName, Number(personnelId)]
  });
}

/**
 * assign user to personnel. Cannot reassign existing user
 * @param {Object} client
 * @param {number} personnelId
 * @param {number} userId
 */
async function updatePersonnelUserById(client, personnelId, userId) {
  await updatePersonnelEntry(client, {
    text: `UPDATE personnel SET
                person = $2
           WHERE id = $1 and person < 0 RETURNING *`,
    values: [Number(personnelId), Number(userId)]
  });
}

/**
 * universal personnel creation DML
 * @param {Object} client
 * @param {number} userId
 * @param {number|null} companyId
 * @param {string} roleName - name of role (not Id!)
 * @param {number|null} eventId
 * @param {number|null} standId
 * @param {string} position
 * @param {boolean} isPublic
 * @param {string|null} name
 * @param {string[]} tags
 * @param {string} status
 * @returns {Promise<null|Object>} personnel record with created data
 */

async function createPersonnelEntry(client, userId, companyId, roleName,
                                    eventId, standId, position = '', isPublic = false,
                                    name = null, tags = undefined, status = 'incomplete') {
  const llog = client.log || util.log;

  let query = {
    text: `INSERT INTO personnel(person, stand, company, event, platform, role, position, visible, name, tags, status)
           VALUES ($1, $2, $3, $4, $5, (select id from role where name like $6), $7, $8, $9, $10, $11) RETURNING *`,
    values: [Number(userId), standId || null, companyId || null, eventId || null, null, roleName, position || '', isPublic,
      name, tags ? JSON.stringify(tags) : '[]', status]
  };

  llog.debug('REQUEST createPersonnelEntry: ', query);
  let res = await client.query(query);
  llog.info('created: ', res.rows[0]);
  llog.error({idxen: "personnel", idxid: res.rows[0]['id'], idxop:"ins"}); //indexation

  if (res.rows.length === 0) {
    return null;
  } else {
    return res.rows[0];
  }
}

/**
 * update personnel using query from parameter
 * @param {Object} client - database
 * @param {Object} query object for postgres
 * @returns {Promise<*>}
 * @throws 404 if user not found
 */
async function updatePersonnelEntry(client, query) {
  const llog = client.log || util.log;

  llog.debug('REQUEST updatePersonnelEntry: ', query);
  let res = await client.query(query);
  llog.info(`updated: ${res.rows.length}`);

  for (let i in res.rows) {
    llog.error({idxen: "personnel", idxid: res.rows[i]['id'], idxop: "upd"}); //indexation
  }

  if (res.rows.length) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'User is not assigned');
  }
}

//remove personnel ----------------------------
/**
 * delete personnel record and all related: strings and branding
 * @param {Object} client with initialized log and uploadsBucket
 * @param {number} personnelId personnel to delete
 * @returns {Promise<* | number>}
 */
async function deletePersonnelById(client, personnelId) {
  const llog = client.log || util.log;

  let query = {
    text: 'delete from personnel where id = $1 returning id',
    values: [Number(personnelId)]
  };

  llog.debug('REQUEST deletePersonnelById: ', query);
  let res = await client.query(query);
  llog.info(`deleted: ${res.rows.length}`);

  for (let i in res.rows) {
    llog.error({idxen: "personnel", idxid: res.rows[i]['id'], idxop: "del"}); //indexation
  }

  for (let i in res.rows) {
    //delete strings
    await stringUtils.deleteStringsRelatedToEntityIfExists(client, res.rows[i]['id'], 'personnel');
    //delete binaries
    await binaryUtil.deleteBinariesForRefEntity(client, 'branding', 'personnel', res.rows[i]['id'], client.uploadsBucket);
  }

  return res.rows.length;
}


async function removePersonnelFromCompanyOrThrowException(client, userId, companyId) {
  const llog = client.log || util.log;

  let query = {
    text: 'delete from personnel where person = $1 and company = $2 returning id',
    values: [Number(userId), Number(companyId)]
  };

  llog.debug('REQUEST removePersonnelFromCompanyOrThrowException: ', query);
  let res = await client.query(query);
  llog.info('deleted: ', res.rows[0]);

  for (let i in res.rows) {
    llog.error({idxen: "personnel", idxid: res.rows[i]['id'], idxop: "del"}); //indexation
  }

  if (res.rows.length > 0) {
    return res.rows.length;
  } else {
    throw new exceptionUtil.ApiException(404, 'User is not a member of the company');
  }
}

async function removePersonnelFromStand(client, userId, standId) {
  const llog = client.log || util.log;

  let query = {
    text: 'delete from personnel where person = $1 and stand = $2 returning *',
    values: [Number(userId), Number(standId)]
  };

  llog.debug('REQUEST removePersonnelFromStand: ', query);
  let res = await client.query(query);
  llog.info(`deleted: ${res.rows.length}`);

  for (let i in res.rows) {
    llog.error({idxen: "personnel", idxid: res.rows[i]['id'], idxop: "del"}); //indexation
  }

  return res.rows.length;
}

//assign with role ----------------------------

async function assignUserToCompanyWithParameters(client, userId, companyId, roleName, position = '', isPublic = false) {
  const llog = client.log || util.log;

  let query = {
    text: 'select count(*) from personnel where person = $1 and company = $2',
    values: [Number(userId), Number(companyId)]
  };

  llog.debug('REQUEST assignUserToCompanyWithParameters: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (Number(res.rows[0]['count']) !== 0) {
    llog.debug("User is already assigned to the stand. Updating role");
    await updateCompanyPersonnelEntry(client, userId, companyId, roleName, position, isPublic);

  } else {
    llog.debug("Assigning user to the company with a role");
    await createCompanyPersonnelEntry(client, userId, companyId, roleName, position, isPublic);
  }
}

/**
 *
 * @param {Object} client postgres client
 * @param {Number} userId user id, -1 if user is not bound to any real person (no email)
 * @param {Number} eventId event id
 * @param {string} roleName name(!) of role
 * @param {string} position
 * @param {boolean} isPublic
 * @param {string|null} name
 * @param {string[]} tags
 * @param {string} status
 * @returns {Promise<void>}
 */
async function assignUserToEventWithParameters(client, userId, eventId, roleName, position = '',
                                               isPublic = false, name = null, tags = undefined, status = 'incomplete') {
  const llog = client.log || util.log;

  if (userId > 0) {
    let query = {
      text: 'select id from personnel where person = $1 and event = $2',
      values: [Number(userId), Number(eventId)]
    };

    llog.debug('REQUEST assignUserToEventWithParameters: ', query);
    const res = await client.query(query);
    llog.debug(`fetched: ${res.rows.length}`);

    if (res.rows.length > 0) {
      llog.debug("User is already assigned to the event. Updating data");
      return await updatePersonnelById(client, res.rows[0]['id'], roleName, position, isPublic, name, tags, status);
    } else {
      llog.debug("Assigning user to an event with a data");
      return await createEventPersonnelEntry(client, userId, eventId, roleName, position, isPublic, name, tags, status);
    }
  } else {  //fake user
    llog.debug("Assigning fake user to an event with a data");
    return await createEventPersonnelEntry(client, userId, eventId, roleName, position, isPublic, name, tags, status);
  }

}

async function assignUserToStandWithParameters(client, userId, standId, roleName, position = '', isPublic = false,
                                               name = null, tags = undefined, status = 'incomplete') {
  const llog = client.log || util.log;

  if (userId > 0) {
    let query = {
      text: 'select id from personnel where person = $1 and stand = $2',
      values: [Number(userId), Number(standId)]
    };

    llog.debug('REQUEST assignUserToStandWithParameters: ', query);
    const res = await client.query(query);
    llog.debug(`fetched: ${res.rows.length}`);

    if (res.rows.length > 0) {
      llog.debug("User is already assigned to the stand. Updating data");
      return await updatePersonnelById(client, res.rows[0]['id'], roleName, position, isPublic, name, tags, status);
    } else {
      llog.debug("Assigning user to the stand with a data");
      return await createStandPersonnelEntry(client, userId, standId, roleName, position, isPublic, name, tags, status);
    }
  } else {  //fake user
    llog.debug("Assigning fake user to an event with a data");
    return await createStandPersonnelEntry(client, userId, standId, roleName, position, isPublic, name, tags, status);
  }
}

//get personnel -------------------------------------------

/**
 * return company personnel filtered by role id and person name/surname
 * @param {Object} client database client
 * @param {int} companyId company id to search in
 * @param {int} roleId role id to filter with
 * @param {String} searchStr - substring to search in person name/surname
 * @returns {Promise<*[]|*>}
 */
async function getPersonnelForCompany(client, companyId, roleId, searchStr) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_BASIC}
           WHERE cp.company = $1
             AND (COALESCE(cp.name, CONCAT(p.name, ' ', p.surname)) ILIKE $2)
             AND cp.stand IS null
             AND cp.event IS null`,
    values: [Number(companyId), '%' + searchStr + '%']
  };

  llog.debug('REQUEST getPersonnelForCompany: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length !== 0) {
    return roleId
      ? res.rows.filter(p => p.role === Number(roleId))
      : res.rows;

  } else {
    return [];
  }
}

/**
 *
 * @param client
 * @param eventId event
 * @param roleId filter by role
 * @param searchStr filter by name
 * @param isPublic filter by publicity
 * @param isExtended whould we use extended parameter set
 * @returns {Promise<Object[]>}
 */
async function getPersonnelForEvent(client, eventId, roleId, searchStr, isPublic, isExtended = false) {
  const llog = client.log || util.log;

  let query = {
    text: `${isExtended ? SELECT_EXTENDED : SELECT_BASIC}
           WHERE cp.event = $1
             AND (COALESCE(cp.name, CONCAT(p.name, ' ', p.surname)) ILIKE $2)`,
    values: [Number(eventId), '%' + searchStr + '%']
  };

  llog.debug('REQUEST getPersonnelForEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  let rows = res.rows;
  if (rows.length !== 0 && roleId) {
    rows = rows.filter(p => p.role === Number(roleId));
  }

  if (rows.length !== 0 && typeof isPublic !== 'undefined') {
    rows = rows.filter(p => p.public === !!isPublic);
  }

  return rows.length !== 0 ? rows : [];
}

async function getPersonnelForStand(client, standId, roleId, searchStr, isPublic, isExtended = false) {
  const llog = client.log || util.log;

  let query = {
    text: `${isExtended ? SELECT_EXTENDED : SELECT_BASIC}
           WHERE cp.stand = $1
             AND (COALESCE(cp.name, CONCAT(p.name, ' ', p.surname)) ILIKE $2)`,
    values: [Number(standId), '%' + searchStr + '%']
  };

  llog.debug('REQUEST getPersonnelForStand: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  let rows = res.rows;
  if (rows.length !== 0 && roleId) {
    rows = rows.filter(p => p.role === Number(roleId));
  }

  if (rows.length !== 0 && typeof isPublic !== 'undefined') {
    rows = rows.filter(p => p.public === !!isPublic);
  }

  return rows.length !== 0 ? rows : [];
}

//get person data from personnel -----------------------
/**
 * get person parameters for stand personnel
 * @param {Object} client
 * @param {number} standId
 * @param {number} userId
 * @returns {Promise<*>}
 */
async function getPersonnelParametersForStand(client, standId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_EXTENDED}
           WHERE cp.stand = $1
             AND cp.person = $2`,
    values: [Number(standId), Number(userId)]
  };

  llog.debug('REQUEST getPersonnelParametersForStand: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiError(exceptionUtil.NotFound, 'Personnel parameters not found');
    // throw new exceptionUtil.ApiException(404, 'Personnel parameters not found');
  }
}

/**
 * get person parameters for stand personnel
 * @param {Object} client
 * @param {number} eventId
 * @param {number} userId
 * @returns {Promise<*>}
 */
async function getPersonnelParametersForEvent(client, eventId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_EXTENDED}
           WHERE cp.event = $1
             AND cp.person = $2`,
    values: [Number(eventId), Number(userId)]
  };

  llog.debug('REQUEST getPersonnelParametersForEvent: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    //throw new exceptionUtil.ApiException(404, 'Personnel parameters not found');
    throw new exceptionUtil.ApiError(exceptionUtil.NotFound, 'Personnel parameters not found');
  }
}

//is in personnel -----------------------
/**
 * Check if the user is in specific company personnel
 * @param {Object} client - PG client
 * @param {number} companyId - id of the company
 * @param {number} userId - id of the person to check
 * @returns true - if user is in company, false - otherwise.
 */
async function isInCompanyPersonnel(client, companyId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `select id
           from personnel
           where company = $1
             and person = $2`,
    values: [Number(companyId), Number(userId)]
  };

  llog.debug('REQUEST isInCompanyPersonnel: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length !== 0;
}

/**
 * Check if the user is in specific company personnel
 * @param {Object} client - PG client
 * @param {number} eventId - id of the event
 * @param {number} userId - id of the person to check
 * @returns true - if user is in the event, false - otherwise.
 */
async function isInEventPersonnel(client, eventId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `select id
           from personnel
           where event = $1
             and person = $2`,
    values: [Number(eventId), Number(userId)]
  };

  llog.debug('REQUEST isInEventPersonnel: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length !== 0;
}

/**
 * Check if the user is in specific stand personnel
 * @param {Object} client - PG client
 * @param {number} standId - id of the stand
 * @param {number} userId - id of the person to check
 * @returns {boolean} true - if user is in the stand, false - otherwise.
 */
async function isInStandPersonnel(client, standId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `select id
           from personnel
           where stand = $1
             and person = $2`,
    values: [Number(standId), Number(userId)]
  };

  llog.debug('REQUEST isInStandPersonnel: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length !== 0;
}

/**
 * Check if the user is in specific stand personnel, marked as public person
 * @param {Object} client - PG client
 * @param {number} standId - id of the stand
 * @param {number} userId - id of the person to check
 * @returns {boolean} true - if user is in the stand, false - otherwise.
 */
async function isInPublicStandPersonnel(client, standId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `select id
           from personnel
           where stand = $1
             and person = $2
             and visible = true`,
    values: [Number(standId), Number(userId)]
  };

  llog.debug('REQUEST isInPublicStandPersonnel: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length !== 0;
}
//company-specific -------------------------------------

/**
 * get company personnel positions
 * @param {Object} client database
 * @param {int} companyId
 * @param {Array} ids list of user ids to fetch, comma-separated
 * @returns {Promise<*[]|*>}
 */
async function getCompanyPersonnelPositions(client, companyId, ids) {
  const llog = client.log || util.log;

  let query = {
    text: `select p.id, cp.position
           from personnel cp
                    left join person p on cp.person = p.id
           where cp.company = $1
             and cp.event is null
             and cp.stand is null
             and person = ANY ($2)`,
    values: [Number(companyId), ids]
  };

  llog.debug('REQUEST getCompanyPersonnelPositions: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length !== 0) {
    return res.rows;
  } else {
    return [];
  }
}


/**
 * Gets user's company if he is in company personnel. Or -1 otherwise
 * @param client - PG client
 * @param userId - id of the person to check
 * @returns id of the company - if user is in company, -1 - otherwise.
 */
async function getCompanyAsAPersonnel(client, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `select company
           from personnel
           where person = $1
             and company is not null
           limit 1`,
    values: [Number(userId)]
  };

  llog.debug('REQUEST getCompanyAsAPersonnel: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (res.rows.length !== 0) ? res.rows[0]['company'] : -1;
}

async function assertUserIsInEventPersonnel(client, eventId, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `select 1
           from personnel
           where event = $1
             and person = $2
           limit 1`,
    values: [Number(eventId), Number(userId)]
  };

  llog.debug('REQUEST assertUserIsInEventPersonnel: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (!res.rows.length) {
    throw new exceptionUtil.ApiException(403, 'User is not allowed to view this content');
  }
}

//get personnel details by id -----------------------
/**
 * get personnel details by id
 * @param {Object} client
 * @param {number} personnelId
 * @param {boolean} hydrate
 * @param {string} [language]
 * @returns {Promise<*>}
 */
async function getPersonnelById(client, personnelId, hydrate = false, language) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_EXTENDED}
           WHERE cp.id = $1`,
    values: [Number(personnelId)]
  };

  llog.debug('REQUEST getPersonnelById: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    if (hydrate) {  //adding strings and branding
      res.rows[0]['strings'] = await stringUtils.getStringsForEntity(client, 'personnel', res.rows[0]['id'], language);
      res.rows[0]['branding'] = await binaryUtil.getBrandingMaterialsForPersonnel(client, res.rows[0]['id'], language);
    }
    return res.rows[0];
  } else {
    return null;
  }
}

async function getPersonnelPublicForEventAndTags(client, eventId, tags) {
  return getPersonnelForTags(client, eventId, null, tags, null, true);
}

async function getPersonnelPublicForStandAndTags(client, standId, tags) {
  return getPersonnelForTags(client, null, standId, tags, null, true);
}

/**
 * get personnel related to collection by event and tags
 * @param {Object} client - database
 * @param {number|null} [eventId] - event id
 * @param {number|null} [standId] - stand id
 * @param {string[]} tags - tags
 * @param {number|null} [roleId] - id of role of personnel
 * @param {Boolean} [isPublic] - personnel property is it public
 * @returns {Promise<Object[]>}
 */
async function getPersonnelForTags(client, eventId, standId, tags, roleId, isPublic) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_BASIC}
           WHERE
             CASE
                 WHEN $1::int IS NULL THEN cp.event IS NULL
                 ELSE cp.event = $1::int END
             AND CASE
                 WHEN $2::int IS NULL THEN cp.stand IS NULL
                 ELSE cp.stand = $2::int END
             AND p.tags @> $2::jsonb`,
    values: [eventId ? Number(eventId) : null, standId ? Number(standId) : null, tags]
  };

  llog.debug('REQUEST getPersonnelForTags: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  let rows = res.rows;
  if (rows.length !== 0 && roleId) {
    rows = rows.filter(p => p.role === Number(roleId));
  }

  if (rows.length !== 0 && typeof isPublic !== 'undefined') {
    rows = rows.filter(p => p.public === !!isPublic);
  }

  return rows.length !== 0 ? rows : [];
}

/**
 * send registration email to user
 * @param client
 * @param {string} shortDomain
 * @param {Object} data
 * @param {number} eventId
 * @param {number} userId
 * @param {string} emailAlias
 * @param {string} sender
 * @returns {Promise<void>}
 */
async function sendRegisterEmail(client, shortDomain, data, eventId, userId, emailAlias, sender) {
  if (!ses) {
    ses = new AWS.SES({apiVersion: '2010-12-01'});
  }

  //get event object
  const event = await eventUtil.getEventFromDb(client, eventId, userId);
  const eventNameString = await stringsUtil.getStringsForEntity(client, 'event', eventId, data['language']);
  const name = eventNameString.find(s => s['category'] === 'name')['value'];

  const dateStart = new Date(event['dateStart']).toDateString();
  const dateEnd = new Date(event['dateEnd']).toDateString();

  //if this is stand, we should get direct URL for stand management
  let manageURL = `https://${shortDomain}`;
  let guestURL = `https://${shortDomain}`;
  let standName;
  if (data['type'] === 'stand') {
    const standNameString = await stringsUtil.getStringsForEntity(client, 'stand', data['typeId'], data['language']);
    standName = standNameString.find(s => s['category'] === 'name')['value'];

    manageURL += '/edit-stand/';
    guestURL += '/stand/';
  } else {
    manageURL += '/edit-event/';
    guestURL += '/event/';
  }

  manageURL += data['typeId'] + `?auth=challenge&email=${emailAlias}`;
  guestURL += data['typeId'] + `?auth=challenge&email=${emailAlias}`;

  const params = {
    "Source": sender,
    "Template": data['type'] === 'stand' ? "standExternalUserInvitation3" : "eventExternalUserInvitation3",
    "Destination": {
      "ToAddresses": [data['userEmail']
      ]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: data['type'] === 'stand' ? "standExternalUserInvitation" : "eventExternalUserInvitation"
      },
    ],
    "TemplateData": `{ "url": "", "name": "${name}", "standName": "${standName}", "manageURL": "${manageURL}", "guestURL": "${guestURL}",
        "dateStart": "${dateStart}", "dateEnd": "${dateEnd}" }`
  }

  await ses.sendTemplatedEmail(params).promise();
}

/**
 * unregister user from event
 * @param client
 * @param {string} sender
 * @param {number} eventId
 * @param {string} targetEmail
 * @param {number} userId user to unregister
 * @returns {Promise<void>}
 */
async function sendUnregisterEmail(client, sender, eventId, targetEmail, userId) {
  if (!ses) {
    ses = new AWS.SES({apiVersion: '2010-12-01'});
  }

  let event = await eventUtil.getEventFromDb(client, eventId, userId);
  event['strings'] = await stringsUtil.getStringsForEntity(client, 'event', event['id']);

  let eventName = event['strings'].find(s => s['category'] === 'name');
  eventName = eventName ? eventName['value'] : 'No name specified';

  const params = {
    "Source": sender,
    "Template": "CompanyPersonnelUnassignFromEvent",
    "Destination": {
      "ToAddresses": [targetEmail]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: 'CompanyPersonnelUnassignFromEvent'
      },
    ],
    "TemplateData": `{"event": "${eventName}", "reason": "   " }`
  }

  await ses.sendTemplatedEmail(params).promise();
}

/**
 * find all personnelIds for this person on specified event
 * @param {Object} client
 * @param {number} userId
 * @param {number} eventId
 * @returns {Promise<*|*[]>}
 */
async function findMembershipOnEvent(client, userId, eventId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT personnel.id FROM personnel
        LEFT JOIN stand s on personnel.stand = s.id
        LEFT JOIN event e on personnel.event = e.id
        WHERE (e.id = $1  OR s.event = $1) AND person = $2`,
    values: [Number(eventId), Number(userId)]
  };

  llog.debug('REQUEST findMembershipOnEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length !== 0 ? res.rows : [];
}

//company
exports.assignUserToCompanyWithParameters = assignUserToCompanyWithParameters;
exports.getPersonnelForCompany = getPersonnelForCompany;
exports.removePersonnelFromCompanyOrThrowException = removePersonnelFromCompanyOrThrowException;
exports.isInCompanyPersonnel = isInCompanyPersonnel;
exports.getCompanyPersonnelPositions = getCompanyPersonnelPositions;
exports.getCompanyAsAPersonnel = getCompanyAsAPersonnel;

//event
exports.assignUserToEventWithParameters = assignUserToEventWithParameters;
exports.getPersonnelForEvent = getPersonnelForEvent;
exports.getPersonnelParametersForEvent = getPersonnelParametersForEvent;
exports.isInEventPersonnel = isInEventPersonnel;
exports.assertUserIsInEventPersonnel = assertUserIsInEventPersonnel;

//stand
exports.assignUserToStandWithParameters = assignUserToStandWithParameters;
exports.getPersonnelForStand = getPersonnelForStand;
exports.getPersonnelParametersForStand = getPersonnelParametersForStand;
exports.removePersonnelFromStand = removePersonnelFromStand;
exports.isInStandPersonnel = isInStandPersonnel;
exports.isInPublicStandPersonnel = isInPublicStandPersonnel;

//general
exports.getPersonnelById = getPersonnelById;
exports.deletePersonnelById = deletePersonnelById;
exports.updatePersonnelById = updatePersonnelById;
exports.updatePersonnelUserById = updatePersonnelUserById;

exports.getPersonnelPublicForEventAndTags = getPersonnelPublicForEventAndTags;
exports.getPersonnelPublicForStandAndTags = getPersonnelPublicForStandAndTags;

exports.sendRegisterEmail = sendRegisterEmail;
exports.sendUnregisterEmail = sendUnregisterEmail;

exports.findMembershipOnEvent = findMembershipOnEvent;

