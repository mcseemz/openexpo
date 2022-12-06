/**
 * @description Search for an event.
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

function validateParams(params) {
  return (!params['str'] || validator.isValidNonEmptyString(params['str'])) &&
      (!params['type'] || validator.isValidEventFilterType(params['type'])) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventSearch');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    let events = await eventUtil.searchForEvents(client, data['str'] || '', data['category'] || null, data['type'] || 'all');

    if (events.length > 0) {
      await eventUtil.populateMultipleEventsWithData(client, events, data['language']);
    }

    return util.handle200(data, events);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
