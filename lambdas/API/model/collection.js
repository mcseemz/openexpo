/**
 *  @description Collection module
 *  @class collectionUtil
 */
const stringUtils = require('./strings');
const exceptionUtil = require('./exception');
const binaryUtil = require('./binary');
const util = require('./util');
const validator = require('./validation');
const activityUtil = require('./activity');
const standUtil = require('./stand');
const personnelUtil = require('./personnel');
const permissionsUtil = require('./permissions');
const newsUtil = require('./news');
const {ARTICLE_PUBLISHED} = require("./news");

/**
 * add strings and branding
 * @param client
 * @param {Object[]} collections
 * @param {string} [language]
 * @returns {Promise<void>}
 */
async function populateCollectionsWithAdditionalData(client, collections, language) {
    if (collections.length === 0) {
        return;
    }
    const collectionIds = collections.map(e => e['id']);
    const additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'collection', collectionIds, language);

    if (additionalStrings != null) {
        collections.forEach((c) => {
            c['strings'] = additionalStrings.filter(str => str['ref_id'] === c['id']);
            c['strings'].forEach(str => delete str['ref_id']);
        });
    }

    const allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', 'collection', collectionIds);
    collections.forEach((c) => {
        c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
    });
}

/**
 * add content size to collection. personnel does not have tags??
 * @param client
 * @param {Object[]} collections
 * @returns {Promise<void>}
 */
async function populateCollectionsWithContentSize(client, collections) {
    const llog = client.log || util.log;
    async function setCollectionContentSize(c) {
        const tableName = util.mapRefToTable(c['ref']);
        const standField = c['ref'] === 'stand' ? 'id' : 'stand';

        if (c['ref'] === 'stand') { //preprocess
            c['tags'].forEach((tag, index, arr) => {
                arr[index] = 'tag:'+tag;
            })
        }

        const query = {
            text: `SELECT count(*) as "contentSize" FROM ${tableName} 
        WHERE
            CASE
                WHEN $1::int IS NULL THEN true
                ELSE event = $1::int END
            AND CASE
                WHEN $2::int IS NULL THEN true
                ELSE ${standField} = $2::int END
            AND tags::jsonb ?| $3`,
            values: [c['event'], c['stand'], c['tags']]
        };
        llog.debug('REQUEST populateCollectionsWithContentSize: ', query);
        let res = await client.query(query);
        llog.debug(`fetched: ${res.rows.length}`);
        c['contentSize'] = res.rows.length > 0 ? res.rows[0]['contentSize'] : 0;
    }

    for (let collection of collections) {
        await setCollectionContentSize(collection);
    }
}

/**
 * fetch typed content for collection
 * @param {Object} client
 * @param {Object} collection - getched collection
 * @param {number} [userId]
 * @param {string} [language]
 * @returns {Promise<*[]|Object[]>}
 */
async function getCollectionContent(client, collection, userId, language) {
    switch (collection['ref']) {
        case 'activity':
            let activities = [];
            if (collection['event']) {
                activities = await activityUtil.getActivitiesPublicForEventAndTags(client, collection['event'], collection['tags'],
                    language);
                await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, collection['event'], null, activities, userId);
            } else if (collection['stand']) {
                activities = await activityUtil.getActivitiesPublicForStandAndTags(client, collection['stand'], collection['tags'],
                    language);
                await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, null, collection['stand'], activities, userId);
            }
            return activities;
        case 'stand':
            let stands = [];
            if (collection['event']) {
                collection['tags'].forEach((tag, index, arr) => {
                    arr[index] = 'tag:'+tag;
                })

                stands = await standUtil.getStandsForEventAndTags(client, collection['event'], collection['tags'], '',
                    'published', userId, language);
            }
            await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, null, null, stands, userId);
            return stands;
        case 'user':
            let users = [];
            if (collection['event']) {
                users = await personnelUtil.getPersonnelPublicForEventAndTags(client, collection['event'], collection['tags']);
            } else if (collection['stand']) {
                users = await personnelUtil.getPersonnelPublicForStandAndTags(client, collection['stand'], collection['tags']);
            };
            await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, null, null, users, userId);
            return users;
        case 'upload':
            let binaries = [];
            if (collection['event']) {
                binaries = await binaryUtil.getBinariesForEventAndTags(client, collection['event'], collection['tags'], language);
                await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, collection['event'], null, binaries, userId);
            } else if (collection['stand']) {
                binaries = await binaryUtil.getBinariesForStandAndTags(client, collection['stand'], collection['tags'], language);
                await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, null, collection['stand'], binaries, userId);
            }
            return binaries;
        case 'news':
            let news = [];
            if (collection['event']) {
                news = await newsUtil.getArticlesForEvent(client, collection['event'], ARTICLE_PUBLISHED, 0, undefined, collection['tags'], language);
                await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, collection['event'], null, news, userId);
            } else if (collection['stand']) {
                news = await newsUtil.getArticlesForStand(client, collection['stand'], ARTICLE_PUBLISHED, 0, undefined, collection['tags'], language);
                await permissionsUtil.populateMultipleEntitiesWithAllowedProperty(client, null, collection['stand'], news, userId);
            }
            return news;

        default:
            return [];
    }
}

/**
 * return collections for event populated with string and branding
 * @param {Object} client - PG client
 * @param {Number} eventId - event id
 * @param {String} language - user id
 * @returns  {Promise<Object>} newly created record
 */
async function getCollectionsForEvent(client, eventId, language) {
    const llog = client.log || util.log;

    let searchColumnName;
    if (validator.isNumber(eventId)) {
        searchColumnName = 'id'
        eventId = Number(eventId);
    }
    else {
        searchColumnName = 'custom_name';
    }

    const query = {
        text: `SELECT c.* FROM collection c 
    LEFT JOIN event e ON e.id = c.event
    WHERE e.${searchColumnName} = $1`,
        values: [eventId]
    };

    llog.debug('REQUEST getCollectionsForEvent: ', query);
    let res = await client.query(query);
    llog.debug(`fetched: ${res.rows.length}`);

    if (res.rows.length > 0) {
        await populateCollectionsWithAdditionalData(client, res.rows, language);
        await populateCollectionsWithContentSize(client, res.rows);
        return res.rows;
    } else {
        return [];
    }
}

/**
 * return collections for stand populated with string and branding
 * @param {Object} client - PG client
 * @param {Number} standId - stand id
 * @param {String} language - language
 * @returns  {Promise<Object>} newly created record
 */
async function getCollectionsForStand(client, standId, language) {
    const llog = client.log || util.log;

    const query = {
        text: `SELECT * FROM collection 
                WHERE stand = $1`,
        values: [standId]
    };

    llog.debug('REQUEST getCollectionsForStand: ', query);
    let res = await client.query(query);
    llog.debug(`fetched: ${res.rows.length}`);

    if (res.rows.length > 0) {
        await populateCollectionsWithAdditionalData(client, res.rows, language);
        await populateCollectionsWithContentSize(client, res.rows);
        return res.rows;
    } else {
        return [];
    }
}


/**
 * identify collection by id or customName. Fetches content for it. Fetch branding for collection but not for content
 * Throw exception if not found
 * @param {Object} client
 * @param {number|String} collectionId
 * @param {number} [userId]
 * @param {string} [language]
 * @returns {Promise<*[]|*>}
 */
async function getCollectionFromDbOrThrowException(client, collectionId, userId, language) {
    const llog = client.log || util.log;

    const searchColumnName = validator.isNumber(collectionId) ? 'id' : 'custom_name';
    const query = {
        text: `SELECT c.id, c.custom_name as "customName", c.ref, c.tags, c.event, c.stand FROM collection c WHERE c.${searchColumnName}=$1`,
        values: [collectionId]
    };

    llog.debug('REQUEST getCollectionFromDbOrThrowException: ', query);
    const res = await client.query(query);
    llog.debug(`fetched: ${res.rows.length}`);

    if (res.rows.length > 0) {
        res.rows[0]['content'] = await getCollectionContent(client, res.rows[0], userId, language);
        res.rows[0]['branding'] = await binaryUtil.getBinariesForMultipleRefEntities(client,
            'branding', 'collection', [res.rows[0]['id']]);

        return res.rows[0];
    } else {
        throw new exceptionUtil.ApiException(404, 'Collection not found');
    }
}

/**
 *
 * @param {Object} client. We expect it to have log and uploadsBucket initialized
 * @param {number} collectionId
 * @returns {Promise<number>}
 */
async function deleteCollectionById(client, collectionId) {
    const llog = client.log || util.log;

    const searchColumnName = validator.isNumber(collectionId) ? 'id' : 'custom_name';
    const query = {
        text: `DELETE FROM collection WHERE ${searchColumnName} = $1 returning *`,
        values: [collectionId]
    };

    llog.debug('REQUEST deleteCollectionById: ', query);
    let res = await client.query(query);
    llog.debug(`deleted: ${res.rows.length}`);
    llog.error({ idxen: "collection", idxid: collectionId, idxop: "del" }); //indexation

    for (let i in res.rows) {
        //delete strings
        await stringUtils.deleteStringsRelatedToEntityIfExists(client, res.rows[i]['id'], 'collection');
        //delete binaries
        await binaryUtil.deleteBinariesForRefEntity(client, 'branding', 'collection', res.rows[i]['id'], client.uploadsBucket);
    }

    return res.rows.length;
}

async function createCollectionInDb(client, eventId, standId, customName, ref, tags, userId, language) {
    const llog = client.log || util.log;
    let query = {
        text: `INSERT INTO collection(custom_name, ref, tags, event, stand) VALUES($1, $2, $3::jsonb, $4, $5) RETURNING *`,
        values: [customName, ref, JSON.stringify(tags) || '[]', eventId ? Number(eventId) : null, standId ? Number(standId) : null]
    };
  
    llog.debug('REQUEST createCollectionInDb: ', query);
    let res = await client.query(query);
    llog.debug('created: ', res.rows[0]);
    llog.error({idxen: "collection", idxid: res.rows[0]['id'], idxop:"ins"}); //indexation
  
    return await getCollectionFromDbOrThrowException(client, res.rows[0]['id'], userId, language);
}

async function updateCollectionInDbOrThrowException(client, collection, language, userId) {
    let query = {
        text: `UPDATE collection SET tags = $1, custom_name = $2 WHERE id = $3 RETURNING *`,
        values: [JSON.stringify(collection['tags']) || '[]', collection['customName'], Number(collection['id'])]
    };

    const llog = client.log || util.log;
    llog.debug("REQUEST updateCollectionInDbOrThrowException: ", query);
    let res = await client.query(query);
    llog.info("updated: ", res.rows[0]);
    llog.error({ idxen: "collection", idxid: res.rows[0]['id'], idxop: "upd" }); //indexation

    return getCollectionFromDbOrThrowException(client, res.rows[0]['id'], userId, language);
}

exports.getCollectionsForEvent = getCollectionsForEvent;
exports.getCollectionsForStand = getCollectionsForStand;
exports.getCollectionFromDbOrThrowException = getCollectionFromDbOrThrowException;
exports.deleteCollectionById = deleteCollectionById;
exports.createCollectionInDb = createCollectionInDb;
exports.updateCollectionInDbOrThrowException = updateCollectionInDbOrThrowException;
