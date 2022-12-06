/**
 * @description Update pricing for the event.
 * @class eventPricingUpdate 
 */

const validator = require('./model/validation');
const eventPricingUtil = require('./model/eventPricing');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const eventUtil = require('./model/event');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');

function validateParams(pricing, params) {
  return !!pricing['id'] && validator.isNumber(pricing['id']) &&
    !!params['eventId'] && validator.isNumber(params['eventId']) &&
    (!pricing['expiration'] || validator.isValidPricingExpiration(pricing['expiration'])) &&
    !!pricing['pricing_plan'] && validator.isValidPricingPlan(pricing['pricing_plan']) &&
    (!!pricing['access_price'] && validator.isNumber(pricing['access_price']) || pricing['access_price'] == 0) &&
    !!pricing['access_currency'] && validator.isValidNonEmptyString(pricing['access_currency']) &&
    !!pricing['quantity'] && validator.isNumber(pricing['quantity']) && validator.isPositive(pricing['quantity']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPricingUpdate', 'pricing_change', 'event', data['eventId']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data['pricing'], data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    client.log.info('context', context);  //let's check if we have user in contet

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    await permissionUtil.assertCanManageEventMoney(client, user['id'], event['id']);

    const currentPricingState = await eventPricingUtil.getPricingByIdOrThrowException(client, data['pricing']['id']);

    if (currentPricingState['event'] !== event['id']) { //event does not match
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    //need to check if event pricing enabled state switch
    if (!data['pricing']['is_enabled'] && currentPricingState['is_enabled'] !== data['pricing']['is_enabled']) {
      // check total active pricing count greater than 1
      const eventPricing = await eventPricingUtil.getAllPricingForEvent(client, data['eventId']);
      const activeCounter = eventPricing.reduce((total, val) => total + (val.is_enabled ? 1 : 0), 0);     

      if (activeCounter <= 1) {
        throw new exceptionUtil.ApiException(405, 'should be at least one active pricing for event');
      }
    }
    
    const fetchRemovable = await eventPricingUtil.fetchPricingIsRemovable(client, [data['pricing']['id']]);
    const is_removable = fetchRemovable.length ? fetchRemovable[0].is_removable : false;
    let updatedEventPricing;

    let pricing = {
      id: data['pricing']['id'],
      is_enabled: !!data['pricing']['is_enabled'],
      pricing_plan: data['pricing']['pricing_plan'],
      access_price:  data['pricing']['access_price'],
      access_currency:  data['pricing']['access_currency'],
      event: event['id'],
      quantity: data['pricing']['quantity'],

      parameter: {
        manual_approval: !!data['pricing']['manualApproval'],
        expiration: data['pricing']['expiration'] || null
      }
    }

    //preprocess tags to have array
    if (data['pricing']['tags'] && data['pricing']['tags'].length > 0) {
      pricing['tags'] = data['pricing']['tags'].map(s => `pricing:${s.text}`);
    } else {
      pricing['tags'] = [];
    }

    if (is_removable) { //can update inplace
      updatedEventPricing = await eventPricingUtil.updatePricingInDb(client, pricing);
    } else {  //should recreate
      await eventPricingUtil.deprecatePreviousPricings(client, pricing);
      const tickets = await eventPricingUtil.getTicketNumForPricingById(client, pricing['id']);
      pricing['version'] = currentPricingState['version'] || [];
      pricing['version'].unshift({id:currentPricingState.id,  tickets: tickets, user:user.id, date:new Date()});
      updatedEventPricing = await eventPricingUtil.createPricingInDb(client, pricing);
    }

    eventPricingUtil.preparePricingForOutput(updatedEventPricing);

    return util.handle200(data, updatedEventPricing);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
