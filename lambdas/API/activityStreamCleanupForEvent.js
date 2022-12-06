/**
 * @description Cleanup activity stream for a given event.
 * @class activityStreamCleanupForEvent 
 */

const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const streamPackedUtil = require('./model/streamPacked');
const standUtil = require('./model/stand');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityStreamCleanupForEvent');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const standIds = await standUtil.getStandIdsForEvent(client, data['eventId']);
    await streamPackedUtil.deleteForEvent(client, data['eventId'], standIds);

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
