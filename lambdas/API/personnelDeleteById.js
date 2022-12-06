/**
 * @description Remove user from the company's event.
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personnelUtil = require('./model/personnel');
const personUtil = require('./model/person');
const externalParamsUtil = require('./model/externalParams');
const eventUtil = require('./model/event');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const standUtil = require("./model/stand");
const pricingUtil = require("./model/eventPricing");
const ticketUtil = require("./model/ticket");

function validateParams(params) {
  return (params['type'] === 'event' || params['type'] === 'stand') &&
    !!params['typeId'] && validator.isNumber(params['typeId']) &&
    !!params['personnelId'] && validator.isNumber(params['personnelId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPersonnelDeleteById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //current user
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let eventId = null;
    //check if object exists
    const personnel = await personnelUtil.getPersonnelById(client, data['personnelId'],true, data['language']);
    if (!personnel) {
      throw new exceptionUtil.ApiException(404, 'Personnel not found');
    }
    //check if user has permission
    if (data['type'] === 'event' ) {
      eventId = data['typeId'];
      await eventUtil.getEventFromDbOrThrowException(client, data['typeId']);
      await permissionUtil.assertCanAssignPersonnelToTheEvent(client, user.id, data['typeId']);

      if (personnel['event'] != eventId) {
        throw new exceptionUtil.ApiException(405, 'Invalid personnel parameters');
      }
    }
    else if (data['type'] === 'stand' ) {
      let stand = await standUtil.getStandFromDbOrThrowException(client, data['typeId']);
      eventId = stand['eventId'];
      await permissionUtil.assertCanAssignPersonnelToTheStand(client, user.id, data['typeId']);

      if (personnel['stand'] != stand['id']) {
        throw new exceptionUtil.ApiException(405, 'Invalid personnel parameters');
      }

    }
    else throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');

    if (personnel['personid'] > 0) { //real person, unregistering from cognito
      //BUT FIRST check if this person is in some other personnel for this event
      const membership = await personnelUtil.findMembershipOnEvent(client, personnel['personid'], eventId);
      if (membership.length === 1) {  //the only time they registered on the event
        await personUtil.unregisterPersonForEvent(client, eventId, personnel['email']);
        //and sending email
        const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
        let sender = await externalParamsUtil.getSenderEmail(shortDomain);
        await personnelUtil.sendUnregisterEmail(client, sender, eventId, personnel['email'], personnel['person']);

        //delete ticket for a person
        const tickets = await ticketUtil.getActiveForUserAndEvent(client, persrecord['personid'], eventId);
        for (ticket of tickets) {
          if (ticket.payment_status === 'personnel' && ticket.pricing !== pricing['id']) {
            //this one we should update
            await ticketUtil.updatePaymentStatus(client, ticket['id'], 'cancelled');
          }
        }
      }
    }

    const deleted = await personnelUtil.deletePersonnelById(client, personnel['id']);
    if (deleted === 0) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, 'Problem deleting personnel');
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
