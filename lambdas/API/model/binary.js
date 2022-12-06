/**
 *  @description Binaries module
 *  @class eventUtil
 */
const AWS = require('aws-sdk');
const mime = require('mime-types');
const util = require('./util');
const stringUtil = require('./strings');
const exceptionUtil = require('./exception');
const eventUtil = require('./event');
const standUtil = require('./stand');

const s3 = new AWS.S3({signatureVersion: 'v4'});

const STATUS_STUB = 'stub';
const CATEGORY_BINARY = 'binary';

async function getMaterialByIdOrThrowException(client, materialId) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT * FROM binaries where id = $1',
    values: [Number(materialId)]
  };
  
  llog.debug('REQUEST getMaterialByIdOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Material not found');
  }
}

async function getMaterialByUrlOrThrowException(client, materialUrl, silent) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT * FROM binaries where url = $1',
    values: [materialUrl]
  };
  
  llog.debug('REQUEST getMaterialByUrlOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    if (!silent) {
      throw new exceptionUtil.ApiException(404, 'Material not found');
    }
  }
}

/**
 * hydrate fetched 'upload' objects with strings
 * @param {Object[]} rows
 * @param {Object} client
 * @param {string} [language]
 * @returns {Promise<void>}
 */
async function hydrateStrings(client, rows, language) {
  const uploadIds = rows.map(e => e['id']);
  const additionalStrings = await stringUtil.getStringsForMultipleEntities(client, 'upload', uploadIds, language);

  if (additionalStrings != null) {
    rows.forEach((upl) => {
      upl['strings'] = additionalStrings.filter(s => s['ref_id'] === upl['id']);
      upl['strings'].forEach(s => delete s['ref_id']);
    });
  }
}

async function getMaterialsByQuery(client, eventId, queryText, language, includeStrings = true) {
  const llog = client.log || util.log;

  const query = {
    text: queryText,
    values: [Number(eventId)]
  };
  
  llog.debug('REQUEST getMaterialsByQuery: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0 && includeStrings) {
    await hydrateStrings(client, res.rows, language);
  }

  return res.rows;
}

async function getMaterialsForMultipleByQuery(client, entity, ids, queryText, language, includeStrings = true) {
  const llog = client.log || util.log;

  const query = {
    text: queryText,
    values: [entity, ids]
  };
  
  llog.debug('REQUEST getMaterialsForMultipleByQuery: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0 && includeStrings) {
    await hydrateStrings(client, res.rows, language);
  }

  return res.rows;
}

//todo res.rows[0] we still support string description for material to get category. Should get rid of that summer 2022
//starting summer 2021 filenames contain category
async function getBrandingMaterialsForEvent(client, eventId, language, includeStrings) {
  return getMaterialsByQuery(client, eventId,
    `SELECT distinct sm.id, sm.event, sm.category, sm.size, sm.filetype, sm.url, s.value as description, sm.status
     from binaries sm
              left join Strings s on sm.id = s.ref_id
         and s.ref = 'upload'
         and s.category = 'description_long'
     where sm.event = $1
       and sm.category = 'branding'
       and sm.status in ('published','stub')
       and sm.ref is null`,
    language, includeStrings);
}

async function getBrandingMaterialsForArticle(client, articleId, language, includeStrings) {
  return getMaterialsByQuery(client, articleId,
    `SELECT distinct id, event, stand, category, url 
from binaries 
    where ref = 'news' and category='news' and ref_id = $1 and status in ('published','stub')`,
    language, includeStrings);
}

/**
 * get uploaded content for event. That excludes branding
 * @param {Object} client
 * @param {number} eventId
 * @param {string} language to get strings
 * @returns {Promise<*>}
 */
async function getMaterialsForEvent(client, eventId, language) {
  return getMaterialsByQuery(client, eventId,
    `SELECT * from binaries 
        where event = $1 
         AND category not in ('branding','news','sponsor') and status = 'published' 
         AND ref is null`, language);
}

//todo res.rows[0] we still support string description for material to get category. Should get rid of that summer 2022
//starting summer 2021 filenames contain category
async function getBrandingMaterialsForStand(client, standId, language, includeStrings) {
  return getMaterialsByQuery(client, standId,
    `SELECT distinct sm.id, sm.event, sm.category, sm.size, sm.filetype, sm.url, sm.stand, sm.status, s.value as description 
        from binaries sm 
            left join Strings s on sm.id = s.ref_id and s.ref = 'upload' and s.category = 'description_long' 
        where sm.stand = $1 and sm.category='branding' and sm.status in ('published','stub')
        AND sm.ref is null`,
    language, includeStrings);
}

/**
 * get uploaded content for stand. That excludes branding
 * @param {Object} client
 * @param {number} standId
 * @param {string} language to get strings
 * @returns {Promise<*>}
 */
async function getMaterialsForStand(client, standId, language) {
  return getMaterialsByQuery(client, standId,
    `SELECT * from binaries 
        where stand = $1
          AND category not in ('branding','news','sponsor') and status = 'published'
          AND ref is null`,
    language);
}

//todo redo after removing dependency on strings
async function getBrandingMaterialsForCompany(client, companyId, language) {
  return getMaterialsByQuery(client, companyId,
    `SELECT distinct sm.*, s.value as description 
        from binaries sm 
              left join Strings s on sm.id = s.ref_id and s.ref = 'upload' and s.category = 'description_long' 
        where sm.ref='company' and sm.ref_id = $1 and sm.category='branding' and sm.status = 'published'`,
    language);
}

/**
 * get uploaded content for company. That excludes branding
 * @param {Object} client
 * @param {number} companyId
 * @param {string} language to get strings
 * @returns {Promise<*>}
 */
async function getMaterialsForCompany(client, companyId, language) {
  return getMaterialsByQuery(client, companyId,
    `SELECT * from binaries 
        where ref='company' and ref_id = $1
          AND category not in ('branding','news','sponsor') and status = 'published'`, language);
}

async function getBrandingMaterialsForUser(client, userId, language) {
  return getMaterialsByQuery(client, userId,
    `SELECT distinct * 
    from binaries 
      where ref='user' and ref_id = $1 and category='branding' AND status IN ('published', 'stub')`,
    language);
}

async function getBrandingMaterialsForPersonnel(client, personnelId, language) {
  return getMaterialsByQuery(client, personnelId,
    `SELECT distinct *
     from binaries
     where ref='personnel' and ref_id = $1 and category='branding' AND status IN ('published', 'stub')`,
    language);
}

async function getBrandingMaterialsForCollection(client, collectionId, language) {
  return getMaterialsByQuery(client, personnelId,
    `SELECT distinct *
     from binaries
     where ref='collection' and ref_id = $1 and category='branding' AND status IN ('published', 'stub')`,
    language);
}

async function getBrandingMaterialsForMultipleUsers(client, userIds, language) {
  return getBrandingMaterialsForMultiple(client, 'user', userIds, language);
}

async function getBrandingMaterialsForMultiplePersonnel(client, personnelIds, language) {
  return getBrandingMaterialsForMultiple(client, 'personnel', personnelIds, language);
}

/**
 *
 * @param {Object} client postgres object
 * @param {string} entity
 * @param {number[]}entityIds
 * @param {string} [language]
 * @returns {Promise<*>}
 */
async function getBrandingMaterialsForMultiple(client, entity, entityIds, language) {
  return getMaterialsForMultipleByQuery(client, entity, entityIds,
    `SELECT distinct id, url, filetype, category, status, tags, ref, ref_id 
      FROM binaries
      WHERE ref=$1 AND ref_id = ANY($2::int[]) AND category='branding' AND status IN ('published', 'stub')`,
    language, false); //breaks compatibility with old records
}


async function getMaterialsForMultipleEvents(client, eventIds, language) {
  return getMaterialsForMultipleByQuery(client, 'event', eventIds,
    `SELECT * from binaries 
      where ref=$1 and event = ANY($2::int[]) and category not in ('branding','news','sponsor') and status = 'published'
      AND ref is null`,
    language);
}

async function deleteMaterial(client, materialId) {
  const llog = client.log || util.log;

  let query = {
    text: 'DELETE FROM binaries where id = $1 returning 1',
    values: [Number(materialId)]
  };
  
  llog.debug('REQUEST deleteMaterial: ', query);
  const res = await client.query(query);
  llog.debug(`deleted: ${res.rows.length}`);
}

async function deleteMaterialDuplicates(client, materialUrl, bucketName) {
  const llog = client.log || util.log;

  const lastDot = materialUrl.lastIndexOf(".");
  let prefix = materialUrl.substring(0, lastDot + 1);

  let params = {
    Bucket: bucketName,
    Prefix: prefix
  };
  const duplicates = await s3.listObjectsV2(params).promise();

  for (let i in duplicates['Contents']) {
    const file = duplicates['Contents'][i]['Key'];
    llog.debug('Removing:', file);
    params = {
      Bucket: bucketName, Key: file
    };
    await s3.deleteObject(params).promise()
    llog.debug('Removed from s3');
  }
}


/**
 * find materials, referensing another one. E.g. thumbnails for downloadable.
 * @param {Object} client postgres
 * @param {string} ref reference type, `uploads` for downloadables
 * @param {number} ref_id id of material
 * @returns {Promise<Object>}
 */
async function getMaterialReferences(client, ref, ref_id) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT id, category, ref, url, ref_id FROM binaries 
            WHERE ref = $1
            AND ref_id = $2`,
    values: [ref, Number(ref_id)]
  };

  llog.debug('REQUEST getMaterialReferences: ', query);
  const res = await client.query(query);
  llog.debug(`retrieved: ${res.rows.length}`);

  return res.rows;
}

/**
 * delete everything related to binary, along with related binaries:<br/>
 * - strings<br/>
 * - files, including resizes<br/>
 * - database records<br/>
 * - referenced binaries recursively
 * @param {Object} client
 * @param {Object} material
 * @param {string} uploadsBucket
 * @returns {Promise<void>}
 */
async function deleteMaterialOrchestrated(client, material, uploadsBucket) {
  const llog = client.log || util.log;
  llog.debug('getting references');
  //find and delete references (thumbnails)
  let references = await getMaterialReferences(client, 'upload', material['id']);
  for (let refMaterial of references) {
    llog.debug(`deleting ref material ${refMaterial['id']}`);
    await deleteMaterialOrchestrated(client, refMaterial, uploadsBucket);
  }

  llog.debug('deleting strings');
  //delete strings
  await stringUtil.deleteStringsRelatedToEntityIfExists(client, material['id'], 'upload');
  llog.debug(`deleting duplicates for ${material['id']}`);
  //send SQS message for deletion
  if (process.env.SqsBinaryDeleteUrl) {
    const sqs = new AWS.SQS({region: process.env.AWS_REGION});
    const sqsParams = {
      MessageBody: JSON.stringify({uploadsBucket: uploadsBucket, path: material['url']}),
      QueueUrl: process.env.SqsBinaryDeleteUrl
    };

    llog.debug(`message data`, sqsParams);
    await sqs.sendMessage(sqsParams).promise();
  } else {
    throw new exceptionUtil.ApiError(exceptionUtil.InternalServerError, "SQS URL not defined");
  }

  llog.debug('deleting material');
  //delete record from db
  await deleteMaterial(client, material.id);
}

/**
 * delete all binaries related to an entity
 * @param client
 * @param {string} category branding/news/etc. What type of content we are deleting
 * @param {string} ref reference type
 * @param {number} ref_id reference id
 * @param {string} uploadsBucket name of the bucket to look for binaries
 * @returns {Promise<void>}
 */
async function deleteBinariesForRefEntity(client, category, ref, ref_id, uploadsBucket) {
  const all = await getBinariesForMultipleRefEntities(client, category, ref, [ref_id], false);
  for (let i in all) {
    await deleteMaterialOrchestrated(client, all[i], uploadsBucket)
  }
}

/**
 * company/2/events/7/news/f-17633df9d47-e8cf4cf879ab4.jpg - event article imagery<br/>
 * company/2/branding/f-17b6405e6d6-1ad73d1d0eb06.jpg - company image<br/>
 * user/2/branding/f-17b6405e6d6-1ad73d1d0eb06.jpg - user avatar<br/>
 * company/85/event/58/branding/f-17b4ee02f38-ac1d2e22d36be.png - event icons<br/>
 * company/82/stands/50/branding/f-17a7b64f463-b95f883e436a3.jfif - stand icons<br/>
 * company/7/events/18/sponsor/f-1768625b808-4baaff2634e2f.png - sponsor images upload<br/>
 * company/97/stand/59/binary/f-17b67d87130-464f990652437.pdf - stand binary upload<br/>
 * company/3/event/3/binary/f-175a265907b-a710f0af5c8e2.png - event binary upload<br/>
 *
 * @param {Object} client
 * @param {string} entityName what we store, event/stand/company
 * @param {number} entityId id of the entity
 * @param {number} userId id of the uploader
 * @param {string} category upload category @see validation.isValidUploadCategory
 * @param {string} subcategory additional information on a file. e.g., type of branding, "logo"/"main_page"
 * @param {string} fileName name of uploaded file
 * @param {string|null} ref reference to related object, @see string_entity db type
 * @param {number|null} ref_id id of reference type
 * @param {string[]} tags array of tags
 * @returns {Promise<Object>|null}
 * @throws ApiError 405 if cannot create stub record
 */
async function createUploadBinaryStub(client, entityName, entityId, userId, category,
                            subcategory, fileName, ref, ref_id, tags) {
  const llog = client.log || util.log;

  let entityDir = '';
  let eventid = null;
  let standid = null;
  //resolving missing details
  if (entityName === 'event') { //get creator company
    const event = await eventUtil.getEventFromDbOrThrowException(client, entityId);
    entityDir = `company/${event.company}/`;
    eventid = event.id;
  }
  if (entityName === 'stand') {
    const stand = await standUtil.getStandFromDbOrThrowException(client, entityId);
    entityDir = `company/${stand.company}/`;
    standid = stand.id;
    eventid = stand.event;
  }

  fileName = fileName.substring(fileName.lastIndexOf("/"));
  const ext = (fileName.indexOf('.') >= 0) ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '.noextenstion';
  const mimeType = mime.lookup(fileName) || '';

  const newFileName = `d-${subcategory || ''}-${Date.now().toString(16) + '-' + Math.random().toString(16).substr(2)}${ext}`;

  const targetPath = `${entityDir}${entityName}/${entityId}/${category}/${newFileName}`;

  //if entityDir, entityname, entityId, category, ref, ref_id, subcategory duplicates, then old file should be removed
  if (client.uploadsBucket) {
    let query = {
      text: `SELECT id, url
             FROM binaries
             WHERE CASE WHEN $1::int IS NULL THEN event IS NULL ELSE event = $1 END
               AND CASE WHEN $2::int IS NULL THEN stand IS NULL ELSE stand = $2 END
               AND category = $3
               AND subcategory = $4
               AND ref = $5
               AND ref_id = $6
               AND category NOT IN ('binary', 'sponsor')`,
      values: [
        eventid ? Number(eventid) : null,
        standid ? Number(standid) : null,
        category,
        subcategory,
        ref,
        ref_id ? Number(ref_id) : null
      ]
    };

    llog.debug('REQUEST createUploadBinaryStub check: ', query);
    let res = await client.query(query);
    llog.debug(`fetched: ${res.rows.length}`);
    if (res.rows.length > 0) {  //override found, let's delete old ones
      for (let row of res.rows) {
        await deleteMaterialOrchestrated(client, row, client.uploadsBucket);
      }
    }
  }

  query = {
    text: `INSERT into binaries(
        event,
        stand,
        uploader,
        url,
        tags,
        category,
        filetype,
        status,
        ref,
        ref_id,
        original_filename,
        subcategory
        ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    values: [eventid ? Number(eventid) : null,
      standid ? Number(standid) : null,
      userId,
      targetPath,
      tags ? JSON.stringify(tags) : '[]',
      category,
      mimeType,
      STATUS_STUB,
      ref,
      ref_id ? Number(ref_id) : null,
      fileName,
      subcategory
    ]
  };

  llog.debug('REQUEST createUploadBinaryStub: ', query);
  res = await client.query(query);
  llog.debug('created: ', res.rows[0]);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiError(exceptionUtil.Invalid, 'Couldn\'t create upload stub.');
  }
}

/**
 *
 * @param {Object} client
 * @param {number} materialId
 * @param {String} status?
 * @param {String[]} tags?
 * @returns {Promise<null|*>}
 */
async function updateMaterialInDB(client, materialId, status = null, tags = null) {
  const llog = client.log || util.log;

  const query = {
    text: `UPDATE binaries SET status=coalesce($1, status), tags = coalesce($2, tags)
        WHERE id = $3 RETURNING *`,
    values: [status,
      tags ? JSON.stringify(tags) : null,
      Number(materialId)
    ]
  };

  llog.debug('REQUEST updateMaterialInDB: ', query);
  const res = await client.query(query);
  llog.debug(`updated:  ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Not found.');
  }
}


async function assertBinariesPublished(client, binaries) {
  const llog = client.log || util.log;

  let query = {
    text: `select 1
           FROM binaries
           where url = ANY ($1)
             and status <> 'published'`,
    values: [binaries]
  };
  
  llog.debug('REQUEST assertBinariesPublished: ', query);
  const {rows} = await client.query(query);
  llog.debug(`selected: ${rows.length}`);

  if (rows.length) {
    throw new exceptionUtil.ApiException(405, 'Not all the images are published. Saving denied.');
  }
}

async function getBinariesForActivityStream(client, ids, language) {
  const llog = client.log || util.log;
  
  const query = {
    text: 'SELECT id, size, filetype from binaries where id = ANY ($1)',
    values: [ids]
  };
  
  llog.debug('REQUEST getBinariesForActivityStream: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    await hydrateStrings(client, res.rows, language);

    return res.rows;
  } else {
    return [];
  }
}

async function getBinariesForEventAndTags(client, eventId, tags, language) {
  return getBinariesForTags(client, eventId, null, tags, language);
}

async function getBinariesForStandAndTags(client, standId, tags, language) {
  return getBinariesForTags(client, null, standId, tags, language);
}

async function getBinariesForTags(client, eventId, standId, tags, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT * FROM binaries WHERE
        CASE
            WHEN $1::int IS NULL THEN event IS NULL
            ELSE event = $1::int END
        AND CASE
                WHEN $2::int IS NULL THEN stand IS NULL
                ELSE stand = $2::int END 
        AND tags::jsonb ?| $3 and category='binary'`,
    values: [eventId ? Number(eventId) : null, standId ? Number(standId) : null, tags]
  };

  llog.debug('REQUEST getBinariesForTags: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    await hydrateStrings(client, res.rows, language);

    return res.rows;
  } else {
    return [];
  }
}


async function getBinariesForMultipleRefEntities(client, category, ref, entityIds, getStrings = false, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT id, category, ref, url, ref_id, status FROM binaries WHERE
           category=$1
           AND ref = $2
           AND status IN ('published', 'stub')
           AND ref_id = ANY($3::int[])`,
    values: [category, ref, entityIds]
  };

  llog.debug('REQUEST getBinariesForMultipleRefEntities: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    if (getStrings) {
      await hydrateStrings(client, res.rows, language);
    }

    return res.rows;
  } else {
    return [];
  }
}

async function getBinariesForMultipleCoreEntities(client, events, stands, category, getStrings = false, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT id, event, stand, category, url FROM binaries WHERE
          category=$1
          AND CASE
              WHEN $2::int[] IS NULL THEN event IS NULL
              ELSE event = ANY($2::int[]) END
          AND CASE
              WHEN $3::int[] IS NULL THEN stand IS NULL
              ELSE stand = ANY($3::int[]) END
           AND status = 'published'
           AND ref IS NULL`,
    values: [category, events, stands]
  };

  llog.debug('REQUEST getBinariesForMultipleCoreEntities: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    if (getStrings) {
      await hydrateStrings(client, res.rows, language);
    }

    return res.rows;
  } else {
    return [];
  }
}

/**
 * updates status of binary in RDS
 * @async
 * @method updateBinaryByKey
 * @param {Object} client for Postgres operations
 * @param {String} key unique key for binary
 * @param {int} size in bytes
 * @return {Object|null} with updated row columns, or null if no object found
 */
async function updateBinaryByKey(client, key, size) {
  const llog = client.log || util.log;
  
  const query = {
    text: 'update binaries set status = \'published\', uploaded = NOW(), size = $1 where url = $2 RETURNING *',
    values: [size, key]
  };

  llog.debug('REQUEST updateBinaryByKey: ', query);
  const res = await client.query(query);
  llog.info(`updated: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * generate S3 signed URL.
 * @param {Object} client we expect it contains "uploadsBucket" value, and log
 * @param {string} newMaterialURL value for freshly created binary record
 * @param {number} signedUrlExpireSeconds expiration
 * @returns {string} signed URL
 */
function generateS3SignedURL(client, newMaterialURL, signedUrlExpireSeconds = 60 * 60) {
  //TODO: Check if we need any of these ACL: 'bucket-owner-full-control', ContentType: 'text/csv'
  const params = {
    Bucket: client.uploadsBucket,
    Key: newMaterialURL,
    Expires: signedUrlExpireSeconds,
    ContentType: 'application/octet-stream'
  };

  const url = s3.getSignedUrl('putObject', params);
  client.log.debug(`Generated signed url: ${url}`);
  return url;
}


exports.getMaterialByIdOrThrowException = getMaterialByIdOrThrowException;
exports.getMaterialsForEvent = getMaterialsForEvent;
exports.getBrandingMaterialsForEvent = getBrandingMaterialsForEvent;
exports.getBrandingMaterialsForStand = getBrandingMaterialsForStand;
exports.getMaterialsForStand = getMaterialsForStand;
exports.getMaterialsForMultipleEvents = getMaterialsForMultipleEvents;
exports.deleteMaterialOrchestrated = deleteMaterialOrchestrated;
exports.deleteMaterialDuplicates = deleteMaterialDuplicates;
exports.deleteBinariesForRefEntity = deleteBinariesForRefEntity;

exports.getBrandingMaterialsForCompany = getBrandingMaterialsForCompany;
exports.getMaterialsForCompany = getMaterialsForCompany;
exports.getBrandingMaterialsForUser = getBrandingMaterialsForUser;
exports.getBrandingMaterialsForPersonnel = getBrandingMaterialsForPersonnel;
exports.getBrandingMaterialsForCollection = getBrandingMaterialsForCollection;
exports.createUploadBinaryStub = createUploadBinaryStub;
exports.updateMaterialInDB = updateMaterialInDB;
exports.assertBinariesPublished = assertBinariesPublished;
exports.getBinariesForEventAndTags = getBinariesForEventAndTags;
exports.getBinariesForStandAndTags = getBinariesForStandAndTags;
exports.getMaterialByUrlOrThrowException = getMaterialByUrlOrThrowException;
exports.getBrandingMaterialsForArticle = getBrandingMaterialsForArticle;
exports.getBinariesForActivityStream = getBinariesForActivityStream;
exports.getBrandingMaterialsForMultipleUsers = getBrandingMaterialsForMultipleUsers;
exports.getBrandingMaterialsForMultiplePersonnel = getBrandingMaterialsForMultiplePersonnel;
exports.getBinariesForMultipleRefEntities = getBinariesForMultipleRefEntities;
exports.getBinariesForMultipleCoreEntities = getBinariesForMultipleCoreEntities;
exports.updateBinaryByKey = updateBinaryByKey;
exports.generateS3SignedURL = generateS3SignedURL;

exports.STATUS_STUB = STATUS_STUB;
exports.CATEGORY_BINARY = CATEGORY_BINARY;
