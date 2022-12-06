/**
 * @description Get my chats for event.
 */

const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const userUtil = require('./model/person');
const standUtil = require('./model/stand');
const binaryUtil = require('./model/binary');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');

let llog = util.log;

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
      !!params['type'] && validator.isValidChannelSelectorType(params['type']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

function populateUnreadCount(chats, userEmail) {
  chats.forEach(ch => {
    ch['unreadCount'] = ch['last_read_by_user'][userEmail] ? Math.max(0, Number(chatUtil['messagesCount']) - Number(ch['last_read_by_user'][userEmail])) : ch['messagesCount'];
    delete ch['last_read_by_user'];
  });
}

async function getChatsByStatus(client, eventId, userEmail, status) {
  const chats = await chatUtil.getChatsForEventByStatus(client, eventId, status);
  populateUnreadCount(chats, userEmail);
  return chats;
}

async function getPendingChats(client, eventId, userEmail) {
  return await getChatsByStatus(client, eventId, userEmail, 'pending');
}

async function getActiveChats(client, eventId, userEmail) {
  return await getChatsByStatus(client, eventId, userEmail, 'active');
}

async function getClosedChats(client, eventId, userEmail) {
  return await getChatsByStatus(client, eventId, userEmail, 'closed');
}

async function getChatsForVisitor(client, userId, userEmail, eventId) {
  const ownStands = await standUtil.getOwnStands(client, 'all', 'all', userId);
  const ownStandIds = ownStands.map(e => e['id']);

  let chats = await chatUtil.getChatsForVisitor(client, userId, [eventId], ownStandIds);
  chats = chats.filter(ch => {
    return ch['eventId'] && Number(ch['eventId']) === Number(eventId);
  });
  populateUnreadCount(chats, userEmail);
  return chats;
}

async function getChatsForOwner(client, userEmail, eventId) {
  const chats = await chatUtil.getChatsForEventOwner(client, [eventId]);
  populateUnreadCount(chats, userEmail);
  return chats;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatsGetForEvent');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    let resultChannels = [];
    switch (data['type']) {
      case 'pending':
        await permissionUtil.assertCanViewAndOperateEventChats(client, user['id'], event['id']);
        resultChannels = await getPendingChats(client, event['id'], user['email']);
        break;
      case 'active':
        resultChannels = await getActiveChats(client, event['id'], user['email']);
        break;
      case 'closed':
        resultChannels = await getClosedChats(client, event['id'], user['email']);
        break;
      case 'visitor':
        resultChannels = await getChatsForVisitor(client, user['id'], user['email'], event['id']);
        break;
      case 'owner':
        await permissionUtil.assertCanViewAndOperateEventChats(client, user['id'], event['id']);
        resultChannels = await getChatsForOwner(client, user['email'], event['id']);
        break;
    }

    if (!resultChannels.length) {
      return util.handle200(data, resultChannels);
    }

    llog.debug(JSON.stringify(resultChannels));
    const channelIds = resultChannels.map(ch => ch.sid);
    llog.debug(JSON.stringify(channelIds));
    let chatMap = await chatUtil.getMultipleChatBySid(client, channelIds);
    chatMap = chatMap.reduce((map, obj) => (map[obj['sid']] = obj, map), {});
    llog.debug(JSON.stringify(chatMap));

    for (const channel of resultChannels) {
      const standUserTmp = await userUtil.getPersonById(client, chatMap[channel.sid]['person_from']);

      let standUser = {
        id: standUserTmp['id'],
        name: standUserTmp['name'],
        surname: standUserTmp['surname']
      }
      standUser['branding'] = await binaryUtil.getBrandingMaterialsForUser(client, standUser['id'], data['language']);

      let eventUser;
      if (chatMap[channel.sid]['person_to']) {
        const eventUserTmp = await userUtil.getPersonById(client, chatMap[channel.sid]['person_to']);
        eventUser = {
          id: eventUserTmp['id'],
          name: eventUserTmp['name'],
          surname: eventUserTmp['surname']
        }
        eventUser['branding'] = await binaryUtil.getBrandingMaterialsForUser(client, eventUserTmp['id'], data['language']);
      }

      channel['standUser'] = standUser;
      channel['eventUser'] = eventUser || {};
      channel['standId'] = chatMap[channel.sid]['stand_from'] || null;
    }

    return util.handle200(data, resultChannels);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
