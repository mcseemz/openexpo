/**
 * @description Fires on every message sent to any chat channel.
 * "message": "EventType=onMessageSent&InstanceSid=IS01b96551984b41e5838b9bf8a3de8764&Attributes=%7B%7D&DateCreated=2021-04-17T12%3A52%3A31.295Z&Index=1&From=someuser%40email.domain&MessageSid=IM5571b7f2050342fcb10f0e14595d1db9&AccountSid=AC548aa62afb2b7494ce715bba146ddc6e&Source=SDK&ChannelSid=CHcf2bd09d5b2946e78880d242428fdd3a&ClientIdentity=someuser%40email.domain&RetryCount=0&Body=%D0%90%D0%BB%D0%BB%D0%BE%21"
 */

const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const chatUtil = require('./model/chat');

function validateParams(params) {
  return !!params['message'] && !!params['env'];
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatWebhookOnMessageSent');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByEnvironment(data['env'], context);

    //TODO sender validation

    const properties = data['message'].split('&');
    const message = {};
    properties.forEach(function (property) {
      const tup = property.split('=');
      message[tup[0]] = tup[1];
    });
    client.log.debug(message);

    await chatUtil.updateChatMessageCount(client, message['ChannelSid'], message['Index']);

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
