/**
 * @description Update given event with respect to selected language.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']) &&
      !!params['dateStart'] && validator.isValidDateTime(params['dateStart']) &&
      !!params['dateEnd'] && validator.isValidDateTime(params['dateEnd']) && validator.isTodayOrInFuture(params['dateEnd']) && validator.isInCorrectOrder(params['dateStart'], params['dateEnd']) && validator.isWithinThreeYears(params['dateEnd']) &&
      validator.isValidTimeZone(params['timezone']) &&
      (!params['language'] || validator.isValidLanguage(params['language'])) &&
      (!params['company'] || validator.isNumber(params['company'])) &&
      (!params['status'] || validator.isValidStatus(params['status'])) &&
      (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName'])));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventUpdateById');

  data.event['id'] = data.eventId;
  data.event['language'] = data.language;

  let client = util.emptyClient;
  try {
      if (!validateParams(data.event)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //5. data permission checks/filtering
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const initialEvent = await eventUtil.getEventFromDbOrThrowException(client, data['event']['id']);

    await permissionUtil.assertCanUpdateEvent(client, user['id'], initialEvent['id']);

    data['event']['customName'] = await validator.getValidCustomNameOrThrowException(client, data['event']['customName'],'event', data['event']['id']);

    //moving parameter data
    data.event.parameter = initialEvent.parameter;
    data.event.parameter['theme'] = data.event['theme'];
    data.event.parameter['hidden'] = data.event['hidden'];
    data.event.parameter['noactivity'] = data.event['noactivity'];
    data.event.parameter['videoname'] = data.event['videoname'];
    data.event.parameter['externalTicketUrl'] = data.event['externalTicketUrl'];
    //6. transactioned business logic
    const event = await eventUtil.updateEventInDbOrThrowException(client, data.event, Number(initialEvent['id']), user['id']);

    event['strings'] = data.event['strings'];
    event['standMaterials'] = data.event['standMaterials'];
    event['branding'] = data.event['branding'];
    event['pricing'] = data.event['pricing'];

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
