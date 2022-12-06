/**
 * @description Get meetings for user.
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const meetingUtil = require('./model/meeting');
const meetingAttendeesUtil = require('./model/meetingAttendees');
const poolUtil = require('./model/pool');
const personnelUtil = require('./model/personnel');
const standUtil = require('./model/stand');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const stringsUtil = require('./model/strings');

function validateParams(params) {
  return !!params['type'] && validator.isValidMeetingType(params['type']) &&
      (!params['dateStart'] || validator.isValidDate(params['dateStart'])) &&
      (!params['dateEnd'] || validator.isValidDate(params['dateEnd'])) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserGetMeetings');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const company = await personnelUtil.getCompanyAsAPersonnel(client, user['id']);
    const ownStands = await standUtil.getOwnStands(client, 'all', 'all', user['id']);
    const ownStandIds = ownStands.map(e => e['id']);

    let meetings = await meetingUtil.getMeetingsForUser(client, user['id'], company,  ownStandIds.length === 0 ? -1 : ownStandIds);
    const today = new Date();
    switch (data['type']) {
      case 'past':
        meetings = meetings.filter(m => m['dateEnd'] < today);
        break;
      case 'coming':
        meetings = meetings.filter(m => m['dateEnd'] > today);
        break;
    }

    if (meetings.length > 0) {
      if (data['dateStart']) {
        if (!data['dateEnd']) {
          data['dateEnd'] = data['dateStart'];
        }

        meetings = meetings.filter(e => validator.isDateInRange(String(e['dateStart']), data['dateStart'], data['dateEnd']));
      }
    }

    for (const m of meetings) {
      m['strings'] = await stringsUtil.getStringsForEntity(client, 'activity', m['activityId'], data['language']);
      //get presenter for the meetings
      const presenters = await meetingAttendeesUtil.getPresentersFor(client, m['id']);
      if (presenters.length > 0) {
        m['presenter'] = presenters[0]['person'];
      }

      if (m['presenter'] === user['id']) {
        //i'm the presenter, get the user
        const attendees = await meetingAttendeesUtil.getAttendeesFor(client, m['id']);
        if (attendees.length === 1) {
          m['otherUser'] = await personUtil.getPersonById(client, attendees[0]['person']);
        }
      } else {
        // get the presenter
        m['otherUser'] = await personUtil.getPersonById(client, m['presenter']);
      }
    }

    return util.handle200(data, meetings);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
