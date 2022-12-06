/**
 * @description Get events where user acts as an organizer (event personnel). lambdaUserGetEvents
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

function validateParams(params) {
  return !!params['type'] && validator.isValidUserEventType(params['type']) &&
      (!params['dateStart'] || validator.isValidDate(params['dateStart'])) &&
      (!params['dateEnd'] || validator.isValidDate(params['dateEnd'])) &&
      (!params['category'] || validator.isValidNonEmptyString(params['category'])) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserGetEvents');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let events = [];
    switch (data['type']) {
      case 'organizer':
        events = await eventUtil.getEventsForUserAsPersonnel(client, user['id']);
        break;
      case 'visitor':
        events = await eventUtil.getEventsForUserAsVisitor(client, user['id']);
        break;
    }

    if (events.length > 0) {
      if (data['dateStart']) {
        if (!data['dateEnd']) {
          data['dateEnd'] = data['dateStart'];
        }

        events = events.filter(e => validator.isDateInRange(String(e['dateStart']), data['dateStart'], data['dateEnd']));
      }

      if (data['category']) {
        events = events.filter(e => e['tags'].includes('category:' + data['category']));
      }

      await eventUtil.populateMultipleEventsWithData(client, events, data['language']);
    }

    return util.handle200(data, events);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
