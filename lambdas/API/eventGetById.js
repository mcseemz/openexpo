/**
 * @description Get complete localized event by Id.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const stringsUtil = require('./model/strings');
const binaryUtil = require('./model/binary');
const pricingUtil = require('./model/eventPricing');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const permissionUtil = require('./model/permissions');
const eventPricingUtil = require("./model/eventPricing");

function validateParams(params) {
  return !!params['eventId'] &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const event = (validator.isNumber(data['eventId']))
        ? await eventUtil.getEventFromDbOrThrowException(client, data['eventId'], user ? user['id'] : '')
        : await eventUtil.getEventFromDbByNameOrThrowException(client, data['eventId'], user ? user['id'] : '');

    //check if ticket exist (not for non-active), or personnel or sponsor
    const checkingResult = user
      ? await eventUtil.checkCanUserViewEvent(client, event['id'], user['id'], user['email'])
      : {letmein: false, isUserSponsor: false, isUber: false};

    let letmein, isUserSponsor;
    letmein = checkingResult.letmein;
    isUserSponsor = checkingResult.isUserSponsor;

    if (!checkingResult.isUber && event['status'] !== 'active' && !letmein) {
      throw new exceptionUtil.ApiException(403, 'No permission to view event');
    }

    if (checkingResult.isUber) {
      //we add event editing granst so frontend check works
      event['grants'].push('event-edit');
      event['grants'].push('event-delete');
      event['grants'].push('event-manage-news');
      event['grants'].push('event-manage-staff');
      event['grants'].push('event-manage-money');
      event['grants'].push('event-view-report (TBD)');
      event['grants'].push('event-invite-stand');
      event['grants'].push('event-use-chat');
      event['grants'].push('event-manage-chat');
      event['grants'].push('event-use-video');
      event['grants'].push('event-manage-sponsorship');
      event['grants'].push('event-manage-tickets');
      event['grants'].push('event-view-report');
    }

    //8. response preparation
    let additionalStrings = await stringsUtil.getStringsForEntity(client, 'event', event['id'], data['language']);

    if (additionalStrings != null) {
      event['strings'] = additionalStrings;
    }

    if (!data['open']) {
      event['standMaterials'] = await binaryUtil.getMaterialsForEvent(client, event['id'], data['language']);
      //get branding for stand materials
      const allIds = event['standMaterials'].map(e => e['id']);
      const allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', 'upload', allIds);
      event['standMaterials'].forEach((c) => {
        c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
      });
    }
    event['branding'] = await binaryUtil.getBrandingMaterialsForEvent(client, event['id'], data['language']);
    event['pricing'] = await pricingUtil.getActivePricingForEvent(client, event['id']);
    const pricingIds = event['pricing'].map(e => e['id']);
    additionalStrings = await stringsUtil.getStringsForMultipleEntities(client, 'pricing', pricingIds, data['language']);
    if (additionalStrings != null) {
      event['pricing'].forEach((pr) => {
        eventPricingUtil.preparePricingForOutput(pr);

        pr['strings'] = additionalStrings.filter(s => s['ref_id'] === pr['id']);
        pr['strings'].forEach(s => delete s['ref_id']);
      });
    }

    event['letmein'] = user ? (letmein || (await eventUtil.checkCanUserViewEvent(client, event['id'], user['id'], user['email'])).letmein) : false;
    event['isUserSponsor'] = isUserSponsor;

    //cleanup
    event['theme'] = event.parameter['theme'];
    event['hidden'] = event.parameter['hidden'];
    event['noactivity'] = event.parameter['noactivity'];
    event['videoname'] = event.parameter['videoname'];
    event['externalTicketUrl'] = event.parameter['externalTicketUrl'];

    delete event.parameter;

    return util.handle200(data, event);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
