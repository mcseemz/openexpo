/**
 * @description Create new event pricing.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const pricingUtil = require('./model/eventPricing');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');
const tierUtil = require('./model/tier');
const eventPricingUtil = require("./model/eventPricing");

function validateParams(pricing, params) {
  return !pricing['id'] &&
      !!params['eventId'] && validator.isNumber(params['eventId']) &&
      (!pricing['tierId'] || validator.isNumber(pricing['tierId'])) &&
      (!pricing['expiration'] || validator.isValidPricingExpiration(pricing['expiration'])) &&
      !!pricing['pricing_plan'] && validator.isValidPricingPlan(pricing['pricing_plan']) &&
      (!!pricing['access_price'] && validator.isNumber(pricing['access_price']) || pricing['access_price'] === 0) &&
      !!pricing['access_currency'] && validator.isValidNonEmptyString(pricing['access_currency']) &&
      !!pricing['quantity'] && validator.isNumber(pricing['quantity']) && validator.isPositive(pricing['quantity']);
}

/**
 * we do not expect 'version' field while creating new record
 * @param data pricing data
 * @param context
 * @returns {Promise<{body: *|string, statusCode: *}|*>}
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPricingCreateNew');

  let client = util.emptyClient;
  try {
    data['pricing']['access_price'] = data['pricing']['access_price'] || 0;
    if (!validateParams(data['pricing'], data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    if (data['pricing']['pricing_plan'].includes('sponsorship')) {
      await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);
    } else {
      await permissionUtil.assertCanManageEventMoney(client, user['id'], event['id']);
    }

    let pricing = {
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
    }

    const newPricing = await pricingUtil.createPricingInDb(client, pricing);
    eventPricingUtil.preparePricingForOutput(newPricing);

    if (data['pricing']['tierId']) {
      //data binding
      //TODO check that process is still valid
      //check that tier is for same event as pricing
      let eventTiers = await tierUtil.getTiersForEvent(client, event['id']);
      for(let tier of eventTiers) {
        if (data['pricing']['tierId'] === tier['id']) {
          await tierUtil.updateTierPricing(client, data['pricing']['tierId'], newPricing['id']);
        }
      }

    } else {
      data["activity_type"] = 'pricing_add';
      data["entity"] = 'event';
      data["entity_id"] = data['eventId'];
    }

    return util.handle200(data, newPricing);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
