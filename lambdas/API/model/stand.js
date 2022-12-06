/**
 *  @description Stands module
 *  @class standUtil
 */
const stringUtils = require('./strings');
const binaryUtil = require('./binary');
const roleUtil = require('./role');
const exceptionUtil = require('./exception');
const util = require('./util');
const stringUtil = require("./strings");
const validator = require('./validation');

const STAND_FIELDS =
  `s.id,
  s.event      as "eventId",
  s.company,
  s.status,
  s.tags,
  s.language,
  s.video,
  s.parameter,
  s.custom_name  as "customName"`;

/**
 * hydrate stand data with additional info: user grants
 * @param {Object} client - database
 * @param {Object} res - return from event select
 * @param [userId] - optional userid to get grants
 * @returns {Promise<*>} - hydrated res
 */
async function hydrateStand(client, res, userId) {
  if (res.rows.length === 0) {
    return null;
  }

  if (userId) {
    for (let i in res.rows) {
      res.rows[i]['grants'] = await roleUtil.getMyGrantsForStand(client, userId, res.rows[i]['id']);
    }
  }

  return res.rows;
}

async function getStandCountForEvent(client, eventId) {
  const llog = client.log || util.log;
  const query = {
    text: "SELECT count(*) from Stand where event = $1",
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getStandCountForEvent: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? res.rows[0]['count'] : 0;
}

async function getStandCountForMultipleEvents(client, eventIds) {
  const llog = client.log || util.log;
  const query = {
    text: "SELECT event, count(*) from Stand where event = ANY ($1) group by event",
    values: [eventIds]
  };

  llog.debug('REQUEST getStandCountForMultipleEvents: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 *
 * @param {Object} client PG client
 * @param {number|String} standId id of the stand or custom name
 * @param {number} [userId] id of the user
 * @returns {Promise<null|*>} stand object
 */
async function getStandFromDb(client, standId, userId) {
  const llog = client.log || util.log;
  
  const searchColumnName = validator.isNumber(standId) ? 'id' : 'custom_name';
  const query = {
    text: `SELECT ${STAND_FIELDS} 
      from Stand s where s.${searchColumnName} = $1`,
    values: [standId]
  };

  llog.debug('REQUEST getStandFromDb: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return (await hydrateStand(client, res, userId))[0];
  } else {
    return null;
  }
}

/**
 * Get stand from DB and if not found, throw the ApiException
 * @param {Object} client PG client
 * @param {number|String} standId id of the stand or custom name
 * @param {number} [userId] id of the user
 * @returns {Promise<null|*>} stand object
 */
async function getStandFromDbOrThrowException(client, standId, userId) {
  const llog = client.log || util.log;

  const searchColumnName = validator.isNumber(standId) ? 'id' : 'custom_name';
  const query = {
    text: `SELECT ${STAND_FIELDS} 
      from Stand s where s.${searchColumnName} = $1`,
    values: [standId]
  };

  llog.debug('REQUEST getStandFromDbOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return (await hydrateStand(client, res, userId))[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Stand not found');
  }
}

/**
 * get all stands for a person. Checked by personnel attribution
 * @param {Object} client database client
 * @param {number} companyId - obsolete, not used
 * @param {string} category - taken from tags
 * @param {string} type featired/regular/all
 * @param {number} userId person id
 * @returns {Promise<*[]|*>}
 */
async function getOwnStands(client, category, type, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${STAND_FIELDS} 
           from stand s
                    left join Event e
                              on e.id = s.event
                    left join Personnel p on s.id = p.stand
           where (jsonb_array_length($1::jsonb)=0 or s.tags @> $1::jsonb)
             and p.person = $3
             and CASE
                     WHEN $2 = 'featured' THEN (s.tags ?| ARRAY['is:featured'] or e.tags ?| ARRAY['is:featured'])
                     WHEN $2 = 'regular' THEN (not s.tags ?| ARRAY['is:featured'] and not e.tags ?| ARRAY['is:featured'])
                     ELSE true END;`,
    values: [category ? JSON.stringify(['category:' + category]) : '[]', type, Number(userId)]
  };

  llog.debug('REQUEST getOwnStands: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (await hydrateStand(client, res, userId)) || [];
}

async function getStandsForEvent(client, eventId, searchStr, industry, company, type, status, userId) {
  const llog = client.log || util.log;
  const query = {
    text: `SELECT DISTINCT ${STAND_FIELDS} 
           from strings str
                    left join stand s
                              on s.id = str.ref_id
           where str.ref = 'stand'
             and s.event = $1
             and str.value ilike $2
             and (jsonb_array_length($3::jsonb)=0 or s.tags @> $3::jsonb)
             and CASE
                     WHEN $4 < 1 THEN true
                     ELSE s.company = $4 END
             and CASE
                     WHEN $5 = 'featured' THEN s.tags ?| ARRAY['is:featured']
                     WHEN $5 = 'regular' THEN not s.tags ?| ARRAY['is:featured']
                     ELSE true END;`,
    values: [Number(eventId), '%' + searchStr + '%', industry ? JSON.stringify(['industry:' + industry]): '[]', company, type]
  };

  llog.debug('REQUEST getStandsForEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);
  //filter for status
  res.rows = res.rows.filter(x => ((status==='all') || (status===x['status'])));
  return (await hydrateStand(client, res, userId)) || [];
}

async function getCompanyStandsForEvent(client, eventId, companyId, userId) {
  const llog = client.log || util.log;
  const query = {
    text: `SELECT ${STAND_FIELDS} 
      from Stand s 
      where s.event = $1 and s.company = $2`,
    values: [Number(eventId), Number(companyId)]
  };

  llog.debug('REQUEST getCompanyStandsForEvent: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (await hydrateStand(client, res, userId)) || [];
}

/**
 * create new record in Stand table
 * @param {Object} client PG client
 * @param {Number} company id of the company
 * @param {Number} eventId event id
 * @param {String} language stand language
 * @param {Number} userId id of the user
 * @param {String} customName custom name for stand identity
 * @param {String[]} tags 
 * @param {String} status 
 * @param {String} video 
 * @param {String} parameter 
 * @returns  {Promise<Object>} newly created record
 */
async function createStandInDb(client, company, eventId, language, userId, customName, tags, status, video, parameter) {
  const llog = client.log || util.log;
  let query = {
    text: 'INSERT INTO Stand(company, event, language, status, tags, video, parameter, custom_name) VALUES($1, $2, $3, $4, $5::jsonb, $6, $7, $8) RETURNING *',
    values: [company ? Number(company) : null, Number(eventId),
      language || null, status || 'draft', JSON.stringify(tags) || '[]', video || '', parameter || {}, customName]
  };

  llog.debug('REQUEST createStandInDb: ', query);
  let res = await client.query(query);
  llog.info('created: ', res.rows[0]);
  llog.error({idxen: "stand", idxid: res.rows[0]['id'], idxop:"ins"}); //indexation

  return await getStandFromDb(client, res.rows[0]['id'], userId);
}

/**
 * update stand by params object
 * @param {Object} client - database
 * @param {Object} params set of parameters for stand.
 * @param userId
 * @returns {Promise<*>}
 */
async function updateStandInDbOrThrowException(client, params, userId) {
  const llog = client.log || util.log;
  
  let query = {
    text: 'UPDATE stand SET language = $1, status = $2, tags = $3::jsonb, video = $4, parameter = $5, custom_name =  $6 WHERE id = $7 RETURNING *',
    values: [params['language'], params['status'] || null, JSON.stringify(params['tags']) || '[]',
      params['video'] || '', params['parameter'], params['customName'], Number(params['id'])]
  };

  llog.debug('REQUEST updateStandInDbOrThrowException: ', query);
  let res = await client.query(query);
  llog.info('updated: ', res.rows[0]);
  llog.error({idxen: "stand", idxid: res.rows[0]['id'], idxop:"upd"}); //indexation

  return getStandFromDbOrThrowException(client, res.rows[0]['id'], userId);
}

async function populateStandsWithAdditionalData(client, stands, language) {
  if (stands.length === 0) {
    return;
  }
  const standIds = stands.map(e => e['id']);
  const additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'stand', standIds, language);

  if (additionalStrings != null) {
    stands.forEach((s) => {
      s['strings'] = additionalStrings.filter(str => str['ref_id'] === s['id']);
      s['strings'].forEach(str => delete str['ref_id']);
    });
  }

  const allMaterials = await binaryUtil.getBinariesForMultipleCoreEntities(client, null, standIds, 'binary', true, language);
  stands.forEach((s) => {
    s['standMaterials'] = allMaterials.filter(m => m['stand'] === s['id']);
  });

  const allBranding = await binaryUtil.getBinariesForMultipleCoreEntities(client, null, standIds, 'branding', true, language);
  stands.forEach((s) => {
    s['branding'] = allBranding.filter(m => m['stand'] === s['id']);
  });
}

async function updateStandStatus(client, standId, newStatus, userId) {
  const llog = client.log || util.log;
  let query = {
      text: 'UPDATE stand SET status = $1 WHERE id = $2 RETURNING 1',
      values: [newStatus, Number(standId)]
    };


  llog.debug('REQUEST updateStandStatus: ', query);
  let res = await client.query(query);
  llog.info(`updated:  ${res.rows.length}`);

  llog.error({idxen: "stand", idxid: standId, idxop:"upd"}); //search indexation

  //retrieve updated
  if (res.rows.length > 0) {
    return getStandFromDb(client, standId, userId);
  }
}

async function standExistsInDb(client, standId) {
  const llog = client.log || util.log;
  const query = {
    text: 'SELECT id from Stand where id = $1',
    values: [Number(standId)]
  };

  llog.debug('REQUEST standExistsInDb: ', query);
  const res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length !== 0;
}

async function numberOfStandsForEvent(client, eventId) {
  const llog = client.log || util.log;
  let query = {
    text: 'SELECT count(*) as "count" from Stand where event = $1',
    values: [Number(eventId)]
  };

  llog.debug("REQUEST numberOfStandsForEvent:", query);
  const standRes = await client.query(query);
  llog.debug("selected:", standRes);

  return standRes.rows[0]['count'];
}

async function getStandIdsForEvent(client, eventId) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT id from Stand where event = $1',
    values: [Number(eventId)]
  };

  llog.debug("REQUEST getStandIdsForEvent:", query);
  const res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);
  return res.rows.map(r => r['id']);
}

/**
 * get stands by event and tags
 * @param {Object} client - database
 * @param {number} eventId - collection id
 * @param {string[]} tags - array of tags
 * @param {string} type - featured|regular
 * @param {string} status - stand status
 * @param {number} [userId] - id of user
 * @returns {Promise<Object[]>}
 */
async function getStandsForEventAndTags(client, eventId, tags, type, status,
                                        userId, language) {
  const llog = client.log || util.log;
  const query = {
    text: `SELECT DISTINCT ${STAND_FIELDS} 
           from strings str
                    left join stand s
                              on s.id = str.ref_id
           where str.ref = 'stand'
             and s.event = $1
             and s.tags @> $2::jsonb
             and CASE
                     WHEN $3 = 'featured' THEN s.tags ?| ARRAY['is:featured']
                     WHEN $3 = 'regular' THEN not s.tags ?| ARRAY['is:featured']
                     ELSE true END;`,
    values: [Number(eventId), JSON.stringify(tags) || '[]',  type]
  };

  llog.debug('REQUEST getStandsForEventAndTags: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);
  //filter for status
  res.rows = res.rows.filter(x => ((status==='all') || (status===x['status'])));

  //add strings
  if (res.rows.length > 0) {
    const allIds = res.rows.map(e => e['id']);
    const additionalStrings = await stringUtil.getStringsForMultipleEntities(client, 'stand', allIds, language);

    if (additionalStrings != null) {
      res.rows.forEach((upl) => {
        upl['strings'] = additionalStrings.filter(s => s['ref_id'] === upl['id']);
        upl['strings'].forEach(s => delete s['ref_id']);
      });
    }
  }

  return (await hydrateStand(client, res, userId)) || [];
}

exports.getStandFromDb = getStandFromDb;
exports.createStandInDb = createStandInDb;
exports.getOwnStands = getOwnStands;
exports.getStandsForEvent = getStandsForEvent;
exports.populateStandsWithAdditionalData = populateStandsWithAdditionalData;
exports.updateStandInDbOrThrowException = updateStandInDbOrThrowException;
exports.updateStandStatus = updateStandStatus;
exports.standExistsInDb = standExistsInDb;
exports.numberOfStandsForEvent = numberOfStandsForEvent;
exports.getCompanyStandsForEvent = getCompanyStandsForEvent;
exports.getStandIdsForEvent = getStandIdsForEvent;
exports.getStandFromDbOrThrowException = getStandFromDbOrThrowException;
exports.getStandCountForEvent = getStandCountForEvent;
exports.getStandCountForMultipleEvents = getStandCountForMultipleEvents;
exports.getStandsForEventAndTags = getStandsForEventAndTags;
