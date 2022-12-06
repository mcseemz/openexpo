/**
 * @description Get my chats for stand.
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const standUtil = require('./model/stand');
const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const userUtil = require('./model/person');
const binaryUtil = require('./model/binary');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const eventUtil = require('./model/event');
const permissionUtil = require('./model/permissions');

function validateParams(params) {
  return !!params['standId'] && validator.isNumber(params['standId']) &&
      !!params['type'] && validator.isValidChannelSelectorType(params['type']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

function populateUnreadCount(chats, userEmail) {
  chats.forEach(ch => {
    ch['unreadCount'] = ch['last_read_by_user'][userEmail] ? Math.max(0, Number(chatUtil['messagesCount']) - Number(ch['last_read_by_user'][userEmail])) : ch['messagesCount'];
    delete ch['last_read_by_user'];
  });
}

async function getChatsByStatus(client, standId, userEmail, status) {
  const chats = await chatUtil.getChatsForStandByStatus(client, standId, status);
  populateUnreadCount(chats, userEmail);
  return chats;
}

async function getPendingChats(client, standId, userEmail) {
  return await getChatsByStatus(client, standId, userEmail, 'pending');
}

async function getActiveChats(client, standId, userEmail) {
  return await getChatsByStatus(client, standId, userEmail, 'active');
}

async function getClosedChats(client, standId, userEmail) {
  return await getChatsByStatus(client, standId, userEmail, 'closed');
}

async function getChatsForVisitor(client, userId, userEmail, company, standId) {
  const ownEvents = await eventUtil.getEventsForCompany(client, company);
  const ownEventIds = ownEvents.map(e => e['id']);
  const ownStands = await standUtil.getOwnStands(client, 'all', 'all', userId);
  const ownStandIds = ownStands.map(e => e['id']);

  let chats = await chatUtil.getChatsForVisitor(client, userId, ownEventIds, ownStandIds);
  chats = chats.filter(ch => {
    return ch['stand_to'] && Number(ch['stand_to']) === Number(standId);
  });
  populateUnreadCount(chats, userEmail);
  return chats;
}

async function getChatsForOwner(client, userEmail, company, standId) {
  const chats = await chatUtil.getChatsForStandOwner(client, [standId]);
  populateUnreadCount(chats, userEmail);
  return chats;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatsGetForStand');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId']);

    let resultChannels = [];
    switch (data['type']) {
      case 'pending':
        if (user['company'] !== stand['company']) {
          await permissionUtil.assertCanViewAndOperateStandChats(client, user['id'], stand['id']);
        }

        resultChannels = await getPendingChats(client, stand['id'], user['email']);
        break;
      case 'active':
        resultChannels = await getActiveChats(client, stand['id'], user['email']);
        break;
      case 'closed':
        resultChannels = await getClosedChats(client, stand['id'], user['email']);
        break;
      case 'visitor':
        resultChannels = await getChatsForVisitor(client, user['id'], user['email'], user['company'], stand['id']);
        break;
      case 'owner':
        if (user['company'] !== stand['company']) {
          await permissionUtil.assertCanViewAndOperateStandChats(client, user['id'], stand['id']);
        }

        resultChannels = await getChatsForOwner(client, user['email'], user['company'], stand['id']);
        break;
    }

    if (!resultChannels.length) {
      return util.handle200(data, resultChannels);
    }

    const channelIds = resultChannels.map(ch => ch.sid);
    let chatMap = await chatUtil.getMultipleChatBySid(client, channelIds);
    chatMap = chatMap.reduce((map, obj) => (map[obj['sid']] = obj, map), {});

    for (const channel of resultChannels) {
      const tmpUser = await userUtil.getPersonById(client, chatMap[channel.sid]['person_from']);

      let user = {
        id: tmpUser['id'],
        name: tmpUser['name'],
        surname: tmpUser['surname']
      }
      user['branding'] = await binaryUtil.getBrandingMaterialsForUser(client, user['id'], data['language']);
      channel['user'] = user;

      let standUser;
      if (chatMap[channel.sid]['person_to']) {
        const standUserTmp = await userUtil.getPersonById(client, chatMap[channel.sid]['person_to']);
        standUser = {
          id: standUserTmp['id'],
          name: standUserTmp['name'],
          surname: standUserTmp['surname']
        }
        standUser['branding'] = await binaryUtil.getBrandingMaterialsForUser(client, standUserTmp['id'], data['language']);
      }

      channel['standUser'] = standUser || {};
    }

    return util.handle200(data, resultChannels);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
