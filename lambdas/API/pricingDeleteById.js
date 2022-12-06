/**
 * @description Lambda for setting disabled status of pricing for a given activity.
 * DELETE /eventId/pricingId
 */

const validator = require('./model/validation');
const eventPricingUtil = require('./model/eventPricing');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const eventUtil = require('./model/event');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');

/**
 * Checks all incoming parameters
 */
function validateParams(params) {
  return !!params['pricingId'] && validator.isNumber(params['pricingId']) &&
        !!params['eventId'] && validator.isNumber(params['eventId']);
}

/**
 * @param {object} data with converted request
 * @param {object} context with lambda context
 * @returns standart status object
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPricingDelete', 'pricing_delete', 'event', data['eventId']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    let event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);  //resolve alias

    await permissionUtil.assertCanManageEventMoney(client, user['id'], data['eventId']);

    let archivedEventPricing = await eventPricingUtil.getPricingByIdOrThrowException(client, data['pricingId']);

    //check that pricing id match event id
    if (archivedEventPricing['event'] !== event['id']) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    const is_removable = await eventPricingUtil.fetchPricingIsRemovable(client, [data['pricingId']]);
    if (!is_removable.find(el=>el.id == data['pricingId']).is_removable) {
      throw new exceptionUtil.ApiException(405, 'Unable to delete pricing');
    }
    
    if (archivedEventPricing['is_enabled']) {
      // check total active pricing count greater than 1
      const eventPricing = await eventPricingUtil.getAllPricingForEvent(client, data['eventId']);
      const activeCounter = eventPricing.reduce((total, val) => total + (val.is_enabled ? 1 : 0), 0);     

      if (activeCounter <= 1) {
        throw new exceptionUtil.ApiException(405, 'should be at least one active pricing for event');
      }
    }
    
    archivedEventPricing = await eventPricingUtil.deletePricingInDb(client, data['pricingId']);
    eventPricingUtil.preparePricingForOutput(archivedEventPricing);

    return util.handle200(data, archivedEventPricing);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
