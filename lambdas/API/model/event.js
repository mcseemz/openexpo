/**
 *  @description Events module
 *  @class eventUtil
 */
const localCache = require("./cache");

const exceptionUtil = require('./exception');
const pricingUtil = require('./eventPricing');
const stringUtils = require('./strings');
const standUtils = require('./stand');
const binaryUtils = require('./binary');
const roleUtil = require('./role');
const validator = require('./validation');
const personUtil = require('./person');
const personnelUtil = require('./personnel');
const personnelInvitationUtil = require('./personnelInvitation');
const standInvitationUtil = require('./standInvitation');

const ticketUtil = require('./ticket');
const sponsorshipUtil = require('./sponsorship');
const util = require('./util');
const eventPricingUtil = require("./eventPricing");
const permissionUtil = require("./permissions");

const CACHE_TTL_MS = 60000; // 1 minute
const attendeesCache = localCache.cachePromise(personUtil.getEventAttendeesNumber, {
  maxTtlMs: CACHE_TTL_MS,
});

const EVENT_FIELDS =
  `e.id,
  e.date_start  as "dateStart",
  e.date_end    as "dateEnd",
  e.timezone::numeric,
  e.company,
  e.status,
  e.tags,
  e.contacts,
  e.custom_name as "customName",
  e.color,
  e.is_public,
  e.video,
  e.discount,
  e.parameter::jsonb #> '{announcement}' as "announcement",
  e.user_fields as "userfields"`;

async function getAttendeesNumber(client, eventId) {
  return await attendeesCache(client, eventId);
}

async function getEventFromDb(client, eventId, userId) {
  const llog = client.log || util.log;

  if (!validator.isNumber(eventId)) {
    return getEventFromDbByNameOrThrowException(client, eventId, userId);
  }

  const query = {
    text: `SELECT ${EVENT_FIELDS} 
      from Event e where id = $1`,
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getEventFromDb: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return (await hydrateEvent(client, res, userId))[0];
  } else {
    return null;
  }
}

async function getEventFromDbOrThrowException(client, eventId, userId) {
  const llog = client.log || util.log;

  if (!validator.isNumber(eventId)) {
    return getEventFromDbByNameOrThrowException(client, eventId, userId);
  }

  const query = {
    text: `SELECT ${EVENT_FIELDS}, 
          e.parameter
        from Event e where id = $1`,
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getEventFromDbOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return (await hydrateEvent(client, res, userId))[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Event not found');
  }
}

async function getEventFromDbByNameOrThrowException(client, eventName, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_FIELDS}, 
          e.parameter
        from Event e where custom_name = $1`,
    values: [eventName]
  };

  llog.debug('REQUEST getEventFromDbByNameOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return (await hydrateEvent(client, res, userId))[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Event not found');
  }
}

async function getEventsForCompany(client, companyId, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_FIELDS}
        from Event e where company = $1`, //no parameter, we don't need it on mass retrieval
    values: [Number(companyId)]
  };

  llog.debug('REQUEST getEventsForCompany: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return await hydrateEvent(client, res, userId) || [];
}

/**
 * hydrate event data with additional info: user grants, stand count, tags
 * @param {Object} client - database
 * @param {Object} res - return from event select
 * @param userId - optional userid to get grants
 * @returns {Promise<*>} - hydrated res
 */
async function hydrateEvent(client, res, userId) {
  if (res.rows.length === 0) {
    return null;
  }

  if (userId) {
    for (let i in res.rows) {
      res.rows[i]['grants'] = await roleUtil.getMyGrantsForEvent(client, userId, res.rows[i]['id']);
      res.rows[i]['attendees'] = await getAttendeesNumber(client,res.rows[i]['id']);
    }
  }

  const ids = res.rows.map(r => r['id']);
  const standMapping = await standUtils.getStandCountForMultipleEvents(client, ids);

  res.rows.forEach(r => {
    const record = standMapping.find(s => s['event'] === r['id']);
    r['standCount'] = record ? record['count'] : 0;
  });

  return res.rows;
}

async function getEventsForUserAsVisitor(client, buyerId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_FIELDS} 
           from Event e
           where id = ANY (select event from ticket where buyer = $1 AND payment_status in ('payed','not_payed','banned','archived'))
             and is_public = true`, //no parameter, we don't need it on mass retrieval
    values: [Number(buyerId)]
  };

  llog.debug('REQUEST getEventsForUserAsVisitor: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (await hydrateEvent(client, res, buyerId)) || [];
}

/**
 * retrieve events where user is in personnel
 * @param {Object} client - database
 * @param {number} userId - user as personnel
 * @returns {Promise<*[]|*>}
 */
async function getEventsForUserAsPersonnel(client, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_FIELDS} 
           from Event e
           where id = ANY (select event from personnel where person = $1 and event is not null)
             and is_public = true`, //no parameter, we don't need it on mass retrieval
    values: [Number(userId)]
  };

  llog.debug('REQUEST getEventsForUserAsPersonnel: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (await hydrateEvent(client, res, userId)) || [];
}


async function createEventInDb(client, params, userId) {
  const llog = client.log || util.log;

  let query = {
    text: 'INSERT INTO Event(date_start, date_end, timezone, company, platform, status, tags, contacts, custom_name, color, is_public, video, discount) VALUES($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13) RETURNING *',
    values: [new Date(Date.parse(params['dateStart'])), new Date(Date.parse(params['dateEnd'])), Number(params['timezone']),
      params['company'] || null, params['platform'] || null,
      'draft', JSON.stringify(params['tags']) || '[]',
      params['contacts'] || {}, params['customName'], params['color'] || '', params['is_public'] || true, params['video'] || '', params['discount'] || null]
  };

  llog.debug('REQUEST createEventInDb: ', query);
  let res = await client.query(query);
  llog.info('created: ', res.rows[0]);
  llog.error({idxen: "event", idxid: res.rows[0]['id'], idxop:"ins"}); //indexation

  //fetching back renamed
  return getEventFromDb(client, res.rows[0]['id'], userId);
}

async function getEventsForTags(client, category, userId) {
  const llog = client.log || util.log;
  
  const query = {
    text: `SELECT ${EVENT_FIELDS} 
           from Event e
           where e.status = 'active'
            and e.is_public = true  
            and e.tags @> $1::jsonb`,
    values: [JSON.stringify(['category:' + category]) || '[]']
  };

  llog.debug('REQUEST getEventsForTags: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return await hydrateEvent(client, res, userId);
}

async function getSponsoringEventsAsUser(client, userId) {
  const llog = client.log || util.log;
  
  const query = {
    text: `SELECT ${EVENT_FIELDS} 
           from Event e
              left join relation r on r.object_ref = 'user' and r.subject_ref = 'event' and r.subject_ref_id = e.id
           where r.object_ref_id = $1`,
    values: [Number(userId)]
  };

  llog.debug('REQUEST getSponsoringEventsAsUser: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return await hydrateEvent(client, res, userId) || [];
}

async function getSponsoringEventsAsCompany(client, userId, companyId) {
  const llog = client.log || util.log;
  
  const query = {
    text: `SELECT ${EVENT_FIELDS} 
           from Event e
                left join relation r on r.object_ref = 'company' and r.subject_ref = 'event' and r.subject_ref_id = e.id
           where r.object_ref_id = $1`,
    values: [Number(companyId)]
  };

  llog.debug('REQUEST getSponsoringEventsAsCompany: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return await hydrateEvent(client, res, userId) || [];
}

/**
 * get list of events enabled for active interaction
 * @method getActiveEvents
 * @async
 * @param {Object} client RDS client
 * @return {Promise<Array>} objects array with {event-id, company-id}<br/>
 * 200 - ok<br/>
 * 404 - invalid Id<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
 */
async function getActiveEvents(client) {
  const llog = client.log || util.log;
  
  const query = {
    text: `SELECT ${EVENT_FIELDS} 
          from Event e
          where e.date_end >= now()`,
    values: []
  };

  llog.debug('REQUEST getActiveEvents: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (await hydrateEvent(client, res)) || [];
}

/**
 * get list of events currently open, not hydrated
 * @method getOngoingEvents
 * @async
 * @param {Object} client RDS client
 * @return Object[] <br/>
 */
async function getOngoingEvents(client) {
  const llog = client.log || util.log;
  
  const query = {
    text: `SELECT ${EVENT_FIELDS} 
            from Event e
            where e.date_start <= NOW()
                and e.date_end >= NOW()`,
    values: []
  };

  llog.debug('REQUEST getOngoingEvents: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows || [];
}

async function searchForEvents(client, searchStr, category, type, userId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_FIELDS} 
           from strings s
                left join Event e
                      on e.id = s.ref_id
           where e.status = 'active'
             and s.ref = 'event'
             and (s.value ilike $1 or e.custom_name ilike $1)
             and (jsonb_array_length($2::jsonb)=0 or e.tags @> $2::jsonb)
             and is_public = true
             and CASE
                     WHEN $3 = 'featured' THEN e.tags ?| ARRAY['is:featured']
                     WHEN $3 = 'regular' THEN not (e.tags ?| ARRAY['is:featured'])
                     ELSE true END;`,
    values: ['%' + searchStr + '%', JSON.stringify(['category:' + category])||'[]', type]
  };

  llog.debug('REQUEST searchForEvents: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return (await hydrateEvent(client, res, userId)) || [];
}

async function updateEventInDbOrThrowException(client, params, eventId, userId) {
  const llog = client.log || util.log;

  let query = (validator.isNumber(eventId)) ?
      {
        text: `UPDATE event SET 
                 date_start = to_timestamp($1 / 1000.0), 
                 date_end = to_timestamp($2 / 1000.0), 
                 timezone = $3, 
                 tags = $4::jsonb, 
                 contacts = $5, 
                 custom_name = $6, 
                 color = $7, 
                 is_public = $8, 
                 video = $9, 
                 user_fields = $10::jsonb,
                 parameter = $11::jsonb
            WHERE id = $12 RETURNING 1`,
        values: [Date.parse(params['dateStart']),
          Date.parse(params['dateEnd']),
          Number(params['timezone']),
          JSON.stringify(params['tags']) || '[]',
          params['contacts'] || {},
          params['customName'],
          params['color'] || '',
          params['is_public'] || true,
          params['video'] || '',
          JSON.stringify(params['userfields']) || '[]',
          JSON.stringify(params['parameter']) || '[]',
          Number(eventId)]
      }
      : {
        text: `UPDATE event SET 
                 date_start = to_timestamp($1 / 1000.0), 
                 date_end = to_timestamp($2 / 1000.0), 
                 timezone = $3, 
                 tags = $4::jsonb, 
                 contacts = $5, 
                 custom_name = $6, 
                 color = $7, 
                 is_public = $8, 
                 video = $9, 
                 user_fields = $10::jsonb,
                 parameter = $11::jsonb
                WHERE custom_name = $12 RETURNING 1`,
        values: [Date.parse(params['dateStart']),
          Date.parse(params['dateEnd']),
          Number(params['timezone']),
          JSON.stringify(params['tags']) || '[]',
          params['contacts'] || {},
          params['customName'] || '',
          params['color'] || '',
          params['is_public'] || true,
          params['video'] || '',
          JSON.stringify(params['userfields']) || '[]',
          JSON.stringify(params['parameter']) || '[]',
          eventId]
      };

  llog.debug('REQUEST updateEventInDbOrThrowException: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  llog.error({idxen: "event", idxid: eventId, idxop:"upd"}); //indexation

  //retrieve updated and renamed
  if (res.rows.length > 0) {
    return getEventFromDbOrThrowException(client, eventId, userId);
  } else {
    throw new exceptionUtil.ApiException(404, 'Event not found');
  }
}

async function populateMultipleEventsWithData(client, events, language) {
  const eventIds = events.map(e => e['id']);
  let additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'event', eventIds, language);

  if (additionalStrings != null) {
    events.forEach((evt) => {
      evt['strings'] = additionalStrings.filter(s => s['ref_id'] === evt['id']);
      evt['strings'].forEach(s => delete s['ref_id']);
    });
  }

  const allMaterials = await binaryUtils.getMaterialsForMultipleEvents(client, eventIds, language);
  events.forEach((evt) => {
    evt['standMaterials'] = allMaterials.filter(s => s['event'] === evt['id']);
  });

  const allBranding = await binaryUtils.getBinariesForMultipleCoreEntities(client, eventIds, null, 'branding', true, language);
  events.forEach((evt) => {
    evt['branding'] = allBranding.filter(s => s['event'] === evt['id']);
  });

  for (const evt of events) {
    evt['pricing'] = await pricingUtil.getActivePricingForEvent(client, evt['id']);
    const pricingIds = evt['pricing'].map(e => e['id']);
    additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'pricing', pricingIds, language);
    if (additionalStrings != null) {
      evt['pricing'].forEach((pr) => {
        eventPricingUtil.preparePricingForOutput(pr);

        pr['strings'] = additionalStrings.filter(s => s['ref_id'] === pr['id']);
        pr['strings'].forEach(s => delete s['ref_id']);
      });
    }
  }
}

async function updateEventStatus(client, eventId, newStatus, userId) {
  const llog = client.log || util.log;

  let query = (validator.isNumber(eventId)) ? {
        text: 'UPDATE event SET status = $1 WHERE id = $2 RETURNING 1',
        values: [newStatus, Number(eventId)]
      }
      : {
        text: `UPDATE event SET status = $1 WHERE custom_name = $2 RETURNING 1`,
        values: [newStatus, eventId]
      };

  llog.debug('REQUEST updateEventStatus: ', query);
  let res = await client.query(query);
  llog.info(`updated: ${res.rows.length}`);

  llog.error({idxen: "event", idxid: eventId, idxop:"upd"}); //indexation

  //retrieve updated
  if (res.rows.length > 0) {
    return getEventFromDb(client, eventId, userId);
  }
}

/**
 * update announcement in event, return it
 * @param {Object} client
 * @param {Number} eventId
 * @param {String} message
 * @returns {Promise<String|null>}
 */
async function updateEventAnnouncement(client, eventId, message=''){
  const llog = client.log || util.log;

  let query = (validator.isValidNonEmptyLongString(message)) ?
    {
      text: `UPDATE
                event SET
                parameter = 
                      jsonb_set(parameter::jsonb,
                            '{announcement}', CONCAT('{"date": "', to_char(now(), 'YYYY-MM-DD HH24:MI:SS.US'), '", "message": "', $2::text, '"}')::jsonb)
              WHERE
                id = $1
              RETURNING parameter::jsonb #> '{announcement}' as "announcement"`,
      values: [Number(eventId), message]
    } :
    {
      text: `UPDATE
              event SET
              parameter = parameter::jsonb #- '{announcement}'
             WHERE
              id = $1`,
      values: [Number(eventId)]
    };

    llog.debug('REQUEST updateEventAnnouncement: ', query);
    let res = await client.query(query);
    llog.info(`updated: ${res.rows.length}`);
  
    llog.error({idxen: "event", idxid: eventId, idxop:"upd"}); //indexation
    
    return res.rows.length ? res.rows[0] : null;
}

/**
 * all possible checks whether user can participate in event activities
 * @param {Object} client - database
 * @param {number} eventId - event id
 * @param {number} userId - user id
 * @param {string?} userEmail - user email
 * @returns {Promise<{letmein: boolean, isUserSponsor: boolean}>} Object <br />
 * {letmein: <b>true</b> if event is open for user, <br /> isUserSponsor: <b>true</b> if user is sponsor or user is in sponsor company}
 */
async function checkCanUserViewEvent(client, eventId, userId, userEmail) {
  //or user is sponsor
  //or user is in sponsor company
  let sponsors = await sponsorshipUtil.getSponsorsForEvent(client, eventId);
  for (let sponsor of sponsors) {
    if (sponsor.object_id === 'user' && sponsor.object_ref_id === userId) {
      return {'letmein':true, 'isUserSponsor':true};
    }
    else if (sponsor.object_id === 'company') {
      if (await personnelUtil.isInCompanyPersonnel(client, sponsor.object_ref_id, userId)) {
        return {'letmein':true, 'isUserSponsor':true};
      }
    }
  }

  //if superuser
  const isUber = await permissionUtil.assertIsPlatformEventAccess(client, userId);
  if (isUber) {
    return {letmein:true, isUserSponsor:false, isUber:true};
  }

  //if user has ticket
  if (await ticketUtil.checkTicketExists(client, eventId, userId, ['payed'])) {
    return {'letmein':true, 'isUserSponsor':false};
  }
  //or user is in personnel for event
  if (await personnelUtil.isInEventPersonnel(client, eventId, userId)) {
    return {'letmein':true, 'isUserSponsor':false};
  }
  //or user is in personnel for stand in event
  let standIds = (await standUtils.getStandIdsForEvent(client, eventId));
  for (let standId of standIds) {
    if (await personnelUtil.isInStandPersonnel(client, standId, userId)) {
      return {'letmein':true, 'isUserSponsor':false};
    }
  }

  //or user invited to create stand on the event
  if (userEmail && await standInvitationUtil.invitationExists(client, eventId, userEmail)) {
    return {'letmein':true, 'isUserSponsor':false};
  }

  return {'letmein':false, 'isUserSponsor':false};
}

exports.getEventFromDb = getEventFromDb;
exports.createEventInDb = createEventInDb;
exports.getEventsForTags = getEventsForTags;
exports.updateEventInDbOrThrowException = updateEventInDbOrThrowException;
exports.getEventsForCompany = getEventsForCompany;
exports.populateMultipleEventsWithData = populateMultipleEventsWithData;
exports.getEventsForUserAsVisitor = getEventsForUserAsVisitor;
exports.getEventsForUserAsPersonnel = getEventsForUserAsPersonnel;
exports.searchForEvents = searchForEvents;
exports.updateEventStatus = updateEventStatus;
exports.updateEventAnnouncement = updateEventAnnouncement;
exports.getEventFromDbByNameOrThrowException = getEventFromDbByNameOrThrowException;
exports.getEventFromDbOrThrowException = getEventFromDbOrThrowException;
exports.getSponsoringEventsAsUser = getSponsoringEventsAsUser;
exports.getSponsoringEventsAsCompany = getSponsoringEventsAsCompany;
exports.getActiveEvents = getActiveEvents;
exports.getOngoingEvents = getOngoingEvents;
exports.checkCanUserViewEvent = checkCanUserViewEvent;
