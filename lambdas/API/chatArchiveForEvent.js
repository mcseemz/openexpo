/**
 * @description Archive all chats for a given event.
 * @class chatArchiveForEvent  
 */
let twilio = require('twilio');

const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const meetingUtil = require('./model/meeting');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const permissionUtil = require('./model/permissions');

let llog = util.log;

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatArchiveForEvent');

  let client = util.emptyClient;
  try {

      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    if (user['company'] !== event['company']) {
      await permissionUtil.assertCanArchiveEventChats(client, user['id'], event['id']);
    }

    const chatObjectsToDelete = await chatUtil.getChatsForEvent(client, data['eventId']);
    const chatSidsToDelete = chatObjectsToDelete.map(r => r['sid']);
    if (chatSidsToDelete.length === 0) {
      return util.handle200(data, 'Nothing to archive');
    }

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});
    const members = [];

    for (const ch of chatSidsToDelete) {
      await twilioClient.chat.services(serviceSid)
      .channels(ch)
      .fetch((channelError, channelInstance) => {
        if (!channelError) {
          channelInstance.members().list((memberError, memberResults) => {
            members.push(...memberResults.map(i => i.identity));
          })
        } else {
          return Promise.resolve();
        }
      })
      .then(channelToRemove => {
        if (channelToRemove) {
          return channelToRemove.remove((error, items) => {
            if (error) {
              llog.debug(`Couldn't remove channel ${ch}`)
            }
          });
        }
      })
      .catch(function (err) {
        llog.info(`Couldn't fetch channel ${ch}`);
      });
    }

    llog.debug('users: ' + JSON.stringify(members));
    if (members.length !== 0) {
      const membersToDelete = [];
      for (const member of members) {
        await twilioClient.chat.services(serviceSid)
        .users(member)
        .fetch()
        .then(user => {
          return user.userChannels().list();
        })
        .then(channels => {
          if (channels.length === 0) {
            membersToDelete.push(member);
          }
        })
        .catch(/*ignore*/);
      }

      for (const member of membersToDelete) {
        await twilioClient.chat.services(serviceSid)
        .users(member)
        .remove(error => {
          if (error) {
            llog.info('Couldn\'t remove user ', member)
          }
        })
        .catch(/*ignore*/);
      }
    }

    await meetingUtil.deleteMultipleMeetingsForChatsFromDb(client, chatObjectsToDelete.map(r => r['id']));
    await chatUtil.deleteChatsBySids(client, chatSidsToDelete);

    return util.handle200(data, `Number of archived channels: ${chatSidsToDelete.length}`);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
