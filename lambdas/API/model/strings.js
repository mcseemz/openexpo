const util = require('./util');
const exceptionUtil = require("./exception");

const TYPE_STAND = 'stand';
const TYPE_EVENT = 'event';
const TYPE_COMPANY = 'company';
const TYPE_ACTIVITY = 'activity';
const TYPE_PERSONNEL_INVITATION = 'personnel_invitation';

async function getStringsForEntity(client, entityType, entityId, currentLanguage) {
  const llog = client.log || util.log;

  //get strings for default language
  const query = {
    text: 'SELECT id, category, language, value, is_default from Strings where ref_id = $1 and ref = $2 and is_default = true',
    values: [entityId, entityType]
  };
  
  llog.debug('REQUEST getStringsForEntity: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  let arr = (res.rows.length > 0) ? res.rows : [];

  //apply current language on top of default
  if (currentLanguage) {
    const query = {
      text: 'SELECT * from Strings where ref_id = $1 and ref = $2 and language = $3',
      values: [entityId, entityType, currentLanguage]
    };
    llog.debug('REQUEST getStringsForEntity (apply current language): ', query);
    const updateStrRes = await client.query(query);
    llog.debug(`fetched: ${updateStrRes.rows.length}`);

    if (updateStrRes.rows.length > 0) {
      for (const prop in updateStrRes.rows[0]) {
        if (Object.prototype.hasOwnProperty.call(updateStrRes.rows[0], prop)) {
          arr[prop] = updateStrRes.rows[0][prop];
        }
      }
    }
  }

  return arr;
}

/**
 * get stings for multiple entities of one type
 * @param {Object} client
 * @param {string} entityType
 * @param {number[]} entityIds
 * @param {string} [currentLanguage] e.g. eb_GB
 * @returns {Promise<*|*[]>}
 */
async function getStringsForMultipleEntities(client, entityType, entityIds, currentLanguage) {
  const llog = client.log || util.log;

  //get strings for default language
  const query = {
    text: 'SELECT id, category, language, value, is_default, ref_id from Strings where ref_id = ANY($1::int[]) and ref = $2 and is_default = true',
    values: [entityIds, entityType]
  };

  llog.debug('REQUEST getStringsForMultipleEntities (get strings for default language): ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  let arr = (res.rows.length > 0) ? res.rows : [];

  //overwriting default language with requested
  if (currentLanguage) {
    const query = {
      text: 'SELECT * from Strings where ref_id = ANY($1::int[]) and ref = $2 and language = $3',
      values: [entityIds, entityType, currentLanguage]
    };

    llog.debug('REQUEST getStringsForMultipleEntities (overwriting default language with requested): ', query);
    const updateStrRes = await client.query(query);
    llog.debug(`fetched: ${updateStrRes.rows.length}`);

    if (updateStrRes.rows.length > 0) {
      for (const prop in updateStrRes.rows[0]) {
        if (Object.prototype.hasOwnProperty.call(updateStrRes.rows[0], prop) && arr['ref_id'] === updateStrRes['ref_id']) {
          arr[prop] = updateStrRes.rows[0][prop];
        }
      }
    }
  }

  return arr;
}

async function insertStringForEntity(client, entity, entityId, type, value, language) {
  const llog = client.log || util.log;

  let query = {
    text: 'SELECT * from Strings where ref_id = $1 and ref = $2 and category = $3',
    values: [Number(entityId), entity, type]
  };
  
  llog.debug("REQUEST insertStringForEntity (select default):", query);
  let resForIsDefault = await client.query(query);
  const isDefault = resForIsDefault.rows.length === 0;

  query = {
    text: 'INSERT into Strings(ref, ref_id, category, language, value, is_default) values ($1, $2, $3, $4, $5, $6)',
    values: [entity, entityId, type, language, value, isDefault]
  };

  llog.debug("REQUEST insertStringForEntity (insert new):", query);
  const res = await client.query(query);
  llog.debug('created: ', res.rows[0]);
}

async function createStringsForMaterialInDb(client, materialId, description, fileName, name, language) {
  await insertStringForEntity(client, 'upload', materialId, 'description_long', description, language);
  await insertStringForEntity(client, 'upload', materialId, 'name', fileName, language);

  /*if(name){
    await insertStringForEntity(client, 'upload', materialId, 'description_short', name, language);
  }*/
}

async function insertStringsIntoDB(client, strings) {
  let resultingArr = [];

  for (const s of strings) {
    const llog = client.log || util.log;
    //checking for default value
    let query = {
      text: 'SELECT 1 from Strings where ref_id = $1 and ref = $2 and category = $3',
      values: [s['ref_id'], s['ref'], s['category']]
    };

    llog.debug("REQUEST insertStringsIntoDB (select default):", query);
    let resForIsDefault = await client.query(query);
    const isDefault = resForIsDefault.rows.length === 0;

    //inserting real value
    query = {
      text: `INSERT INTO Strings(ref, ref_id, category, language, value, is_default) 
                VALUES($1, $2, $3, $4, $5, $6)
             ON CONFLICT ON CONSTRAINT strings_uq
                DO UPDATE SET value = $5  RETURNING *`,
      values: [s['ref'], s['ref_id'], s['category'], s['language'], s['value'], isDefault]
    };

    llog.debug('REQUEST insertStringsIntoDB (inserting real value): ', query);
    let res = await client.query(query);
    llog.debug('created: ',  res.rows[0]);
    resultingArr.push(res.rows[0]);
  }

  return resultingArr;
}

async function updateStringsInDB(client, strings) {
  const llog = client.log || util.log;
  let resultingArr = [];

  for (const s of strings) {
    let query = {
      text: 'update Strings set value = $1 where ref = $2 and ref_id = $3 and category = $4 and language = $5 RETURNING *',
      values: [s['value'], s['ref'], s['ref_id'], s['category'], s['language']]
    };
    
    llog.debug('REQUEST updateStringsInDB: ', query);
    let res = await client.query(query);
    llog.debug('updated: ', res.rows[0]);
    resultingArr.push(res.rows[0]);
  }

  return resultingArr;
}

async function deleteStringsRelatedToEntityIfExists(client, entityId, entityType) {
  const llog = client.log || util.log;

  let query = {
    text: 'DELETE FROM strings where ref_id = $1 and ref = $2 returning *',
    values: [Number(entityId), entityType]
  };
  
  llog.debug('REQUEST deleteStringsRelatedToEntityIfExists: ', query);
  const res = await client.query(query);
  llog.debug(`deleted strings: ${res.rows.length}`);
}

async function updateStringIfExists(client, stringsObject) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE strings set value = $1 where id = $2 returning *',
    values: [stringsObject['value'], Number(stringsObject['id'])]
  };

  llog.debug('REQUEST updateStringIfExists: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function getStringByIdOrThrowException(client, stringId) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT * FROM strings where id = $1',
    values: [Number(stringId)]
  };
  
  llog.debug('REQUEST getStringById: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'String not found');
  }
}

async function deleteStringIfExists(client, stringId) {
  const llog = client.log || util.log;
  
  let query = {
    text: 'DELETE FROM strings where id = $1 returning *',
    values: [Number(stringId)]
  };
  
  llog.debug('REQUEST deleteStringIfExists: ', query);
  const res = await client.query(query);
  llog.debug(`deleted strings: ${res.rows.length}`);

  return res.rows.length;
}

exports.getStringsForEntity = getStringsForEntity;
exports.getStringByIdOrThrowException = getStringByIdOrThrowException;
exports.createStringsForMaterialInDb = createStringsForMaterialInDb;
exports.getStringsForMultipleEntities = getStringsForMultipleEntities;
exports.insertStringsIntoDB = insertStringsIntoDB;
exports.updateStringIfExists = updateStringIfExists;
exports.deleteStringsRelatedToEntityIfExists = deleteStringsRelatedToEntityIfExists;
exports.deleteStringIfExists = deleteStringIfExists;
exports.updateStringsInDB = updateStringsInDB;

exports.TYPE_STAND = TYPE_STAND;
exports.TYPE_EVENT = TYPE_EVENT;
exports.TYPE_COMPANY = TYPE_COMPANY;
exports.TYPE_ACTIVITY = TYPE_ACTIVITY;
exports.TYPE_PERSONNEL_INVITATION = TYPE_PERSONNEL_INVITATION;
