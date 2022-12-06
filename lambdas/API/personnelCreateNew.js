/**
 * @description create personnel record, and register user if email is included. Send an email using SES and `eventExternalUserInvitation` template.
 *  Limitations:
 *  - cannot invite self
 *  - cannot invite twice
 *              {
              "language": "$input.params('language')",
              "type": "event",
              "typeId": "$input.params('eventid')",",
              "userEmail": "$input.path('$.useremail')",
              "name": "$input.path('$.name')",
              "public": $input.path('$.public'),
              "roleId": "$input.path('$.roleid')",
              "position": "$input.path('$.position')",
              "origin": "$util.escapeJavaScript($input.params().header.get('origin'))",
              "context": {
                "sub": "$context.authorizer.claims.sub",
                "username": "$context.authorizer.claims['cognito:username']",
                "email": "$context.authorizer.claims.email",
                "userId": "$context.authorizer.claims['custom:userId']"
              }
            }
 */
const validator = require('./model/validation');
const roleUtil = require('./model/role');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');
const standUtil = require("./model/stand");
const personnelUtil = require("./model/personnel");
const externalParamsUtil = require("./model/externalParams");

/**
 * Checks all incoming parameters
 */
function validateParams(params) {
  return (params['type'] === 'event' || params['type'] === 'stand') &&
    !!params['typeId'] && validator.isNumber(params['typeId']) &&
    !!params['roleId'] && validator.isNumber(params['roleId']) &&
    (!params['userEmail'] || validator.isValidEmail(params['userEmail'])) &&
    !!params['position'] && validator.isValidNonEmptyString(params['position']) &&
    !!params['name'] && validator.isValidNonEmptyString(params['name']);
}

/**
 * Please check {@link ../../API/APIv1.html#inviteexternalusertoevent API} for conversion template
 * @param {object} data with converted request
 * @param {object} context with lambda context
 * @returns standart status object
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPersonnelCreateNew');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const invEmail = data['userEmail'] ? data['userEmail'].trim().toLowerCase() : undefined;
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    //check if role exists, and it's proper name
    const role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId']);
    if (!role['name'].startsWith(data['type'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    //check for self-invite
    // if (data['context']['email'] === data['userEmail']) { //self-invite
    //   throw new exceptionUtil.ApiException(405, 'You can not invite this user to the event');
    // }

    let eventId = null;
    //check if object exists
    //check if user has permission
    if (data['type'] === 'event' ) {
      const event = await eventUtil.getEventFromDbOrThrowException(client, data['typeId']);
      eventId = event['id'];  //convert to number
      await permissionUtil.assertCanAssignPersonnelToTheEvent(client, user.id, data['typeId']);
    }
    else if (data['type'] === 'stand' ) {
      let stand = await standUtil.getStandFromDbOrThrowException(client, data['typeId']);
      eventId = stand['eventId'];
      await permissionUtil.assertCanAssignPersonnelToTheStand(client, user.id, data['typeId']);
    }
    else throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let persrecord = {};

    //if email exist, check for user
    if (!!data['userEmail']) {
      //register for event, get link
      let name = data['name'].trim().toLowerCase();
      let userAlias = await personUtil.registerPersonForEvent(client, shortDomain, eventId, invEmail,
        name.split(/\\s+/)[0].trim(), '');

      //register for personnel with user id
      if (data['type'] === 'event') {
        persrecord = await personnelUtil.assignUserToEventWithParameters(client, userAlias['id'], data['typeId'], role['name'],
          data['position'], !!data['public'], data['name'], data['tags']);
      }
      else if (data['type'] === 'stand') {
        persrecord = await personnelUtil.assignUserToStandWithParameters(client, userAlias['id'], data['typeId'], role['name'],
          data['position'], !!data['public'], data['name'], data['tags']);
      }
      persrecord['email'] = data['userEmail'];

      let sender = await externalParamsUtil.getSenderEmail(shortDomain);
      const emailAlias = await personUtil.getEmailAliasForEvent(client, userAlias['id'], eventId);
      personUtil.generateDirectLinks(persrecord, shortDomain, eventId, emailAlias);
      await personnelUtil.sendRegisterEmail(client, shortDomain, data, eventId, persrecord['person'], emailAlias, sender);

      //todo check if person has a ticket already
      //todo get active pricing list for event
      //await pricingUtil.getActivePricingForEvent(client, event['id']);
      //choose default pricing
      //create ticket for a personnel
    }
    else { //register for personnel for userid = -1
      if (data['type'] === 'event') {
        persrecord = await personnelUtil.assignUserToEventWithParameters(client, -1, data['typeId'], role['name'],
          data['position'], false, data['name'], data['tags']);
      }
      else if (data['type'] === 'stand') {
        persrecord = await personnelUtil.assignUserToStandWithParameters(client, -1, data['typeId'], role['name'],
          data['position'], false, data['name'], data['tags']);
      }
    }

    delete persrecord['person'];

    return util.handle200(data, persrecord);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
