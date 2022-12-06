/**
 * @description Assign chat to me.
 * @class chatAssign  
 */
let twilio = require('twilio');

const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const eventUtil = require('./model/event');
const permissionUtil = require('./model/permissions');
const standUtil = require('./model/stand');

let llog = util.log;

function validateParams(params) {
  return !!params['chatSid'];
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatAssign');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const chat = await chatUtil.getChatBySid(client, data['chatSid']);
    if (chat['event']) {
      const event = await eventUtil.getEventFromDbOrThrowException(client, chat['event']);

      // if (user['company'] !== event['company']) {
      //   await permissionUtil.assertCanAssignPersonnelToTheEvent(client, user['id'], event['id']);
      // }
    } else {
      const stand = await standUtil.getStandFromDb(client, chat['stand_to']);
      if (user['company'] !== stand['company']) {
        await permissionUtil.assertCanAssignPersonnelToTheStand(client, user['id'], stand['id']);
      }
    }

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});

    const channelContext = twilioClient.chat.services(serviceSid).channels(data['chatSid']);
    llog.debug('channelContext', channelContext);

    await channelContext
    .fetch()
    .then(channel => {
      return channel.members().list();
    })
    .then(members => {
      const bot = members.find(i => i.identity.startsWith("SupportBot"));
      const promises = [];

      if (bot) {
        llog.debug('removing bot');
        promises.push(bot.remove());
      }

      const memberIsInChat = members.find(m => m.identity === user['email']);
      if (!memberIsInChat) {
        llog.debug('assigning user');
        const newMemberPromise = channelContext
        .members.create({identity: user['email'], attributes: JSON.stringify({isOperator: true})})
        .then(member => llog.debug('member.sid: ' + member.sid), err => llog.error(err));

        promises.push(newMemberPromise);
      }

      return Promise.all(promises);
    });

    await chatUtil.updateChatAssignmentBySid(client, data['chatSid'], user['id']);

    return util.handle200(data, 'Assigned successfully');
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
