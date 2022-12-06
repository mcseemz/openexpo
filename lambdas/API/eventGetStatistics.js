/**
 * @description Get event statistics.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');
const eventPricingUtil = require('./model/eventPricing');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetStatistics');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const event = await eventUtil.getEventFromDb(client, data['eventId']);

    if (event == null) {
      throw new exceptionUtil.ApiException(404, 'Event not found');
    }

    const stat = {};
    stat['numOfStands'] = await standUtil.numberOfStandsForEvent(client, event['id']);
    stat['tickets'] = await eventPricingUtil.getTicketNumPerPricing(client, event['id']);
    stat['moneyPerPricing'] = await eventPricingUtil.getMoneyPerPricing(client, event['id']);
    stat['moneyPerPricingTotal'] = stat['moneyPerPricing'].length > 0 ? stat['moneyPerPricing'].reduce((t, c) => t + Number(c['money']), 0) : 0;

    return util.handle200(data, stat);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
