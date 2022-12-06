/**
 * @description Get pricing for a given tier.
 */
const validator = require('./model/validation');
const pricingUtil = require('./model/eventPricing');
const stringUtils = require('./model/strings');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return !!params['tierId'] && validator.isNumber(params['tierId']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaTierGetPricing');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const pricing = await pricingUtil.getActivePricingForTierOrThrowException(client, data['tierId']);
    if (pricing) {
      let additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'pricing', [pricing['id']], data['language']);
      if (additionalStrings != null) {
        pricing['strings'] = additionalStrings;
        pricing['strings'].forEach(s => delete s['ref_id']);
      }
    }

    return util.handle200(data, pricing);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
