/**
 * @description Create new sponsorship tier.
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const tierUtil = require('./model/tier');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const pricingUtil = require('./model/eventPricing');

function validateParams(params) {
  return !params['id'] &&
      !!params['default_id'] && validator.isNumber(params['default_id']) &&
      !!params['event'] && validator.isNumber(params['event']) &&
      (!params['logo'] || validator.isValidNonEmptyString(params['logo'])) &&
      !!params['pricing']['event'] && validator.isNumber(params['pricing']['event']) &&
      !!params['pricing']['pricing_plan'] && validator.isValidPricingPlan(params['pricing']['pricing_plan']) &&
      (!!params['pricing']['access_price'] && validator.isNumber(params['pricing']['access_price']) || params['pricing']['access_price'] === 0) &&
      !!params['pricing']['access_currency'] && validator.isValidNonEmptyString(params['pricing']['access_currency']) &&
      (!!params['switches'] || validator.isValidNonEmptyString(params['switches']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaTierCreateNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['tier'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const event = await eventUtil.getEventFromDbOrThrowException(client, data['tier']['event']);
    await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);

    let alreadyExists = await tierUtil.customTierExists(client, data['tier']['default_id'], event['id']);
    if (alreadyExists) {
      throw new exceptionUtil.ApiException(405, 'Custom tier already exists');
    }

    const newPricing = data['tier']['pricing'];
    if (!newPricing) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    newPricing['quantity'] = 1;
    newPricing['is_enabled'] = true;
    const pricing = await pricingUtil.createPricingInDb(client, newPricing);
    data['tier']['pricing'] = pricing['id'];


    const newTier = await tierUtil.createTierInDb(client, data['tier']);

    newTier['pricing'] = pricing;

    return util.handle200(data, newTier);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
