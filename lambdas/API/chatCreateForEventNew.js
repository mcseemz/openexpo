/**
 * @description Create new chat with event organizer.
 * @class chatCreateForEventNew  
 */
let twilio = require('twilio');

const validator = require('./model/validation');
const personUtil = require('./model/person');
const stringsUtil = require('./model/strings');
const standUtil = require('./model/stand');
const eventUtil = require('./model/event');
const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');

let llog = util.log;

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']) &&
      !!params['message']['value'] && validator.isValidNonEmptyString(params['message']['value']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatCreateForEventNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const userFrom = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    let standFrom = await standUtil.getCompanyStandsForEvent(client, event['id'], userFrom['company']);
    if (standFrom.length === 0) {
      throw new exceptionUtil.ApiException(404, 'User has no registered stands for this event');
    }
    standFrom = standFrom[0];

    let eventNameString = await stringsUtil.getStringsForEntity(client, 'event', event['id'], data['language']);
    eventNameString = eventNameString.find(s => s['category'] === 'name');
    llog.debug('eventNameString: ' + JSON.stringify(eventNameString));

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});

    const ch = await chatUtil.getChatToEvent(client, event['id'], standFrom['id']);

    let resChannel = {};

    if (ch == null) {
      await twilioClient.chat.services(serviceSid)
      .channels
      .create({friendlyName: `Channel: ${userFrom['name']} ${userFrom['surname']} to organizer of '${eventNameString['value']}'`, type: "private"})
      .then(channel => {
        llog.debug('channel.sid: ' + channel.sid);
        resChannel = channel;

        let createMemberPromise = channel
        .members()
        .create({identity: userFrom['email']})
        .then(member => llog.debug('member.sid: ' + member.sid));

        let createBotMemberPromise = channel
        .members()
        .create({identity: 'SupportBotEvent' + event['id']})
        .then(member => llog.debug('member.sid: ' + member.sid));

        let createMessagePromise = channel.messages()
        .create({body: data['message']['value'], from: userFrom['email']})
        .then(message => llog.debug('message.sid: ' + message.sid));

        return Promise.all([createMemberPromise, createBotMemberPromise, createMessagePromise]);
      });

      resChannel = await resChannel.update();
      await chatUtil.createChatInDb(client, event['id'], userFrom['id'], null, null, standFrom['id'], resChannel['sid'], 'pending', resChannel['url']);
    } else {
      await chatUtil.updateChatStatus(client, ch['id'], 'active');
    }

    return util.handle200(data, resChannel);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
