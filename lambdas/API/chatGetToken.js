/**
 * @description Get chat token.
 */
const personUtil = require('./model/person');
const chatUtil = require('./model/chat');
const AccessToken = require('twilio').jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

function validateParams(params) {
  return true;
}

exports.handler = async function (data, context) {

  if (!validateParams(data)) {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  let client = util.emptyClient;
  try {

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    if (user == null) {
      throw new exceptionUtil.ApiException(405, 'User not registered');
    }

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);

    const chatGrant = new ChatGrant({
      serviceSid: secret['chat_servicesid']
    });

    const token = new AccessToken(secret['chat_accountsid'], secret['chat_api_key'], secret['chat_api_secret']);

    token.addGrant(chatGrant);

    token.identity = user['email'];

    return util.handle200(data, token.toJwt());
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
