/**
 * @description Get my chats for event.
 */
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const chatUtil = require('./model/chat');
const poolUtil = require('./model/pool');
const standUtil = require('./model/stand');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const validator = require('./model/validation');
const activityUtil = require('./model/activity');

let llog = util.log;

function validateParams(params) {
  return (!!params['language'] && validator.isValidLanguage(params['language']));
}

async function getUnreadCount(client, user, filter) {
  let result = 0;

  let personnelEvents = await eventUtil.getEventsForUserAsPersonnel(client, user['id']);
  let visitorEvents = await eventUtil.getEventsForUserAsVisitor(client, user['id']);

  const ownEventIds = [...personnelEvents, ...visitorEvents].map(e => e['id']);
  const ownStands = await standUtil.getOwnStands(client, 'all', 'all', user['id']);
  const ownStandIds = ownStands.map(e => e['id']);

  if (!filter || filter === 'visitor') {
    //1. Chats where my e-mail is present
    const unreadForEmail = await chatUtil.getUnreadForTheUser(client, user['email'], ownEventIds, ownStandIds);
    llog.debug(`Unread for the email: ${unreadForEmail}`);
    result += unreadForEmail;
  }

  if (!filter || filter === 'eventowner') {
    //2. Chats for my events when there's a bot
    const unreadForEventOwner = await chatUtil.getUnreadForTheEventOwner(client, ownEventIds, user['email']);
    result += unreadForEventOwner;
  }

  if (!filter || filter === 'standowner') {
    //3. Chats for my stands when there's a bot
    const unreadForStand = await chatUtil.getUnreadForTheStandOwner(client, ownStandIds, user['email']);
    result += unreadForStand;
  }

  return result;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatUnreadForUser');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const unreadCount = await getUnreadCount(client, user, data['filter']);

    const response = { unread: unreadCount};

    let event; 
    if (!!data['eventId']){
      event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId'], user['id']);
    }

    if (!!event && ((await eventUtil.checkCanUserViewEvent(client, event['id'], user['id'])).letmein)) {
      const activities = await activityUtil.getActivitiesUpcoming(client, event['id'],
        activityUtil.AGENDA, ['event_published','stand_public','stand_promoted'], data['language']);
      if (activities.length>0) {
        response.next = activities[0];
      }
      
      response['announcement'] = event.announcement;
    }
    //8. response preparation

    return util.handle200(data, response);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
