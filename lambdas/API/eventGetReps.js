/**
 * @description Get personnel for the stand, filetered by public visibility
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const roleUtil = require('./model/role');
const eventUtil = require('./model/event');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const binaryUtils = require('./model/binary');
const meetingUtils = require('./model/meeting');
const activityUtils = require('./model/activity');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
    (!params['roleId'] || validator.isNumber(params['roleId'])) &&
    (!params['str'] || validator.isValidNonEmptyString(params['str'])) &&
    !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaGetEventReps');

  if (!validateParams(data)) {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  let client = util.emptyClient;
  try {

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const viewer = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    const {letmein} = await eventUtil.checkCanUserViewEvent(client, event['id'], viewer['id']);
    if (!letmein) {
      throw new exceptionUtil.ApiException(403, 'Not registered for event');
    }

    let role;
    if (data['roleId']) {
      role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId']);
    }

    //only public
    let personnel = await personnelUtil.getPersonnelForEvent(client, event['id'], role ? role['id'] : null, data['str'] || '', true);
    personnel.forEach(p => {
      if (p['id'] === viewer['id']) {
        p['isCurrent'] = true
      }
    });

    if (personnel.length) {
      //enhance with personnel positions
      const ids = personnel.map(p => p['id']);
      const positions = await personnelUtil.getCompanyPersonnelPositions(client, event['company'], ids);
      for (let i in personnel) {
        if (!!personnel[i]['position']) {
          const personnelEntry = positions.find(p => p['id'] === personnel[i]['id']);
          personnel[i]['position'] = personnelEntry ? personnelEntry['position'] : '';
        }
      }
      //fetch avatars
      const allBranding = await binaryUtils.getBrandingMaterialsForMultipleUsers(client, ids, viewer['language'] || data['language']);
      personnel.forEach((person) => {
        person['branding'] = allBranding.filter(s => s['person'] === person['id']);
      });

      for (const person of personnel) {
        //get meetings for user
        const meetings = await meetingUtils.getMeetingsForUser(client, person['id'], null, -1);
        //get event dates schedule
        const eventSchedule = await activityUtils.getActivitiesForEvent(client, event['id'], 'working_schedule', ["event_timeframe","event_internal"], data['language']);
        //calculate free slots
        person['schedule'] = meetingUtils.getAvailableSlots(eventSchedule, meetings);
      }
    }

    return util.handle200(data, personnel);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
