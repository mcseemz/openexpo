/**
 * @description Confirm/reassign stand meeting proposal
 * standId
 * meeting - #/components/schemas/StandMeeting
 *   id: integer
 stand: integer 'Id of stand, null if event-level activity'
 event: integer 'Id of event'
 meeting: integer 'Id of a meeting'
 start: string 'ISO date and time string, no timezone, example: 2020-10-01T10:00:00'
 end: string 'ISO date and time string, no timezone. example: 2020-10-01T10:00:00'
 value: string (json)
 visibility: string visibility of an activity
 enum:
 - private_meeting
 - visitor_proposed
 visitor: integer
 representative: integerperson to request
 strings: strings associated with the activity (with respect to selected language)

 value has following format:
 body['value'] = JSON.stringify({
            meetingUrl: meetingUrl,
            meetingType: item.meetingType ? item.meetingType.value : '',
            enableChat: item.enableChat,
            presenter: item.meetingType && (item.meetingType.value != 'no_video') && item.presenter && item.presenter.value ? {
              name: item.presenter.value.name,
              surname: item.presenter.value.surname,
              id: item.presenter.value.id,
              logo: item.presenter.value.logo,
              position: item.presenter.value.position,
            } : ''
          });
 */
const validator = require('./model/validation');
const standUtil = require('./model/stand');
const stringsUtil = require('./model/strings');
const binaryUtil = require('./model/binary');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const meetingAttendeesUtil = require('./model/meetingAttendees');
const activityUtil = require('./model/activity');
const permissionUtil = require('./model/permissions');
const personnelUtil = require('./model/personnel');
const meetingUtils = require('./model/meeting');

const AWS = require('aws-sdk');
let ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['standId'] && !!params['activityId'] && validator.isNumber(params['activityId']) &&
    (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandCancelMeeting');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId'], user ? user['id'] : '');

    //check if stand matches activity
    const activity = await activityUtil.getActivityFromDbOrThrowException(client, data['activityId'], data['language'])
    if (activity['stand'] != stand['id']) {
      throw new exceptionUtil.ApiException(405, 'Invalid activity parameters supplied');
    }
    //check if status correct
    if (activity['visibility'] !== 'private_meeting' &&
      activity['visibility'] !== 'visitor_proposed') {
      throw new exceptionUtil.ApiException(403, 'operation permitted');
    }
    //validate that visitor can reject

    const attendeesPersons = await meetingAttendeesUtil.getEveryoneAsPersons(activity['meeting'])
    const here = attendeesPersons.filter(person => user['id'] === person['id']);
    if (here.length === 0) {
      throw new exceptionUtil.ApiException(403, 'You have no permission to ');
    }

    //deleting
    await activityUtil.detachMeeting(client, data['activityId']);
    await meetingUtils.deleteMeetingFromDb(client, activity['meeting']);
    await activityUtil.deleteActivityByMeetingId(client, activity['meeting']);

    //send email

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    const resolution = 'reject';
    const username = user['name'] + ' ' + user['surname'];
    const params = {
      "Source": sender,
      "Template": "standPersonnelMeetingResolved",
      "Destination": {
        "ToAddresses": attendeesPersons.filter(person => user['id'] !== person['id']).map(o => o['email'])
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'standPersonnelMeetingResolved'
        },
      ],
      "TemplateData": `{ "user": "${username}", "resolution": "${resolution}" }`
    }

    await ses.sendTemplatedEmail(params).promise();

    return util.handle200(data, stand);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
