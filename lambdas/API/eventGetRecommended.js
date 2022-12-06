/**
 * @description Get recommended events for the user.
 */
//TODO get user
//TODO get user preferences, list of interest, languages
//TODO get user location and locale
//TODO filter incoming events based on such parameters

const validator = require('./model/validation');
const eventUtils = require('./model/event');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

function validateParams(params) {
  return !!params['category'] &&
      !!params['language'] && validator.isValidLanguage(params['language']) &&
      (!params['pageNum'] || validator.isNumber(params['pageNum'])) &&
      (!params['recordsPerPage'] || validator.isNumber(params['recordsPerPage']));
}

exports.handler = async function (data, context) {

  if (!validateParams(data)) {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const events = await eventUtils.getEventsForTags(client, data['category']);

    if (events != null) {
      await eventUtils.populateMultipleEventsWithData(client, events, data['language']);

      return util.handle200(data, events);
    } else {
      throw new exceptionUtil.ApiException(404, 'No events with given params');
    }
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    util.handleFinally(data, client);
  }
};
