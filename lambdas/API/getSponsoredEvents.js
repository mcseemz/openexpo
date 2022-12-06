/**
 * @description Get sponsored events for the user.
 */

const eventUtils = require('./model/event');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const validator = require('./model/validation');

function validateParams(params) {
  return !!params['sponsorId'] && validator.isNumber(params['sponsorId']) &&
      !!params['sponsorType'] && validator.isValidSponsorType(params['sponsorType']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaGetSponsoredEvents');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);

    if (data['sponsorId'] === '@me') {
      if (data['sponsorType'] === 'company') {
        data['sponsorId'] = user['company'];
      } else {
        data['sponsorId'] = user['id'];
      }
    }

    if (data['sponsorType'] === 'company') {
      await permissionUtil.assertCanManageCompanySponsorship(client, data['sponsorId'], user['id']);
    }

    const events = (data['sponsorType'] === 'user')
        ? await eventUtils.getSponsoringEventsAsUser(client, data['sponsorId'])
        : await eventUtils.getSponsoringEventsAsCompany(client, user['id'], data['sponsorId']);

    if (events.length) {
      await eventUtils.populateMultipleEventsWithData(client, events, data['language']);
    }

    return util.handle200(data, events);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
