const KJUR = require('jsrsasign');
const meetingAttendeesUtil = require('./meetingAttendees');
const activityUtil = require('./activity');
const notesUtil = require('./notes');
const util = require('./util');
const externalParamsUtil = require('./externalParams');
const exceptionUtil = require('./exception');

let zoomintegration;
const ROLE_MODERATOR = 'moderator'; 
const ROLE_PRESENTER = 'presenter'; 

async function meetingExistsInDb(client, meetingId) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT id from Meeting where id = $1',
    values: [Number(meetingId)]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  return res.rows.length !== 0;
}

async function getMeetingFromDb(client, meetingId) {
  const llog = client.log || util.log;

  let query = {
    text: 'SELECT * from Meeting where id = $1',
    values: [Number(meetingId)]
  };

  llog.debug("REQUEST:", query);
  const meetingRes = await client.query(query);

  if (meetingRes.rows.length > 0) {
    const presenters = await meetingAttendeesUtil.getPresentersFor(client, meetingId);

    if (presenters.length > 0) {
      meetingRes.rows[0]['presenter'] = presenters[0]['person'];
    }

    return meetingRes.rows[0];
  } else {
    return null;
  }
}

async function createMeetingInDb(client, meeting) {
  const llog = client.log || util.log;

  const query = {
    text: 'INSERT into meeting (url,  chat) values ($1, $2)  returning *',
    values: [meeting['url'], meeting['chat'] ? Number(meeting['chat']) : null]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug(`created: ${res.rows.length}`);

  if (res.rows.length > 0) {
    const newMeeting = res.rows[0];

    if (meeting['presenter']) {
      const presenter = await meetingAttendeesUtil.addModeratorFor(client, newMeeting['id'], meeting['presenter']);
      newMeeting['presenter'] = presenter['person'];
    }

    return newMeeting;
  } else {
    return null;
  }
}

async function updateMeetingInDb(client, meetingId, url) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE meeting set url = $1 where id = $2 returning *',
    values: [url, Number(meetingId)]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("updated:", res.rows);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function deleteMeetingFromDb(client, meetingId) {
  const llog = client.log || util.log;

  await activityUtil.deleteActivityByMeetingId(client, meetingId);
  await meetingAttendeesUtil.deleteAttendeesFor(client, meetingId);

  let query = {
    text: 'DELETE from Meeting where id = $1 returning *',
    values: [Number(meetingId)]
  };

  llog.debug("REQUEST:", query);
  let meetingRes = await client.query(query);
  llog.debug("deleted:", meetingRes.rows.length);

  await notesUtil.deleteNotesForMeeting(client, meetingId);

  if (meetingRes.rows.length > 0) {
    return meetingRes.rows[0];
  } else {
    return null;
  }
}

async function deleteMultipleMeetingsForChatsFromDb(client, chatIds) {
  const llog = client.log || util.log;

  let query = {
    text: 'select id from meeting where chat = ANY($1)',
    values: [chatIds]
  };

  llog.debug("REQUEST:", query);
  let res = await client.query(query);
  llog.debug("selected:", res.rows.length);

  llog.debug(res);
  const meetingIds = res.rows.map(r => r['id']);
  llog.debug(meetingIds);

  await meetingAttendeesUtil.deleteAttendeesForMultipleMeetings(client, meetingIds);
  await activityUtil.deleteMultipleActivitiesByMeetingId(client, meetingIds);

  query = {
    text: 'DELETE from Meeting where id = ANY($1)',
    values: [meetingIds]
  };

  llog.debug("REQUEST:", query);
  await client.query(query);
  llog.debug("deleted");

  await notesUtil.deleteNotesForMultipleMeetings(client, meetingIds);

  return meetingIds.length;
}

async function getMeetingsForUser(client, userId, companyId, standIds) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT m.id,
                  a.id       as "activityId",
                  a.start    as "dateStart",
                  a."end"    as "dateEnd",
                  a.visibility    as visibility,
                  a.value    as activity,
                  m.url,
                  n.value    as "notes",
                  a.event    as "eventId",
                  a.stand    as "standId"
           from activity a
                    left join stand s on (a.stand = s.id)
                    left join meeting m on a.meeting = m.id
                    left join meeting_attendies ma on (ma.meeting = m.id)
                    left join notes n on m.id = n.ref_id and ref = 'meeting' and (n.person = $1 or n.company = $2)
           where a.meeting is not null
             and (ma.person = $1 or s.id IN ($3))`,
    values: [Number(userId), Number(companyId), standIds]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("fetched:", res.rows.length);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

/**
 * Check if current user either host or guest of meeting.
 * 
 * @param {Object[]}      meetingUrl  - zoom meeting url
 * @param {Object[]}      attendees   - array of meeting attendees
 * @param {number|String} userId      - current user ID
 * @returns {Object}                  Object with zoom meeting credentials 
 */
async function getZoomCredentials(meetingUrl, attendees=[], userId) {
  let secretName = process.env.Environment + "/zoomintegration";
    
    const meetingParams = parseZoomURL(meetingUrl); 
    const meetingId = meetingParams.id;
    if (!meetingId) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid meeting id");
    }

    if (!zoomintegration) {
     zoomintegration = JSON.parse(await externalParamsUtil.getSecret(secretName)); 
    }
    
    if (!zoomintegration || !(zoomintegration.secret && zoomintegration.key)) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid meeting parameters");
    }
    
    
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
  
    const oHeader = { alg: 'HS256', typ: 'JWT' };
    const oPayload = {
      sdkKey: zoomintegration.key,
      mn: meetingId,
      role: getZoomUserRole(attendees, userId),
      iat: iat,
      exp: exp,
      tokenExp: iat + 60 * 60 * 2
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const result = {
      secret: KJUR.jws.JWS.sign('HS256', sHeader, sPayload, zoomintegration.secret), 
      sdkKey: zoomintegration.key, 
      role: zoomUserRole,
    };
    
    Object.keys(meetingParams).forEach(key=>{
      result[key] = meetingParams[key];
    });

    return result;
}

/**
 * Check if current user either host or guest of meeting.
 * 
 * @param {Object[]}      attendees - array of meeting attendees
 * @param {number|String} userId    - current user ID
 * @returns {1|0}                   user role 1 - host; 0 - guest;
 */
function getZoomUserRole(attendees=[], userId) {

  if (attendees.length) {
    const moderators = attendees.filter(el=>el.role===ROLE_MODERATOR);
    if (moderators.length) {
      if (moderators.find(el=> el.id === userId)) {
        return 1;
      }
    }       
    const presentors = attendees.filter(el=>el.role===ROLE_PRESENTER);
    if (presentors.length){
      if (presentors.find(el=> el.id === userId)) {
        return 1;
      }
    }

  }

  return 0;
}

/**
 * Decomposes zoom meeting URL and retrieve parameters.
 * 
 * @param {string}      link - zoom meeting url
 * @returns {Object}         Object with meeting parameters. 
 * Example {id:123456789, pwd: some_pass};
 */
function parseZoomURL(link) {
  const enpt = link.split('/').filter(el=>el.match(/^\d{3,}.*/g)).join('');
  const splitted = enpt.split('?').map(part=>part.split('&')).reduce((acc, el)=>{
    return [...acc, ...el];
  }, []);
  const entries = splitted.reduce((acc, el)=>{
      const result = [];
      let val = '';
      if (el.match(/^\d+/g)) {
          result.push('id');
          val = el;
      }else if (el.match(/^([a-zA-Z]|[0-9])+=([a-zA-Z]|[0-9])+/g)) {
          const [key, value] = el.split('=');
          result[0]=key;
          val = value;
      }

      if (result.length > 0) {
        result.push(val);
        acc.push(result);
      }

      return acc;
  }, []);
  
  let prms;
  try {
     prms  = Object.fromEntries(entries)    
  } catch (error) {
     prms = {} ;
  }
  
  return prms;
}

//----------------------------------------------------------------------------

/** part of interval math is taken from moment-range library */
class TimeSlot {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  subtract(other) {
    const llog = util.log;

    llog.debug("subtract");
    const start = this.start;
    const end = this.end;
    const oStart = other.start;
    const oEnd = other.end;
    llog.debug(`${start} ${end} vs ${oStart} ${oEnd}`);

    if (!this.intersectCheck(other)) {
      return [this];
    } else if ((oStart <= start) && (start < end) && (end <= oEnd)) {
      return [];
    } else if ((oStart <= start) && (start < oEnd) && (oEnd < end)) {
      return [new this.constructor(oEnd, end)];
    } else if ((start < oStart) && (oStart < end) && (end <= oEnd)) {
      return [new this.constructor(start, oStart)];
    } else if ((start < oStart) && (oStart < oEnd) && (oEnd < end)) {
      return [new this.constructor(start, oStart), new this.constructor(oEnd, end)];
    } else if ((start < oStart) && (oStart < end) && (oEnd < end)) {
      return [new this.constructor(start, oStart), new this.constructor(oStart, end)];
    }
    return [];
  }

  intersectCheck(other) {
    const llog = util.log;

    llog.debug("intersect");
    const start = this.start;
    const end = this.end;
    const otherStart = other.start;
    const otherEnd = other.end;

    const isZeroLength = (start === end);
    const isOtherZeroLength = (otherStart === otherEnd);

    // Zero-length ranges
    if (isZeroLength) {
      const point = start;

      if ((point === otherStart) || (point === otherEnd)) {
        return false;
      } else if ((point > otherStart) && (point < otherEnd)) {
        return true;
      }
    } else if (isOtherZeroLength) {
      const point = otherStart;

      if ((point === start) || (point === end)) {
        return false;
      } else if ((point > start) && (point < end)) {
        return true;
      }
    }

    // Non zero-length ranges
    if ((start <= otherStart) && (otherStart < end) && (end < otherEnd)) {
      return true;
    } else if ((otherStart < start) && (start < otherEnd) && (otherEnd <= end)) {
      return true;
    } else if ((otherStart < start) && (start <= end) && (end < otherEnd)) {
      return true;
    } else if ((start <= otherStart) && (otherStart <= otherEnd) && (otherEnd <= end)) {
      return true;
    }

    return false;
  }
}

/**
 * calculate free time slots for a person
 * @param schedule - schedule with working time agenda
 * @param bookedMeetings - schedule with meetings agenda
 * @returns {*}
 */
function getAvailableSlots(schedule, bookedMeetings) {
  const llog = util.log;

  const result = [];

  llog.debug("schedule: ", schedule);
  llog.debug("bookedMeetings: ", bookedMeetings);

  const bookedTimeSlots = bookedMeetings.map(m => {
    return new TimeSlot(m['dateStart'],m['dateEnd']);
  });

  let freeTimeSlots = schedule.map(m => {
    return new TimeSlot(m['start'],m['end']);
  });

  llog.debug("freeTimeSlots: ",freeTimeSlots);

  bookedTimeSlots.forEach(b => {
    const nextIteration = [];
    freeTimeSlots.forEach(s => {
      s.subtract(b).forEach(function(obj){  //returned array should be exploded to push
        nextIteration.push(obj);
      });
    });
    freeTimeSlots = nextIteration;
    llog.debug("now freeTimeSlots: ",freeTimeSlots);
  });
  return freeTimeSlots;
}

//----------------------------------------------------------------------------



exports.meetingExistsInDb = meetingExistsInDb;
exports.createMeetingInDb = createMeetingInDb;
exports.getMeetingFromDb = getMeetingFromDb;
exports.updateMeetingInDb = updateMeetingInDb;
exports.deleteMeetingFromDb = deleteMeetingFromDb;
exports.deleteMultipleMeetingsForChatsFromDb = deleteMultipleMeetingsForChatsFromDb;
exports.getMeetingsForUser = getMeetingsForUser;
exports.getAvailableSlots = getAvailableSlots;
exports.getZoomCredentials = getZoomCredentials;