/**
 * @description Create new chat with stand.
 * optionally, frontend can send either meeting id (if created after meeting was already established)
 * or representative id (if that's direct chat with rep)
 * @class chatCreateForStandNew  
 */
let twilio = require('twilio');

const validator = require('./model/validation');
const personUtil = require('./model/person');
const stringsUtil = require('./model/strings');
const standUtil = require('./model/stand');
const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const personnelUtil = require('./model/personnel');
const meetingAttendiesUtil = require('./model/meetingAttendees');
const meetingUtil = require('./model/meeting');
const activityUtil = require('./model/activity');

let llog = util.log;

function validateParams(params) {
  return !!params['standId'] && validator.isNumber(params['standId']) &&
    !!params['language'] && validator.isValidLanguage(params['language']) &&
    !!params['message']['value'] && validator.isValidNonEmptyString(params['message']['value'])
    &&
    (!params['message']['representativeId'] || validator.isNumber(params['message']['representativeId'])) &&
    (!params['message']['meetingId'] || validator.isNumber(params['message']['meetingId']))
    ;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatCreateForStandNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const userFrom = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);

    let standNameString = await stringsUtil.getStringsForEntity(client, 'stand', stand['id'], data['language']);
    standNameString = standNameString.find(s => s['category'] === 'name');
    llog.debug('standNameString: ' + JSON.stringify(standNameString));

    //if stand does not have strings at all
    if (!standNameString) {
      standNameString = {value: data['standId']}
    }

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    //detect other party in chat
    let repId = data['message']['representativeId'];
    let meetingId = data['message']['meetingId'];
    let repEmail = null;

    if (meetingId) {
      //validate that meeting stand = stand from parameters
      const meeting = await meetingUtil.getMeetingFromDb(client, meetingId);
      //checking that they match
      await activityUtil.getActivityForStandByMeetingOrThrowException(client, stand['id'], meetingId)
      //TODO invalid, should be taken from attendees (validate)
      repId = meeting['presenter'];
    }
    if (repId) {
      //validate that rep is in stand personnel and is public
      const isInPublicPersonnel = await personnelUtil.isInPublicStandPersonnel(client, stand['id'], repId);
      if (!isInPublicPersonnel) {
        throw new exceptionUtil.ApiException(405, 'Invalid representative supplied');
      }
      repEmail = (await personUtil.getPersonById(client, repId))['email'];
    }

    llog.debug('repEmail: ' + repEmail);
    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});

    const ch = await chatUtil.getChatToStand(client, userFrom['id'], stand['id']);

    let resChannel = {};

    if (ch == null) {
      await twilioClient.chat.services(serviceSid)
        .channels
        .create({friendlyName: `Channel: ${userFrom['name']} ${userFrom['surname']} to stand '${standNameString['value']}'`, type: "private"})
        .then(channel => {
          llog.debug('channel.sid: ' + channel.sid);
          resChannel = channel;

          let createMemberPromise = channel
            .members()
            .create({identity: userFrom['email']})
            .then(member => llog.debug('member.sid: ' + member.sid));

          let createBotMemberPromise = repId  //we create bot instead of rep
            ? channel.members()
              .create({identity: repEmail})
              .then(member => llog.debug('rep.sid: ' + member.sid))
            : channel.members()
              .create({identity: 'SupportBotStand' + stand['id']})
              .then(member => llog.debug('bot member.sid: ' + member.sid));

          let createMessagePromise = channel.messages()
            .create({body: data['message']['value'], from: userFrom['email']})
            .then(message => llog.debug('message.sid: ' + message.sid));

          return Promise.all([createMemberPromise, createBotMemberPromise, createMessagePromise]);
        });

      resChannel = await resChannel.update();
      await chatUtil.createChatInDb(client, null, userFrom['id'], repId || null, stand['id'], null, resChannel['sid'], repId ? 'active' : 'pending', resChannel['url']);
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
