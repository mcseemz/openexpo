/**
 * @description Deactivate chat.
 *  optional parameter 'unassign' - to unassign instead
 */
let twilio = require('twilio');

const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

let llog = util.log;

function validateParams(params) {
  return !!params['chatSid'];
}

async function moveMembers(channel, members, chat) {
  members = await members;

  const promises = [];

  for (const member of members) {
    let attrJson = JSON.parse(member.attributes);
    if (Object.prototype.hasOwnProperty.call(attrJson, 'isOperator') && attrJson['isOperator'] === true) {
      promises.push(member.remove());
    }
  }

  const bot = members.find(i => i.identity.startsWith("SupportBot"));
  if (!bot) {
    if (chat['event']) {
      promises.push(channel
      .members()
      .create({identity: 'SupportBotEvent' + chat['event']})
      .then(member => llog.debug('member.sid: ' + member.sid)));
    } else {
      promises.push(channel
      .members()
      .create({identity: 'SupportBotStand' + chat['stand_to']})
      .then(member => llog.debug('member.sid: ' + member.sid)));
    }
  }

  if (!promises.length) {
    return Promise.resolve();
  }

  return Promise.all(promises);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatDeactivate');

  let client = util.emptyClient;
  try {

      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const chat = await chatUtil.getChatBySidOrThrowException(client, data['chatSid']);

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});

    let resChannel = {};

    await twilioClient.chat.services(serviceSid)
    .channels(data['chatSid'])
    .update({attributes: JSON.stringify({active: false})})
    .then(channel => {
      llog.debug('existing channel.attributes: ' + JSON.stringify(channel.attributes));
      resChannel = channel;

      return moveMembers(channel, channel.members().list(), chat);
    });

    if (!data['unassign']) {
      await chatUtil.deactivateChat(client, chat['id']);
    } else {
      await chatUtil.updateChatStatus(client, chat['id'], 'pending');
    }

    return util.handle200(data, resChannel);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
