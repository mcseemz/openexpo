/**
 * @description Organize a meeting from the chat.
 * incoming meeting structure:
 * - url
 * - start
 * - end
 * - note
 * - - companyId or userId
 */
const twilio = require('twilio');
const AWS = require('aws-sdk');

const validator = require('./model/validation');
const standUtil = require('./model/stand');
const personUtil = require('./model/person');
const chatUtil = require('./model/chat');
const activityUtil = require('./model/activity');
const meetingUtils = require('./model/meeting');
const noteUtils = require('./model/notes');
const poolUtil = require('./model/pool');
const externalParamsUtil = require('./model/externalParams');
const confirmationUtil = require('./model/confirmation');
const meetingAttendeesUtil = require('./model/meetingAttendees');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const eventUtil = require('./model/event');

const ses = new AWS.SES({apiVersion: '2010-12-01'});

let llog = util.log;

function validateParams(params) {
  return !params['id'] &&
      !!params['start'] && validator.isValidDateTime(params['start']) && validator.isInFuture(params['start']) && validator.isWithinThreeYears(params['start']) &&
      !!params['end'] && validator.isValidDateTime(params['end']) && validator.isInCorrectOrder(params['start'], params['end']) && validator.isWithinThreeYears(params['end']);
}

/**
 * Create a meeting from the chat. <br />
 * You may specify userId or companyId depending on who is making a note.
 <pre>
 {
  "origin": "http://localhost",
  "meeting": {
        "url": "3b22147578144cbcbd5d766f5d08",
        "start": "2021-07-07T11:15:57.735Z",
        "end": "2021-07-07T11:45:57.735Z",
        "value": {
            "meetingUrl": "",
            "meetingType": "webinar",
            "enableChat": true,
            "presenter": {
                "name": "Anonymous",
                "surname": "Buffalo",
                "id": 71,
                "position": "Босс!"
            }
        },
        "note": {
            "value": "Тестовое задание",
            "userId": 71
        }
    },
  "chatId": "CH6d48ba9445594fa2994bd07daf33bb2b",
}
 </pre>
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaChatCreateMeeting');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['meeting']) || !data['language'] || !validator.isValidLanguage(data['language'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const chat = await chatUtil.getChatBySidOrThrowException(client, data['chatId']);
    if (!chat['person_to']) {
      throw new exceptionUtil.ApiException(405, 'Chat is not assigned to anyone');
    }
    if (!chat['person_from']) {
      throw new exceptionUtil.ApiException(405, 'No information about chat initiator');
    }

    let note = data['meeting']['note'];
    if (note) {
      if (note['companyId'] && note['userId']) {
        throw new exceptionUtil.ApiException(405, 'Only one should be specified: companyId or userId');
      }
      if (!!note['companyId'] && !!note['userId']) {
        throw new exceptionUtil.ApiException(405, 'companyId or userId should be specified');
      }
    }

    //inhouse meetings may not have URL
    if (['webinar', 'team_meeting'].includes(data['meeting']['value']['meetingType'].toLowerCase())) {
      data['meeting']['url'] = util.uuid32().replace(/-/g, '');
    } else if (!data['meeting']['url'] || !validator.isValidUrl(data['meeting']['url'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    const presenterId = chat['person_to'];
    const meetingBody = {
      url: data['meeting']['url'],
      presenter: presenterId,
      chat: chat['id']
    };

    let event;
    let stand;
    if (chat['eventId']) {
      event = await eventUtil.getEventFromDbOrThrowException(client, chat['eventId']);
      await permissionUtil.assertCanBeMeetingPresenterForEvent(client, presenterId, chat['eventId']);
    } else {
      stand = await standUtil.getStandFromDbOrThrowException(client, chat['stand_to']);
      await permissionUtil.assertCanBeMeetingPresenterForStand(client, presenterId, chat['stand_to']);
      event = await eventUtil.getEventFromDbOrThrowException(client, stand['eventId']);
    }

    const newMeeting = await meetingUtils.createMeetingInDb(client, meetingBody);

    if (note) {
      newMeeting['note'] = await noteUtils.createNote(client, 'meeting', newMeeting['id'], note['userId'], note['companyId'], note['value']);
    }

    await meetingAttendeesUtil.addAttendeeFor(client, newMeeting['id'], chat['person_from']);

    const activityBody = {};
    if (!chat['eventId']) {
      activityBody['stand'] = stand['id'];
      data['event'] = stand['eventId'];
    }

    activityBody['event'] = chat['eventId'] || data['event'];
    activityBody['visibility'] = 'private_meeting';
    activityBody['meeting'] = newMeeting['id'];
    activityBody['start'] = data['meeting']['start'];
    activityBody['end'] = data['meeting']['end'];
    activityBody['value'] = data['meeting']['value'] || {};
    activityBody['customName'] = await validator.getValidCustomNameOrThrowException(client, data['customName']);
    const activity = await activityUtil.createActivityInDb(client, activityBody, activityBody['event'], presenterId);
    newMeeting['activityId'] = activity['id'];

    const confirmationId = await confirmationUtil.createRejectConfirmation(client, 'activity', activity['id'], 'rejectLink', 'rejectLink', 'redirectLink');

    let secret = await chatUtil.getSecret();
    secret = JSON.parse(secret);
    const accountSid = secret['chat_accountsid'];
    const apiKey = secret['chat_api_key'];
    const apiSecret = secret['chat_api_secret'];
    const serviceSid = secret['chat_servicesid'];

    llog.debug('Looking for a user');
    let twilioClient = new twilio(apiKey, apiSecret, {accountSid: accountSid});
    const user = await twilioClient.chat.services(serviceSid)
      .channels(chat['sid'])
      .members
      .list()
      .then(members => {
        for (const member of members) {
          let attrJson = JSON.parse(member.attributes);
          if (!Object.prototype.hasOwnProperty.call(attrJson, 'isOperator') && !member.identity.startsWith("SupportBot")) {
            return member;
          }
        }
      });
    llog.debug('user found: ', user);
    const url = `${data['origin']}/accept-invitation?invitationId=${confirmationId}&type=activity&email=${user['identity']}`;

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);
    const params = {
      "Source": sender,
      "Template": "meetingNotification",
      "Destination": {
        "ToAddresses": [user['identity']]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'meetingNotification'
        },
      ],
      "TemplateData": `{"url": "${url}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data, newMeeting);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
