/**
 * @description Get all pricings for a given event. Used in admin page
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const pricingUtil = require('./model/eventPricing');
const stringUtils = require('./model/strings');
const poolUtil = require('./model/pool');
const personnelUtil = require('./model/personnel');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');
const util = require('./model/util');
const permissionUtil = require("./model/permissions");
const eventPricingUtil = require("./model/eventPricing");

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPricingGetAll');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const event = await eventUtil.getEventFromDb(client, data['eventId']);

    //8. response preparation
    if (event == null) {
      throw new exceptionUtil.ApiException(404, 'Event not found');
    }

    const isUber = user
      ? await permissionUtil.assertIsPlatformEventAccess(client, user['id'])
      : false;

    if (!isUber && event['status'] !== 'active') {
      await personnelUtil.assertUserIsInEventPersonnel(client, event['id'], user['id']);
    }

    const pricing = await pricingUtil.getAllPricingForEvent(client, data['eventId']);
    if (pricing.length > 0) {
      const pricingIds = pricing.map(e => e['id']);
      let additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'pricing', pricingIds, data['language']);
      const is_removable = await pricingUtil.fetchPricingIsRemovable(client, pricingIds);

      if (additionalStrings != null) {
        pricing.forEach((pr) => {
          eventPricingUtil.preparePricingForOutput(pr);

          pr['strings'] = additionalStrings.filter(s => s['ref_id'] === pr['id']);
          pr['strings'].forEach(s => delete s['ref_id']);
          pr['is_removable'] = is_removable.find(el=>el.id == pr['id']).is_removable;
        });
      }
    }

    return util.handle200(data, pricing);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
