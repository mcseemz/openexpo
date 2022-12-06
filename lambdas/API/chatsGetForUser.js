/**
 * @description Get my chats for event.
 */
const personUtil = require('./model/person');
const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');

function validateParams(params) {
  return !!params['type'];
}

function populateUnreadCount(chats, userEmail) {
  chats.forEach(ch => {
    ch['unreadCount'] = ch['last_read_by_user'][userEmail] ? Math.max(0, Number(chatUtil['messagesCount']) - Number(ch['last_read_by_user'][userEmail])) : ch['messagesCount'];
    delete ch['last_read_by_user'];
  });
}

async function getChatsForVisitor(client, userId, userEmail) {
  let visitorEvents = await eventUtil.getEventsForUserAsVisitor(client, userId);
  const ownEventIds = visitorEvents.map(e => e['id']);
  const ownStands = await standUtil.getOwnStands(client, 'all', 'all', userId);
  const ownStandIds = ownStands.map(e => e['id']);

  let chats = await chatUtil.getChatsForVisitor(client, userId, ownEventIds, ownStandIds);
  populateUnreadCount(chats, userEmail);
  return chats;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatsGetForUser');

  let client = util.emptyClient;
  try {

      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let resultChannels = [];
    switch (data['type']) {
      case 'visitor':
        resultChannels = await getChatsForVisitor(client, user['id'], user['email']);
        break;
    }

    if (!resultChannels.length) {
      return util.handle200(data, resultChannels);
    }

    const channelIds = resultChannels.map(ch => ch.sid);
    let chatMap = await chatUtil.getMultipleChatBySid(client, channelIds);
    chatMap = chatMap.reduce((map, obj) => (map[obj['sid']] = obj, map), {});

    let result = [];
    for (const channel of resultChannels) {
      if (chatMap[channel.sid]) {
        channel['eventId'] = chatMap[channel.sid]['eventId'] || null;
        channel['standId'] = chatMap[channel.sid]['stand_to'] || null;
        result.push(channel);
      }
    }

    return util.handle200(data, result);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
