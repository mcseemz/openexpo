/**
 * @description Create new event.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const companyUtil = require('./model/company');
const binaryUtil = require('./model/binary');
const stringUtil = require('./model/strings');
const activityUtil = require('./model/activity');
const pricingUtil = require('./model/eventPricing');
const personnelUtil = require('./model/personnel');
const permissionsUtil = require('./model/permissions');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return !params['id'] &&
      !!params['dateStart'] && validator.isValidDateTime(params['dateStart']) && validator.isInFuture(params['dateStart']) && validator.isWithinThreeYears(params['dateStart']) &&
      !!params['dateEnd'] && validator.isValidDateTime(params['dateEnd']) && validator.isInCorrectOrder(params['dateStart'], params['dateEnd']) && validator.isWithinThreeYears(params['dateEnd']) &&
      validator.isValidTimeZone(params['timezone']) &&
      !!params['language'] && validator.isValidLanguage(params['language']) &&
      (!params['company'] || validator.isNumber(params['company'])) &&
      (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName']))) &&
      (!params['status'] || validator.isValidStatus(params['status']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventCreateNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data.event)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //5. data permission checks/filtering
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const companyId = await personnelUtil.getCompanyAsAPersonnel(client, user['id']);
    if (companyId !== -1) {
      await permissionsUtil.assertCanCreateAnEvent(client, companyId, user['id']);
      data.event['company'] = companyId;
    } else {
      data.event['company'] = await companyUtil.createCompanyIfNotExistsForUser(client, user);
    }

    //6. transactioned business logic
    data.event['customName'] = await validator.getValidCustomNameOrThrowException(client,  data.event['customName']);

    const res = await eventUtil.createEventInDb(client, data.event, user['id']);
    await personnelUtil.assignUserToEventWithParameters(client, user['id'], res['id'], 'event-owner', user['position'] || '');
    await activityUtil.createDefaultSchedule(client, res, user['id']);

    let additionalStrings = await stringUtil.getStringsForEntity(client, 'event', res['id'], data['language']);

    if (additionalStrings != null) {
      res['strings'] = additionalStrings;
    }

    res['standMaterials'] = await binaryUtil.getMaterialsForEvent(client, res['id'], data['language']);
    res['branding'] = await binaryUtil.getBrandingMaterialsForEvent(client, res['id'], data['language']);
    res['pricing'] = await pricingUtil.getActivePricingForEvent(client, res['id'], true);
    const pricingIds = res['pricing'].map(e => e['id']);
    additionalStrings = await stringUtil.getStringsForMultipleEntities(client, 'pricing', pricingIds, data['language']);
    if (additionalStrings != null) {
      res['pricing'].forEach((pr) => {
        pr['strings'] = additionalStrings.filter(s => s['ref_id'] === pr['id']);
        pr['strings'].forEach(s => delete s['ref_id']);
      });
    };

    return util.handle200(data, res);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
