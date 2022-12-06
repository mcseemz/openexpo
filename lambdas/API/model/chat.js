const externalParamsUtil = require('./externalParams');
const standUtil = require('./stand');
const exceptionUtil = require('./exception');
const util = require('./util');

let secretName = process.env.Environment + "/twilio";

const CHAT_FIELDS =
  `c. id as "id",
  c.started         as "dateCreated",
  c.updated         as "dateUpdated",
  c.num_of_messages as "messagesCount",
  c.external_id     as "sid",
  c.stand_to,
  c.stand_from,
  c.event           as "eventId",
  c.person_from,
  c.person_to,
  c.status,
  c.external_url    as "url",
  c.last_read_by_user`

async function createChatInDb(client, event, person_from, person_to, stand_to, stand_from, external_id, status, external_url) {
  let llog = client.log || util.log;
  const query = {
    text: `INSERT INTO chat(event, person_from, person_to, stand_to, stand_from, external_id, status, external_url, num_of_messages) 
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, 1) RETURNING *`,
    values: [event ? Number(event) : null, person_from ? Number(person_from) : null, person_to ? Number(person_to) : null,
      stand_to ? Number(stand_to) : null, stand_from ? Number(stand_from) : null, external_id, status, external_url]
  };

  llog.debug('REQUEST createChatInDb: ', query);
  let res = await client.query(query);
  llog.debug('created: ', res.rows[0]);

  return res.rows[0];
}

async function getChatToEvent(client, event, standFrom) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS} FROM chat c where c.event = $1 and c.stand_from = $2`,
    values: [Number(event), Number(standFrom)]
  };

  llog.debug('REQUEST getChatToEvent: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows[0] : null;
}

async function getChatToStand(client, userFrom, standTo) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS} FROM chat c where c.person_from = $1 and c.stand_to = $2`,
    values: [Number(userFrom), Number(standTo)]
  };

  llog.debug('REQUEST getChatToStand: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows[0] : null;
}

async function getSecret() {
  return externalParamsUtil.getSecret(secretName);
}

async function filterChatsForEvent(client, eventId, chatIds) {
  let llog = client.log || util.log;
  let query = {
    text: 'SELECT external_id FROM chat where event = $1 and external_id = ANY($2)',
    values: [Number(eventId), chatIds]
  };

  llog.debug('REQUEST filterChatsForEvent: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);
  return res.rows.length ? res.rows.map(r => r['external_id']) : [];
}

async function filterChatsForStand(client, standId, chatIds) {
  let llog = client.log || util.log;
  let query = {
    text: 'SELECT external_id FROM chat where stand_to = $1 and external_id = ANY($2)',
    values: [Number(standId), chatIds]
  };

  llog.debug('REQUEST filterChatsForStand: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);
  return res.rows.length ? res.rows.map(r => r['external_id']) : [];
}

async function getChatsForEvent(client, eventId) {
  let llog = client.log || util.log;
  //get stands for a given event
  const standIds = await standUtil.getStandIdsForEvent(client, eventId);

  let query = {
    text: 'SELECT id, external_id FROM chat where event = $1 or stand_to = ANY($2) or stand_from = ANY($2)',
    values: [Number(eventId), standIds]
  };

  llog.debug('REQUEST getChatsForEvent: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

async function deleteChatsBySids(client, chatIds) {
  let llog = client.log || util.log;
  let query = {
    text: 'delete FROM chat where external_id = ANY($1) returning 1',
    values: [chatIds]
  };

  llog.debug('REQUEST getChatBySid: ', query);
  let res = await client.query(query);
  llog.debug(`removed:  ${res.rows.length}`);
  return res.rows.length;
}

async function getChatBySid(client, chatSid) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS} FROM chat c where c.external_id = $1`,
    values: [chatSid]
  };

  llog.debug('REQUEST getChatBySid: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows[0] : null;
}

/**
 * Get chat by Sid or throw the exception if not found.
 * @param client - PG client
 * @param chatSid - sid of (twilio id) the chat
 * @returns - chat object
 */
async function getChatBySidOrThrowException(client, chatSid) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS} FROM chat c where c.external_id = $1`,
    values: [chatSid]
  };

  llog.debug('REQUEST getChatBySidOrThrowException: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);
  if (res.rows.length === 0 || !res.rows[0]) {
    throw new exceptionUtil.ApiException(404, 'Chat not found');
  } else {
    return res.rows[0];
  }
}

async function getChatById(client, chatId) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS} FROM chat c where c.id = $1`,
    values: [Number(chatId)]
  };

  llog.debug('REQUEST getChatById: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows[0] : null;
}

/**
 * Update chat status to a given value
 * @param client - PG client
 * @param chatId - id of the chat
 * @param status - new status (see chat_status_type for available values)
 */
async function updateChatStatus(client, chatId, status) {
  let llog = client.log || util.log;
  let query = {
    text: 'update chat set status = $1, updated = now() where id = $2',
    values: [status, Number(chatId)]
  };

  llog.debug('REQUEST updateChatStatus: ', query);
  await client.query(query);
  llog.debug('updated');
}

/**
 * Update chat assignment
 * @param client - PG client
 * @param chatSid - sid of the chat
 * @param userTo - user to which this chat is assigned
 */
async function updateChatAssignmentBySid(client, chatSid, userTo) {
  let llog = client.log || util.log;
  let query = {
    text: `update chat
           set person_to = $1,
               status    = 'active',
               updated   = now()
           where external_id = $2`,
    values: [Number(userTo), chatSid]
  };

  llog.debug('REQUEST updateChatAssignmentBySid: ', query);
  await client.query(query);
  llog.debug('updated');
}

/**
 * Deactivates chat: updates status and removes person_to
 * @param client - PG client
 * @param chatId - sid of the chat
 */
async function deactivateChat(client, chatId) {
  let llog = client.log || util.log;
  let query = {
    text: `update chat
           set person_to = null,
               status    = 'closed',
               updated   = now()
           where id = $1`,
    values: [Number(chatId)]
  };

  llog.debug('REQUEST deactivateChat: ', query);
  await client.query(query);
  llog.debug('updated');
}

async function getMultipleChatBySid(client, chatSids) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS} FROM chat c where external_id = ANY ($1)`,
    values: [chatSids]
  };

  llog.debug('REQUEST getMultipleChatBySid: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 * Get chats for the stand
 * @param client - PG client
 * @param standId - id of the stand
 * @param status - status of the chat
 * @returns chats to the stand
 */
async function getChatsForStandByStatus(client, standId, status) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS}
           FROM chat c
           where c.status = $2
             and c.stand_to = $1`,
    values: [Number(standId), status]
  };

  llog.debug('REQUEST getChatsForStandByStatus: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 * Get chats for the event
 * @param client - PG client
 * @param eventId - id of the event
 * @param status - status of the chat
 * @returns chats to the stand
 */
async function getChatsForEventByStatus(client, eventId, status) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS}
           FROM chat c
           where c.status = $2
             and c.event = $1`,
    values: [Number(eventId), status]
  };

  llog.debug('REQUEST getChatsForEventByStatus: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 * Get chats with me as a visitor (I started the chat, but don't own target event or stand)
 * @param client - PG client
 * @param userId - id of the visitor person
 * @param ownEvents - ids of own events
 * @param ownStands - ids of own stands
 * @returns list of chats, where user is a visitor
 */
async function getChatsForVisitor(client, userId, ownEvents, ownStands) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS}
           FROM chat c
           where (c.person_from = $1 or c.stand_from = ANY ($3))
             and (c.event is null or not (c.event = ANY ($2)))
             and (c.stand_to is null or not (c.stand_to = ANY ($3)))`,
    values: [userId, ownEvents, ownStands]
  };

  llog.debug('REQUEST getChatsForVisitor: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 * Get chats directed to the given list of stands
 * @param client - PG client
 * @param ownStands - array of stand ids
 * @returns array of chats
 */
async function getChatsForStandOwner(client, ownStands) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS}
           FROM chat c
           where c.stand_to = ANY ($1)
           and not (status = 'pending')`,
    values: [ownStands]
  };

  llog.debug('REQUEST getChatsForStandOwner: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 * Get chats directed to the given list of events
 * @param client - PG client
 * @param ownEvents - array of event ids
 * @returns array of chats
 */
async function getChatsForEventOwner(client, ownEvents) {
  let llog = client.log || util.log;
  let query = {
    text: `SELECT ${CHAT_FIELDS}
           FROM chat c
           where c.event = ANY ($1)`,
    values: [ownEvents]
  };

  llog.debug('REQUEST getChatsForEventOwner: ', query);
  let res = await client.query(query);
  llog.debug(`fetched:  ${res.rows.length}`);

  return res.rows.length ? res.rows : [];
}

/**
 * Updated the number of messages in the chat (considering that they may not preserve the order).
 * @param client - PG client
 * @param chatSid - SID of the channel representing the chat
 * @param messageId - Id of the message sent
 */
async function updateChatMessageCount(client, chatSid, messageId) {
  let llog = client.log || util.log;
  let query = {
    text: 'update chat set num_of_messages = GREATEST(num_of_messages, $1), updated = now() where external_id = $2 returning 1',
    values: [Number(messageId), chatSid]
  };

  llog.debug('REQUEST updateChatMessageCount: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);
}

/**
 * Updates counter of read messaged for a given user in a given chat.
 * @param client - PG client
 * @param userEmail - email of the user
 * @param chatSid - SID of the channel representing the chat
 * @param messageId - Id of the last read message.
 * @returns {Promise<void>}
 */
async function updateReadCounterForTheUser(client, userEmail, chatSid, messageId) {
  const llog = client.log || util.log;
  let query = {
    text: `update chat
           set last_read_by_user = jsonb_set(last_read_by_user, $1, $2),
               updated           = now()
           where external_id = $3
           returning *`,
    values: ['{' + userEmail + '}', Number(messageId), chatSid]
  };

  llog.debug('REQUEST updateReadCounterForTheUser: ', query);
  const res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);
}

/**
 * Returns unread count messages for a user, where he/she is not event/stand owner.
 * @param client - PG client
 * @param userEmail - email of tehe user.
 * @param ownEvents - events owned by the user
 * @param ownStands - stands owned by the user
 * @returns {Promise<number>} - number of unread messages
 */
async function getUnreadForTheUser(client, userEmail, ownEvents, ownStands) {
  const llog = client.log || util.log;
  let query = {
    text: `select coalesce(sum(num_of_messages - (last_read_by_user -> $1)::int), 0) as "num"
           from chat
           where last_read_by_user ? $1
             and (event is null or not (event = ANY ($2)))
             and (stand_to is null or not (stand_to = ANY ($3)))`,
    values: [userEmail, ownEvents, ownStands]
  };

  llog.debug('REQUEST getUnreadForTheUser: ', query);
  let res = await client.query(query);
  llog.debug(`fetched: ${res.rows.length}`);

  return res.rows.length ? Number(res.rows[0]['num']) : 0;
}

/**
 * Returns unread messages for a user, where he/she is an event owner.
 * @param client - PG client
 * @param eventIds - ids of own events
 * @param userEmail - email of the user
 * @returns {Promise<number>} - number of unread messages
 */
async function getUnreadForTheEventOwner(client, eventIds, userEmail) {
  const llog = client.log || util.log;
  let query = {
    text: `select count(*) as "num"
           from chat
           where event = ANY ($1)
             and NOT (last_read_by_user ? $2)`,
    values: [eventIds, userEmail]
  };

  llog.debug('REQUEST getUnreadForTheEventOwner: ', query);
  const botsRes = await client.query(query);
  llog.debug(`fetched: ${botsRes.rows.length}`);

  query = {
    text: `select coalesce(sum(num_of_messages - (last_read_by_user -> $2)::int), 0) as "num"
           from chat
           where event = ANY ($1)
             and last_read_by_user ? $2`,
    values: [eventIds, userEmail]
  };

  llog.debug('REQUEST getUnreadForTheEventOwner-2: ', query);
  const emailRes = await client.query(query);
  llog.debug(`fetched: ${emailRes.rows.length}`);

  return (emailRes.rows.length ? Number(emailRes.rows[0]['num']) : 0) +
      (botsRes.rows.length ? Number(botsRes.rows[0]['num']) : 0);
}

/**
 * Returns unread messages for a user, where he/she is a stand owner.
 * @param client - PG client
 * @param standIds - ids of own stands
 * @param userEmail - email of the user
 * @returns {Promise<number>} - number of unread messages
 */
async function getUnreadForTheStandOwner(client, standIds, userEmail) {
  let query = {
    text: `select count(*) as "num"
           from chat
           where stand_to = ANY ($1)
             and NOT (last_read_by_user ? $2)`,
    values: [standIds, userEmail]
  };

  const llog = client.log || util.log;
  llog.debug('REQUEST getUnreadForTheStandOwner: ', query);
  const botsRes = await client.query(query);
  llog.debug(`updated: ${botsRes.rows.length}`);

  query = {
    text: `select coalesce(sum(num_of_messages - (last_read_by_user -> $2)::int), 0) as "num"
           from chat
           where stand_to = ANY ($1)
             and last_read_by_user ? $2`,
    values: [standIds, userEmail]
  };

  llog.debug('REQUEST getUnreadForTheStandOwner-2: ', query);
  const emailRes = await client.query(query);
  llog.debug(`selected: ${emailRes.rows.length}`);

  return (emailRes.rows.length ? Number(emailRes.rows[0]['num']) : 0) +
      (botsRes.rows.length ? Number(botsRes.rows[0]['num']) : 0);
}

exports.createChatInDb = createChatInDb;
exports.getChatToEvent = getChatToEvent;
exports.getChatToStand = getChatToStand;
exports.getSecret = getSecret;
exports.filterChatsForEvent = filterChatsForEvent;
exports.filterChatsForStand = filterChatsForStand;
exports.getChatsForEvent = getChatsForEvent;
exports.deleteChatsBySids = deleteChatsBySids;
exports.getChatBySid = getChatBySid;
exports.getMultipleChatBySid = getMultipleChatBySid;
exports.getChatById = getChatById;
exports.updateChatMessageCount = updateChatMessageCount;
exports.updateReadCounterForTheUser = updateReadCounterForTheUser;
exports.getUnreadForTheUser = getUnreadForTheUser;
exports.getUnreadForTheEventOwner = getUnreadForTheEventOwner;
exports.getUnreadForTheStandOwner = getUnreadForTheStandOwner;
exports.updateChatStatus = updateChatStatus;
exports.getChatsForStandByStatus = getChatsForStandByStatus;
exports.getChatsForVisitor = getChatsForVisitor;
exports.getChatsForStandOwner = getChatsForStandOwner;
exports.getChatsForEventByStatus = getChatsForEventByStatus;
exports.getChatsForEventOwner = getChatsForEventOwner;
exports.getChatBySidOrThrowException = getChatBySidOrThrowException;
exports.updateChatAssignmentBySid = updateChatAssignmentBySid;
exports.deactivateChat = deactivateChat;