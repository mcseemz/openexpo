/**
 * @description Update last read message index for the given user.
 */

const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const chatUtil = require('./model/chat');
const validator = require('./model/validation');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['chatId'] &&
      !!params['index'] && validator.isNumber(params['index']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatUpdateLastConsumedMessageIndex');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    await chatUtil.updateReadCounterForTheUser(client, user['email'], data['chatId'], data['index']);

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
