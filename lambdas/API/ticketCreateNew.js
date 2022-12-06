/**
 * @description Create new ticket.
 * @class ticketCreateNew
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');
const pricingUtil = require('./model/eventPricing');
const ticketUtil = require('./model/ticket');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const stringUtils = require('./model/strings');
const emailUtils = require('./model/email');

function validateParams(params) {
  return !params['id'] &&
    !!params['event'] && validator.isNumber(params['event']) &&
    (!params['stand'] || validator.isNumber(params['stand'])) &&
    !!params['pricing'] && validator.isNumber(params['pricing']) &&
    (!params['payment_status'] || validator.isValidTicketPaymentStatus(params['payment_status']));  //todo security breach, should not use that
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaTicketCreateNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['ticket']) || !data['language'] || !validator.isValidLanguage(data['language'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    //we create safe structure
    let ticket = {
      buyer: user['id'],
      event: event['id'],
      parameter: {}
    }

    const ticketExists = await ticketUtil.checkTicketExists(client, ticket.event, ticket.buyer);
    if (ticketExists) {
      throw new exceptionUtil.ApiException(405, 'Ticket already exists');
    }

    //TODO check if this ticket for a stand used anywhere
    if (data['ticket']['stand']) {
      let stand = await standUtil.getStandFromDbOrThrowException(client, data['ticket']['stand']);
      if (stand['event'] !== event['id'] || stand['status'] === 'cancelled' || stand['status'] === 'template') {
        throw new exceptionUtil.ApiException(405, 'Invalid stand requested');
      }
      ticket.stand = data['ticket']['stand'];
    }

    const pricing = await pricingUtil.getPricingByIdOrThrowException(client, data['ticket']['pricing']);
    if (pricing['event'] != data['eventId'] || !pricing['is_enabled']) {
      throw new exceptionUtil.ApiException(405, 'Invalid pricing requested');
    }
    ticket.pricing = pricing['id'];
    ticket.tags = pricing['tags'];
    ticket.payment_status = pricing['parameter']['manual_approval']
      ? ticketUtil.STATUS_NOT_PAYED
      : ticketUtil.STATUS_PAYED;

    if (pricing['parameter']['expiration']) {
      ticket.parameter['expiration'] = util.formatDateYMD(ticketUtil.calculateExpirationDate(new Date(), pricing['parameter']['expiration']));
    }

    let pricingStrings = await stringUtils.getStringsForEntity(client, 'pricing', pricing['id'], data['language']);
    pricing['strings'] = pricingStrings || [];

    //create ticket
    let newTicket = await ticketUtil.createTicketInDb(client, ticket);
    //welcome email
    await emailUtils.sendEventRegistrationEmail(client, event, pricing, data['origin'], user['email'], data['language']);
    newTicket = ticketUtil.prepareTicketForOutput(newTicket);

    return util.handle200(data, newTicket);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
