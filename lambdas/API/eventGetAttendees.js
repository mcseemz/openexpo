/**
 * @description Get all users with a ticket to a given event.
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const ticketUtil = require('./model/ticket');
const binaryUtils = require('./model/binary');
const userUtil = require("./model/person");

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      (!params['searchBy'] || validator.isValidNonEmptyString(params['searchBy'])) &&
      (!params['pageNum'] || validator.isNumber(params['pageNum'])) &&
      (!params['recordsPerPage'] || validator.isNumber(params['recordsPerPage'])) &&
      (!params['status'] || validator.isValidTicketPaymentStatus(params['status'])) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetAttendees');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const viewer = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    await permissionUtil.assertCanViewEventReports(client, viewer['id'], event['id']);

    let attendees = await personUtil.getEventAttendees(client, event['id'], data['pageNum'], data['recordsPerPage'], data['searchBy'],
      data['status'] ? [data['status']] : ticketUtil.STATUS_ALL_CUSTOMER);

    const userids = [];
    for (let attendee of attendees) {
      userids.push(attendee.userid);
    }
    const allBranding = await binaryUtils.getBrandingMaterialsForMultipleUsers(client, userids, viewer['language'] || data['language']);
    attendees.forEach((person) => {
      userUtil.preparePersonForOutput(attendee);  //fields cleanup
      person['branding'] = allBranding.filter(s => s['person'] === person['userid']).map(x => x.url);
    });

    return util.handle200(data, attendees);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
