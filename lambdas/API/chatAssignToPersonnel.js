/**
 * @description Assign chat to the user from personnel.
 * @class chatAssignToPersonnel 
 */
let twilio = require('twilio');

const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const validator = require('./model/validation');
const exceptionUtil = require('./model/exception');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');
const personnelUtil = require('./model/personnel');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');

let llog = util.log;

function validateParams(params) {
  return !!params['chatSid'] &&
      !!params['personnelId'] && validator.isNumber(params['personnelId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatAssignToPersonnel');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);
    
    const {personid} = await personnelUtil.getPersonnelById(client, data['personnelId']);
    
    const owner = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const chatEntry = await chatUtil.getChatBySid(client, data['chatSid']);
    if (chatEntry['person_from'] === personid || chatEntry['person_to'] === personid) {
      throw new exceptionUtil.ApiException(405, 'This person is already in the chat');
    }

    if (chatEntry['eventId']) {
      const event = await eventUtil.getEventFromDb(client, chatEntry['eventId']);
      if (event['company'] !== owner['company']) {
        await permissionUtil.assertCanAssignPersonnelToTheEvent(client, owner['id'], event['id']);
      }
    } else {
      const stand = await standUtil.getStandFromDb(client, chatEntry['stand_to']);
      if (stand['company'] !== owner['company']) {
        await permissionUtil.assertCanAssignPersonnelToTheStand(client, owner['id'], stand['id']);
      }
    }

    const userToAssign = await personUtil.getPersonByIdOrThrowException(client, personid);
    //TODO validate that user to assign to is on the same stand/event level

    // const isInPersonnel = await personnelUtil.isInCompanyPersonnel(client, owner['company'], userToAssign['id']);
    // if (!isInPersonnel) {
    //   throw new exceptionUtil.ApiException(405, 'User is not in company personnel');
    // }

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});

    await twilioClient.chat.services(serviceSid)
    .channels(data['chatSid'])
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
      } else {
        const me = members.find(i => i.identity === data['context']['email']);
        if (me) {
          llog.debug('removing current user from chat');
          promises.push(me.remove());
        }
      }

      const memberIsInChat = members.find(m => m.identity === userToAssign['email']);
      if (!memberIsInChat) {
        llog.debug('assigning user');
        const newMemberPromise = twilioClient.chat.services(serviceSid)
        .channels(data['chatSid'])
        .members.create({identity: userToAssign['email'], attributes: JSON.stringify({isOperator: true})})
        .then(member => llog.debug('member.sid: ' + member.sid), err => llog.error(err));

        promises.push(newMemberPromise);
      }

      return Promise.all(promises);
    });

    await chatUtil.updateChatAssignmentBySid(client, chatEntry['sid'], userToAssign['id']);

    return util.handle200(data, 'Assigned successfully');
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
