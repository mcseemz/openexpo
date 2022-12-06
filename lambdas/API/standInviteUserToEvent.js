/**
 * @description Create an invitation for the user to create the stand on particular event.
 *  Creates invitation and returns its id.
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const standInvitationUtil = require('./model/standInvitation');
const poolUtil = require('./model/pool');
const externalParamsUtil = require('./model/externalParams');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const stringUtil = require('./model/strings');

let ses = new AWS.SES({apiVersion: '2010-12-01'});

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
    !!params['userEmail'] && validator.isValidEmail(params['userEmail']) &&
    !!params['text'] && validator.isValidNonEmptyString(params['text']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandInviteUserToEvent');

  data['text'] = data['text']['text'];
  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);
    await permissionUtil.assertCanInviteToCreateStandForEvent(client, user['id'], event['id']);

    const invExists = await standInvitationUtil.invitationExists(client, data['eventId'], data['userEmail']);
    if (invExists) {
      throw new exceptionUtil.ApiException(409, 'Invitation already exists');
    }

    // const potentialStandOwner = await personUtil.getPersonFromDB(client, data['userEmail']);
    //
    // if (potentialStandOwner != null) {
    //   const standExists = await standUtil.standForEventAndCompanyExistsInDb(client, data['eventId'], potentialStandOwner['id']);
    //   if (standExists) {
    //     throw new exceptionUtil.ApiException(409, 'Stand with given parameters already exists');
    //   }
    // }

    const invitationId = await standInvitationUtil.createInvitation(client, data['userEmail'], event['company'], data['eventId']);
    const url = `${data['origin']}/accept-invitation?invitationId=${invitationId}&email=${data['userEmail']}&type=stand`;

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);

    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    const dated = new Date(event['dateStart']);
    const date = dated.getDate() + '.' + (dated.getMonth()+1) + '.' + dated.getFullYear(); //prints expected format.

    const strings = await stringUtil.getStringsForEntity(client, 'event', event['id'], data['language']);
    let name=strings.filter(x => x.category === 'name')[0]['value'];

    const params = {
      "Source": sender,
      "Template": "StandInvitation2",
      "Destination": {
        "ToAddresses": [data['userEmail']
        ]
      },
      "ConfigurationSetName": "tex-dev",
      "Tags": [
        {
          Name: 'email-general',
          Value: 'StandInvitation'
        },
      ],
      "TemplateData": `{ "text": "${data['text']}", "url": "${url}", "name": "${name}", "date": "${date}" }`
    }

    console.log("params data", params);

    await ses.sendTemplatedEmail(params).promise();

    if (invitationId === -1) {
      throw new exceptionUtil.ApiException(502, 'Couldn\'t create invitation.');
    }

    return util.handle200(data, invitationId);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
