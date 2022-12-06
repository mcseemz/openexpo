/**
 * @description Get personnel for the stand admin panel, filetered by role and name/surname
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const roleUtil = require('./model/role');
const standUtil = require('./model/stand');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const binaryUtils = require('./model/binary');
const permissionUtil = require('./model/permissions');
const meetingUtils = require('./model/meeting');
const activityUtils = require('./model/activity');
const ticketUtil = require("./model/ticket");

function validateParams(params) {
  return !!params['standId'] && (!params['roleId'] || validator.isNumber(params['roleId'])) &&
      (!params['str'] || validator.isValidNonEmptyString(params['str'])) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandGetPersonnel');

  if (!validateParams(data)) {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  let client = util.emptyClient;
  try {

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const viewer = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);

    let role;
    if (data['roleId']) {
      role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId']);
    }

    let personnel = [];
    if (await permissionUtil.assertCanAssignPersonnelToTheStand(client, viewer['id'], stand['id'], true)) { //can see personnel
      personnel = await personnelUtil.getPersonnelForStand(client, stand['id'], role ? role['id'] : null, data['str'] || '', undefined, true);

      const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);

      const ids = personnel.map(p => p['id']);
      const allBranding = ids.length
        ? await binaryUtils.getBrandingMaterialsForMultiplePersonnel(client, ids, viewer['language'] || data['language'])
        : [];

      const userids = personnel.map(p => p['personid']).filter(element => { return element !== undefined && element > 0; });
      client.log.debug(`we have ${userids} real persons`);

      const allTickets = userids.length
        ? await ticketUtil.getForMultipleUsersAndEvent(client, userids, stand['eventId'])
        : [];

      //get event dates schedule
      const eventSchedule = await activityUtils.getActivitiesForEvent(client, stand['eventId'], 'working_schedule',
        ["event_timeframe","event_internal"], data['language']);

      for (const p of personnel) {
        if (p['personid'] === viewer['id']) {
          p['isCurrent'] = true
        }

        p['branding'] = allBranding.filter(s => s['ref_id'] === p['id']);

        if (p['personid'] > 0) {  //assign DirectLoginLinks if personnel mapped to real person. Get emails for such from persons
          const emailAlias = await personUtil.getEmailAliasForEvent(client, p['personid'], stand['eventId']);
          if (emailAlias !== null) {  //for real mail there may be no alias, so no irect login option
            personUtil.generateDirectLinks(p, shortDomain, stand['eventId'], emailAlias);
          }

          //get ticket for a person
          const persticket = allTickets.filter(s => {
            const res = s['buyer'] === p['personid'] && s['payment_status'] === 'personnel';
            client.log.debug(`matching ${s['buyer']} and ${p['personid']}, status ${s['payment_status']}, result ${res}`);

            return res;
          });
          if (persticket.length > 0) {
            client.log.debug(`we have match`, persticket[0]);
            p['price'] = persticket[0]['pricing'];
          }
        }

        //get meetings for user
        const meetings = await meetingUtils.getMeetingsForUser(client, p['personid'], null, -1);
        //calculate free slots
        p['schedule'] = meetingUtils.getAvailableSlots(eventSchedule, meetings);

        delete p['personid'];
      }
    }
    return util.handle200(data, personnel);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
