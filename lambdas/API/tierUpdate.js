/**
 * @description Update sponsorship tier.
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
  return !!params['id'] && validator.isNumber(params['id']) &&
      !!params['default_id'] && validator.isNumber(params['default_id']) &&
      !!params['event'] && validator.isNumber(params['event']) &&
      (!params['logo'] || validator.isValidNonEmptyString(params['logo'])) &&
      (!params['pricing'] || validator.isNumber(params['pricing'])) &&
      (!!params['switches'] || validator.isValidNonEmptyString(params['switches']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaTierUpdate');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['tier'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    await pricingUtil.getPricingByIdOrThrowException(client, data['tier']['pricing']);

    const tier = await tierUtil.getByIdOrThrowException(client, data['tier']['id'], data['language']);
    data['tier']['event'] = tier['event'];
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['tier']['event']);

    await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);

    if (!data['tier']['is_enabled'] && tier['is_enabled']) {
      const hasActiveSponsors = await tierUtil.tierHasActiveSponsors(client, data['tier']['id']);
      if (hasActiveSponsors) {
        throw new exceptionUtil.ApiException(405, 'Can not disable tier with active sponsors');
      }
    }

    const updatedTier = await tierUtil.updateTierInDbOrThrowException(client, data['tier']);

    return util.handle200(data, updatedTier);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
