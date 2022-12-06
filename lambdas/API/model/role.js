const exceptionUtil = require('./exception');
const stringUtils = require('./strings');
const util = require("./util");

async function getRolesByEntityType(client, type) {
  const query = {
    text: 'SELECT * FROM role where name like $1',
    values: [type + '-%']
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("fetched:", res.rows.length);
  if (res.rows.length === 0) {
    return [];
  } else {
    return res.rows;
  }
}

async function getRoleFromDb(client, roleId) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT * FROM role where id = $1',
    values: [Number(roleId)]
  };

  llog.debug("REQUEST getRoleFromDb:", query);
  const res = await client.query(query);
  llog.debug("fetched:", res.rows);
  if (res.rows.length === 0) {
    return null;
  } else {
    return res.rows[0];
  }
}

/**
 * Get role by Id or throw the exception if not found
 * @param client - PG client
 * @param roleId - role if
 * @param language - language for a beautiful role name
 * @returns role, if found. If not - throws ApiException
 */
async function getRoleFromDbOrThrowException(client, roleId, language) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT * FROM role where id = $1',
    values: [Number(roleId)]
  };

  llog.debug("REQUEST getRoleFromDbOrThrowException:", query);
  const res = await client.query(query);
  llog.debug("fetched:", res.rows);
  if (res.rows.length === 0) {
    throw new exceptionUtil.ApiException(405, 'Role does not exist');
  } else {
    const additionalStrings = await stringUtils.getStringsForEntity(client, 'role', res.rows[0]['id'], language);
    res.rows[0]['roleName'] = additionalStrings[0]['value'];
    return res.rows[0];
  }
}

async function getRolesHavingPrivilege(client, privilege) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT id FROM role where grants like $1',
    values: [privilege]
  };

  llog.debug("REQUEST getRolesHavingPrivilege:", query);
  const res = await client.query(query);
  llog.debug("fetched:", res.rows);
  if (res.rows.length === 0) {
    return [];
  } else {
    return res.rows;
  }
}

/**
 * Get grants for a company personnel (excluding owner).
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the person
 * @param eventId - id of the event for which we are checking (if applicable)
 * @param standId - id of the stand for which we are checking (if applicable)
 * @returns array of grants or empty array
 */
async function getMyGrants(client, companyId, userId, eventId, standId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT r.grants, p.event, p.stand, p.company
           FROM personnel p
                    left join role r on p.role = r.id
           where p.person = $1`,
    values: [Number(userId)]
  };

  llog.debug("REQUEST getMyGrants:", query);
  let {rows} = await client.query(query);
  llog.debug("fetched:", rows);

  if (rows.length === 0) {
    return [];
  } else {
    if (companyId) {
      rows = rows.filter(r => r['company'] === Number(companyId));
    }

    if (eventId) {
      rows = rows.filter(r => !r['event'] && !r['stand'] || r['event'] === Number(eventId));
    }

    if (standId) {
      rows = rows.filter(r => !r['event'] && !r['stand'] || r['stand'] === Number(standId));
    }

    const result = new Set()
    for (let r in rows) {
      rows[r]['grants'].forEach(result.add, result)
    }

    llog.debug('grants:', result);

    return [...result];
  }
}

/**
 * Get company grants for a given user.
 * @param client - PG client
 * @param userId - id of the person
 * @returns array of grants or empty array
 */
async function getMyCompanyGrants(client, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT r.grants, p.company, p.event, p.stand
           FROM personnel p
                    left join role r on p.role = r.id
           where p.person = $1
             and event is null
             and stand is null`,
    values: [Number(userId)]
  };

  llog.debug("REQUEST getMyCompanyGrants:", query);
  let {rows} = await client.query(query);
  llog.debug("fetched:", rows);

  if (rows.length === 0) {
    return [];
  } else {
    return rows[0]['grants'];
  }
}

/**
 * Get event grants for a given user.
 * @param client - PG client
 * @param userId - id of the person
 * @param eventId - id of the event
 * @returns array of grants or empty array
 */
async function getMyGrantsForEvent(client, userId, eventId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT r.grants
           FROM personnel p
                    left join role r on p.role = r.id
           where p.person = $1
             and event = $2`,
    values: [Number(userId), Number(eventId)]
  };

  llog.debug("REQUEST getMyGrantsForEvent:", query);
  let {rows} = await client.query(query);
  llog.debug("fetched:", rows);

  if (rows.length === 0) {
    return [];
  } else {
    return rows[0]['grants'];
  }
}

/**
 * Get event grants for a given user.
 * @param client - PG client
 * @param userId - id of the person
 * @param standId - id of the stand
 * @returns array of grants or empty array
 */
async function getMyGrantsForStand(client, userId, standId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT r.grants
           FROM personnel p
                    left join role r on p.role = r.id
           where p.person = $1
             and stand = $2`,
    values: [Number(userId), Number(standId)]
  };

  llog.debug("REQUEST getMyGrantsForStand:", query);
  let {rows} = await client.query(query);
  llog.debug("fetched:", rows);

  if (rows.length === 0) {
    return [];
  } else {
    return rows[0]['grants'];
  }
}

/**
 * Get platform grants for a given user. Platform grants are for platform personnel and lowlevel tasks
 * @param client - PG client
 * @param userId - id of the person
 * @returns array of grants or empty array
 */
async function getMyGrantsForPlatform(client, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT r.grants
           FROM personnel p
                    left join role r on p.role = r.id
           where p.person = $1
             and event is null 
             and stand is null
             and company is null`,
    values: [Number(userId)]
  };

  llog.debug("REQUEST getMyGrantsForPlatform:", query);
  let {rows} = await client.query(query);
  llog.debug("fetched:", rows);

  if (rows.length === 0) {
    return [];
  } else {
    return rows[0]['grants'];
  }
}


exports.getRolesByEntityType = getRolesByEntityType;
exports.getRoleFromDb = getRoleFromDb;
exports.getRoleFromDbOrThrowException = getRoleFromDbOrThrowException;
exports.getRolesHavingPrivilege = getRolesHavingPrivilege;
exports.getMyGrants = getMyGrants;
exports.getMyCompanyGrants = getMyCompanyGrants;
exports.getMyGrantsForEvent = getMyGrantsForEvent;
exports.getMyGrantsForStand = getMyGrantsForStand;
exports.getMyGrantsForPlatform = getMyGrantsForPlatform;
