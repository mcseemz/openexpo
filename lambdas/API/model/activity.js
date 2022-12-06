/**
 *  @description Activity module
 *  @class activityUtil
 */
const dateUtil = require('./date');
const stringUtils = require('./strings');
const personnelUtil = require('./personnel');
const exceptionUtil = require('./exception');
const binaryUtil = require('./binary');
const customnNameUtil = require('./customname')
const util = require('./util');
const validator = require('./validation');
const {ApiError} = require("./exception");
const AGENDA = 'agenda';
const WORKING_SCHEDULE = 'working schedule';

const ACTIVITY_FIELDS=
  `a.id,
a.stand,
a.event,
a.meeting,
a.start,
a.end,
a.value,
a.visibility,
a.creator,
a.records,
a.tags,
a.custom_name as "customName"`;

/**
 * duration of the event that is recorded in detail by day
 */
const DETAIL_RECORD_BOUNDARY = 3;
/**
 * create new record in Activity table
 * @param {Object} client - PG client
 * @param {Object} params -
 * @param {number} eventId - event id
 * @param {number} userId - user id
 * @returns  {Promise<Object>} newly created record
 */
async function createActivityInDb(client, params, eventId, userId) {
  const llog = client.log || util.log;

  const query = {
    text: 'INSERT INTO Activity(stand, event, meeting, start, "end", value, visibility, creator, tags, custom_name) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) RETURNING *',
    values: [
      params['stand'] ? Number(params['stand']) : null,
      Number(eventId),
      params['meeting'] ? Number(params['meeting']) : null,
      new Date(Date.parse(params['start'])),
      new Date(Date.parse(params['end'])),
      params['value'],
      params['visibility'],
      Number(userId),
      JSON.stringify(params['tags']) || '[]',
      params['customName'] || '']
  };

  llog.debug('createActivityInDb REQUEST: ', query);
  let res = await client.query(query);
  llog.debug('created: ', res.rows[0]);
  llog.error({idxen: "activity", idxid: res.rows[0]['id'], idxop:"ins"}); //indexation

  const newActivity = getActivityFromDb(client, res.rows[0]['id']);
  newActivity['strings'] = [];
  return newActivity;
}

/**
 * identify activity by stand and meeting. do not fetch strings for it.
 * Return null if not found
 * @param {Object} client
 * @param {number|String} activityId
 * @param {String} language
 * @returns {Promise<*[]|*>}
 */
async function getActivityFromDb(client, activityId, language) {
  const llog = client.log || util.log;

  const searchColumnName = validator.isNumber(activityId) ? 'id' : 'custom_name';
  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl"
           from Activity a
                    left join meeting m on m.id = a.meeting
           where a.${searchColumnName} = $1`,
    values: [activityId]
  };

  llog.debug('REQUEST getActivityFromDb: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    res.rows[0]['strings'] = await stringUtils.getStringsForEntity(client, 'activity', Number(res.rows[0]['id']), language);
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * identify activity by id. Fetch strings for it.
 * Throw exception if not found
 * @param {Object} client
 * @param {number|String} activityId
 * @param {String} language
 * @returns {Promise<*[]|*>}
 */
async function getActivityFromDbOrThrowException(client, activityId, language) {
  const llog = client.log || util.log;

  const searchColumnName = validator.isNumber(activityId) ? 'id' : 'custom_name';
  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, e.timezone, m.url as "meetingUrl"
           from Activity a
                    join event e on e.id = a.event
                    left join meeting m on m.id = a.meeting
           where a.${searchColumnName} = $1`,
    values: [activityId]
  };

  llog.debug('REQUEST getActivityFromDbOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    res.rows[0]['strings'] = await stringUtils.getStringsForEntity(client, 'activity', Number(res.rows[0]['id']), language);
    await populatePersonnelForAttendees(client, res.rows, res.rows[0]['stand'] ? undefined : res.rows[0]['event'], res.rows[0]['stand']);
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Activity not found');
  }
}

/**
 * identify activity by id. Fetch meetingUrl for it.
 * Return null if not found
 * @param {Object} client
 * @param {number|String} activityId
 * @returns {Promise<*[]|*>}
 */
async function getSimpleActivityFromDb(client, activityId) {
  const llog = client.log || util.log;

  const searchColumnName = validator.isNumber(activityId) ? 'id' : 'custom_name';
  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl"
           from Activity a
                    left join meeting m on m.id = a.meeting
           where a.${searchColumnName} = $1`,
    values: [activityId]
  };

  llog.debug('REQUEST getSimpleActivityFromDb: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * fetch localized strings for given activities
 * @param {Object} client - database
 * @param {Object[]} objects - array of activities
 * @param {string} [language] - to get descriptions localized
 * @returns {Promise<void>}
 */
async function populateStringsForMultipleObjects(client, objects, language) {
  const activityIds = objects.map(e => e['id']);
  const additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'activity', activityIds, language);

  if (additionalStrings != null) {
    objects.forEach((act) => {
      act['strings'] = additionalStrings.filter(s => s['ref_id'] === act['id']);
      act['strings'].forEach(s => delete s['ref_id']);
    });
  }
}

/**
 * add information on attendees to display in official schedule.
 * non-public persons will become visible by that
 * @param {Object} client - database
 * @param {Object[]} rows - array of rows resulted by activity fetch
 * @param {number} eventId - event id - optional, in that case standId should exist
 * @param {number?} standId - stand id - optional, in that case eventId should exist
 * @returns {Promise<void>}
 */
async function populatePersonnelForAttendees(client, rows, eventId, standId) {
  //hydrate attendees list
  for (const row of rows) {
    if (row['value']['attendees']) {
      /* storage:
              {
                  "id": 3,
                  "role": "presenter"
              },
       */
      //we get position, name and logo
      for (const attendee of row['value']['attendees']) {
        let data;
        try {
          data = await personnelUtil.getPersonnelById(client, attendee['id'] || -1);
          if (!data ||  //no such personnel
            (eventId && (data['event'] != eventId)) ||
            (standId && (data['stand'] != standId))) { //personnel does not belong here
            data = { position: "---", name:"inactivated user", surname:"", id: -1 };
          }
        } catch (e) {
          if (e instanceof ApiError && e.code === exceptionUtil.NotFound) {
            data = { position: "---", name:"deactivated user", surname:"", id: -1 };
          }
          else throw e;
        }
        attendee['id'] = data.id;
        attendee['position'] = data.position;
        attendee['name'] = data.name;
        attendee['surname'] = data.surname;
        attendee['address'] = {
          facebook: data['address'] ? data['address']['facebook'] : null,
          instagram: data['address'] ? data['address']['instagram'] : null,
          linkedin: data['address'] ? data['address']['linkedin'] : null,
          twitter: data['address'] ? data['address']['twitter'] : null
        };
        if (data['id'] > 0) {
          (await binaryUtil.getBrandingMaterialsForPersonnel(client, data['id']))
            .forEach(r => attendee['logo'] = r['url']);

          if (data['personid'] === client.userId) {
            attendee['isYou'] = true;
          }
        }
      }
    }
  }
}

/**
 * get publushed activities for an event (not stand)
 * @param {Object} client - database
 * @param {number} eventId - event id
 * @param {string} type - agenda|working schedule
 * @param {string[]} visibilities - event_internal|prvate_meeting|event_published|visitor_proposed etc.
 * @param {string} language - to get descriptions localized
 * @returns {Promise<Object[]>}
 */
async function getActivitiesForEvent(client, eventId, type, visibilities, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl"
           from Activity a
                    left join meeting m on m.id = a.meeting
           where a.event = $1
             and (jsonb_array_length($2::jsonb)=0 or a.tags @> $2::jsonb)
             and a.visibility = ANY ($3)
             and a.stand is null
           order by a.start`,
    values: [Number(eventId), type ? JSON.stringify(['type:' + type]): '[]', visibilities]
  };

  llog.debug('getActivitiesForEvent REQUEST: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    await populateStringsForMultipleObjects(client, res.rows, language);
    await populatePersonnelForAttendees(client, res.rows, eventId);

    const activityIds = res.rows.map(e => e['id']);
    const allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', 'activity', activityIds);

    res.rows.forEach((c) => {
      c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
    });

    return res.rows;
  } else {
    return [];
  }
}

/**
 * get publushed activities for a stand (not event)
 * @param {Object} client - database
 * @param {number} standId - stand id
 * @param {string} type - agenda|working schedule
 * @param {string[]} visibilities - event_internal|prvate_meeting|event_published|visitor_proposed etc.
 * @param {string} language - to get descriptions localized
 * @returns {Promise<Object[]>}
 */
async function getActivitiesForStand(client, standId, type, visibilities, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl"
           from Activity a
                    left join meeting m on m.id = a.meeting
           where a.stand = $1
             and (jsonb_array_length($2::jsonb)=0 or a.tags @> $2::jsonb)
             and a.visibility = ANY ($3)
           order by a.start`,
    values: [Number(standId), type ? JSON.stringify(['type:' + type]) : '[]', visibilities]
  };

  llog.debug('REQUEST getActivitiesForStand: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    await populateStringsForMultipleObjects(client, res.rows, language);
    await populatePersonnelForAttendees(client, res.rows, null, standId);

    const activityIds = res.rows.map(e => e['id']);
    const allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', 'activity', activityIds);

    res.rows.forEach((c) => {
      c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
    });

    return res.rows;
  } else {
    return [];
  }
}

/**
 * get upcoming publushed activities for an event and stands. interval 10 minutes
 * we consider start saved in event timezone
 * @param {Object} client - database
 * @param {number} eventId - event id
 * @param {string} type - agenda|working schedule
 * @param {string[]} visibilities - event_internal|prvate_meeting|event_published|visitor_proposed etc.
 * @param {string?} language - to get descriptions localized
 * @returns {Promise<Object[]>}
 */
async function getActivitiesUpcoming(client, eventId, type, visibilities, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl", s.status as "standStatus"
           from Activity a
                    left join meeting m on m.id = a.meeting
                    left join stand s on s.id = a.stand
                    left join event e on e.id = a.event
           where a.event = $1
             and (jsonb_array_length($2::jsonb)=0 or a.tags @> $2::jsonb)
             and a.visibility = ANY ($3)
             and a.start BETWEEN NOW() AND NOW() + ('5 minutes')::INTERVAL
           order by a.start`,
    values: [Number(eventId), type ? JSON.stringify(['type:' + type]) : '[]', visibilities]
  };

  llog.debug('REQUEST getActivitiesUpcoming: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    //remove not published stands
    res.rows = res.rows.filter(x => !x['stand'] || x['standStatus'] === 'published');

    await populateStringsForMultipleObjects(client, res.rows, language);
    for (row of res.rows) {
      //stand attendees should
      await populatePersonnelForAttendees(client, [row], row['stand'] ? null : eventId, row['stand'] || null);
    }

    return res.rows;
  } else {
    return [];
  }
}

/**
 * identify activity by stand and meeting. do not fetch strings for it.
 * Throw exception if not found
 * @param {Object} client
 * @param {number} standId
 * @param {number} meetingId
 * @returns {Promise<*[]|*>}
 */
async function getActivityForStandByMeetingOrThrowException(client, standId, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}
           from Activity a
           where a.stand = $1
             and a.meeting = $2`,
    values: [Number(standId), Number(meetingId)]
  };

  llog.debug('REQUEST getActivityForStandByMeetingOrThrowException: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    throw new exceptionUtil.ApiException(404, 'Activity not found');
  }
}

/**
 * search  proposed activities by eventIds . Fetch strings for it.
 * Return array of activities suitable for the given event ids ordered by their start date
 * @param {Object} client
 * @param {[number]} eventIds
 * @param {number} language
 * @returns {Promise<*[]|*>}
 */
async function getProposedActivitiesForMultipleEvents(client, eventIds, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl"
           from Activity a
                    left join meeting m on m.id = a.meeting
           where a.visibility = 'stand_proposed'
             and a.event = ANY ($1)
           order by a.start`,
    values: [eventIds]
  };

  llog.debug('REQUEST getProposedActivitiesForMultipleEvents: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    await populateStringsForMultipleObjects(client, res.rows, language);
    return res.rows;
  } else {
    return [];
  }
}

/**
 * replace basic activity fields
 * @param {Object} client
 * @param {Object} activity
 * @param {string} [language]
 * @returns {Promise<*|null>}
 */
async function updateActivityById(client, activity, language) {
  const llog = client.log || util.log;

  const query = {
    text: `UPDATE Activity set start = $1, "end" = $2, value = $3, visibility = $4, tags = $5::jsonb, custom_name = $6 where id = $7 returning 1`,
    values: [new Date(Date.parse(activity['start'])), new Date(Date.parse(activity['end'])),
      activity['value'], activity['visibility'], JSON.stringify(activity['tags'])||'[]', activity['customName'], Number(activity['id'])]
  };

  llog.debug('REQUEST updateActivityById: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);
  llog.error({idxen: "activity", idxid: Number(activity['id']), idxop:"upd"}); //indexation

  if (res.rows.length > 0) {
    return await getActivityFromDb(client, activity['id'], language);
  } else {
    return null;
  }
}

/**
 * add activity records information. atomic operation
 * @param {Object} client
 * @param {number} activityId
 * @param {string} url - path to new record. can be either external url (https://...) or s3://
 * @returns {boolean}
 */
async function updateActivityRecordsById(client, activityId, url) {
  const llog = client.log || util.log;

  const query = {
    text: `UPDATE Activity set records = COALESCE(records, '[]'::JSONB) || concat('["',$1::text,'"]')::JSONB where id = $2 returning 1`,
    values: [url, Number(activityId)]
  };

  llog.debug('REQUEST updateActivityRecordsById: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);
  //no indexation required for this

  return res.rows.length > 0;
}

/**
 *
 * @param {Object} client
 * @param {Number} activityId
 * @param {Boolean} visibility
 * @param {string} language
 * @returns {Promise<*|null>}
 */
async function updatePromotionStatus(client, activityId, visibility, language) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE Activity set visibility = $1 where id = $2 returning *',
    values: [visibility, Number(activityId)]
  };

  llog.debug('REQUEST updatePromotionStatus: ', query);
  let res = await client.query(query);
  llog.debug('updated: ', res.rows[0]);
  llog.error({idxen: "activity", idxid: activityId, idxop:"upd"}); //indexation

  if (res.rows.length > 0) {
    res.rows[0]['strings'] = await stringUtils.getStringsForEntity(client, 'activity', Number(activityId), language);
    return res.rows[0];
  } else {
    return null;
  }
}

async function proposeForPromotion(client, activityId, language) {
  return updatePromotionStatus(client, activityId, 'stand_proposed', language);
}

async function updateVisibilityForStandActivity(client, activityId, visibility, language) {
  return updatePromotionStatus(client, activityId, visibility, language);
}

async function deleteActivityById(client, activityId) {
  const llog = client.log || util.log;

  const query = {
    text: 'delete from Activity where id = $1 returning *',
    values: [Number(activityId)]
  };

  llog.debug('REQUEST deleteActivityById: ', query);
  let res = await client.query(query);
  llog.debug('deleted: ', res.rows[0]);
  llog.error({idxen: "activity", idxid: activityId, idxop:"del"}); //indexation

  for (let i in res.rows) {
    //delete strings
    await stringUtils.deleteStringsRelatedToEntityIfExists(client, res.rows[i]['id'], 'activity');
    //delete binaries
    await binaryUtil.deleteBinariesForRefEntity(client, 'branding', 'activity', res.rows[i]['id'], client.uploadsBucket);
  }
}

async function deleteActivityByMeetingId(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: 'delete from Activity where meeting = $1 returning *',
    values: [Number(meetingId)]
  };

  llog.debug('REQUEST deleteActivityByMeetingId: ', query);
  let res = await client.query(query);
  llog.debug('deleted: ', res.rows[0]);
  if (res.rows.length > 0) {
    llog.error({idxen: "activity", idxid: res.rows[0]['id'], idxop: "del"}); //indexation
  }

  if (res.rows.length > 0) {
    await stringUtils.deleteStringsRelatedToEntityIfExists(client, res.rows[0]['id'], 'activity');
    return res.rows[0];
  } else {
    return null;
  }
}

async function deleteMultipleActivitiesByMeetingId(client, meetingIds) {
  const llog = client.log || util.log;

  const query = {
    text: 'DELETE from activity where meeting = ANY($1)',
    values: [meetingIds]
  };

  llog.debug('REQUEST deleteMultipleActivitiesByMeetingId: ', query);
  let res = await client.query(query);
  llog.debug(`deleted: ${res.rows.length}`);

  if (res.rows.length > 0) {
    for (const r of res.rows) {
      llog.error({idxen: "activity", idxid: r['id'], idxop:"del"}); //indexation
      await stringUtils.deleteStringsRelatedToEntityIfExists(client, r['id'], 'activity');
    }
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * create working schedule for specified event. Rules are:<br/>
 * if event takes more than 3 days, create only first and last date<br/>
 * otherwise, create all<br/>
 * starting hour is taken from dateStart, ending from dateEnd, times are already in gMT
 * @param {Object} client - PG client
 * @param {{id: Number, dateStart: Date, dateEnd: Date, timezone: Number}} event - event
 * @param {number} userId
 */
async function createDefaultSchedule(client, event, userId) {
  const start = dateUtil.purifyDateSeconds(new Date(Date.parse(event['dateStart'])));
  let end = dateUtil.purifyDateSeconds(new Date(Date.parse(event['dateEnd'])));

  const startHours = start.getHours();
  const endHours = end.getHours();
  const dateShift = startHours < endHours ? 0 : 1;

  end = dateUtil.addDays(end, -dateShift); //actually, final working day starts on a previous date
  let currStart = new Date(start);
  const isLongTermEvent = dateUtil.diffDays(start, end) > DETAIL_RECORD_BOUNDARY;
  while (dateUtil.dateIsNotAfter(currStart, end)) {
    if (isLongTermEvent && !(dateUtil.datesAreEqual(currStart, start) || dateUtil.datesAreEqual(currStart, end))) {
      currStart = dateUtil.addDays(currStart, 1);
      continue;
    }

    let currEnd = dateUtil.addDays(currStart, dateShift);
    currEnd.setHours(end.getHours());
    currEnd.setMinutes(end.getMinutes());

    await createActivityInDb(client,{
      start: currStart,
      end: currEnd,
      value: {value: 'worktime'},
      visibility: 'event_internal',
      tags: ['type:working_schedule'],
      customName: customnNameUtil.getSubstituteName()
    }, event['id'], userId);

    currStart = dateUtil.addDays(currStart, 1);
  }
}

async function attachMeeting(client, activityId, meetingId, language) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE Activity set meeting = $1 where id = $2 returning *',
    values: [Number(meetingId), Number(activityId)]
  };

  llog.debug('REQUEST attachMeeting: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  if (res.rows.length > 0) {
    res.rows[0]['strings'] = await stringUtils.getStringsForEntity(client, 'activity', Number(activityId), language);
    return res.rows[0];
  } else {
    return null;
  }
}

async function detachMeeting(client, activityId) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE Activity set meeting = null where id = $1 returning *',
    values: [Number(activityId)]
  };

  llog.debug('REQUEST detachMeeting: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function getActivitiesPublicForEventAndTags(client, eventId, tags, language) {
  return getActivitiesForTags(client, eventId, null, ['event_published'], tags, language);
}

async function getActivitiesPublicForStandAndTags(client, standId, tags, language) {
  return getActivitiesForTags(client, null, standId, ['stand_public'], tags, language);
}

/**
 * get publushed activities by event and tags
 * @param {Object} client - database
 * @param {number} eventId - event id
 * @param {number} standId - stand id
 * @param {string[]} tags - tags
 * @param {string[]} visibilities - event_internal|prvate_meeting|event_published|visitor_proposed etc.
 * @param {string} language - to get descriptions localized
 * @returns {Promise<Object[]>}
 */
async function getActivitiesForTags(client, eventId, standId, visibilities, tags, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${ACTIVITY_FIELDS}, m.url as "meetingUrl"
           from Activity a
                    left join meeting m on m.id = a.meeting
           where
             CASE
               WHEN $1::int IS NULL THEN true
               ELSE a.event = $1::int END
             AND CASE
               WHEN $2::int IS NULL THEN true
               ELSE a.stand = $2::int END
             and a.tags::jsonb ?| $3
             and a.visibility = ANY ($4)
           order by a.start`,
    values: [eventId ? Number(eventId) : null, standId ? Number(standId) : null, tags, visibilities]
  };

  llog.debug('REQUEST getActivitiesForTags: ', query);
  const res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    await populateStringsForMultipleObjects(client, res.rows, language);
    await populatePersonnelForAttendees(client, res.rows, eventId ? Number(eventId) : eventId, standId ? Number(standId) : standId);
    return res.rows;
  } else {
    return [];
  }
}


exports.createActivityInDb = createActivityInDb;
exports.getActivityFromDb = getActivityFromDb;
exports.getActivityFromDbOrThrowException = getActivityFromDbOrThrowException;
exports.getActivitiesForEvent = getActivitiesForEvent;
exports.getActivitiesForStand = getActivitiesForStand;
exports.getActivitiesUpcoming = getActivitiesUpcoming;
exports.updateActivityById = updateActivityById;
exports.updateActivityRecordsById = updateActivityRecordsById;
exports.deleteActivityById = deleteActivityById;
exports.createDefaultSchedule = createDefaultSchedule;
exports.proposeForPromotion = proposeForPromotion;
exports.getProposedActivitiesForMultipleEvents = getProposedActivitiesForMultipleEvents;
exports.updateVisibilityForStandActivity = updateVisibilityForStandActivity;
exports.attachMeeting = attachMeeting;
exports.detachMeeting = detachMeeting;
exports.getSimpleActivityFromDb = getSimpleActivityFromDb;
exports.deleteActivityByMeetingId = deleteActivityByMeetingId;
exports.deleteMultipleActivitiesByMeetingId = deleteMultipleActivitiesByMeetingId;
exports.getActivityForStandByMeetingOrThrowException = getActivityForStandByMeetingOrThrowException;
exports.getActivitiesPublicForEventAndTags = getActivitiesPublicForEventAndTags;
exports.getActivitiesPublicForStandAndTags = getActivitiesPublicForStandAndTags;

exports.AGENDA = AGENDA;
exports.WORKING_SCHEDULE = WORKING_SCHEDULE;
