/**
 * @description update personnel record, and register user if email is included. Send an email using SES and `eventExternalUserInvitation` template.
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
const pricingUtil = require("./model/eventPricing");
const stringUtils = require("./model/strings");
const ticketUtil = require("./model/ticket");

/**
 * Checks all incoming parameters
 */
function validateParams(params) {
  return (params['type'] === 'event' || params['type'] === 'stand') &&
    !!params['typeId'] && validator.isNumber(params['typeId']) &&
    !!params['roleId'] && validator.isNumber(params['roleId']) &&
    (!params['userEmail'] || validator.isValidEmail(params['userEmail'])) &&
    !!params['position'] && validator.isValidNonEmptyString(params['position']) &&
    (!params['pricing'] || validator.isNumber(params['pricing'])) &&
    !!params['name'] && validator.isValidNonEmptyString(params['name']);
}

/**
 * Please check {@link ../../API/APIv1.html#inviteexternalusertoevent API} for conversion template
 * @param {object} data with converted request
 * @param {object} context with lambda context
 * @returns standart status object
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPersonnelUpdateById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //current user
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let eventId = null;
    //check if object exists
    const personnel = await personnelUtil.getPersonnelById(client, data['personnelId'],true, data['language']);
    if (!personnel) {
      throw new exceptionUtil.ApiException(405, 'Personnel not found');
    }
    //check if user has permission
    if (data['type'] === 'event' ) {
      const event = await eventUtil.getEventFromDbOrThrowException(client, data['typeId']);
      eventId = event['id'];  //convert to number
      await permissionUtil.assertCanAssignPersonnelToTheEvent(client, user.id, data['typeId']);

      if (personnel['event'] !== eventId) {
        throw new exceptionUtil.ApiException(405, 'Invalid personnel parameters');
      }
    }
    else if (data['type'] === 'stand' ) {
      let stand = await standUtil.getStandFromDbOrThrowException(client, data['typeId']);
      eventId = stand['eventId'];
      await permissionUtil.assertCanAssignPersonnelToTheStand(client, user.id, data['typeId']);

      if (personnel['stand'] !== stand['id']) {
        throw new exceptionUtil.ApiException(405, 'Invalid personnel parameters');
      }
    }
    else throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');

    const invEmail = data['userEmail'] ? data['userEmail'].trim().toLowerCase() : undefined;

    //check if role exists, and it's proper name
    const role = await roleUtil.getRoleFromDbOrThrowException(client, data['roleId']);
    if (!role['name'].startsWith(data['type'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    let personnelUserId = personnel['personid'];

    //check for self-invite for newly added email
    // if (personnelUserId < 0 && data['context']['email'] === data['userEmail']) { //self-invite
    //   throw new exceptionUtil.ApiException(405, 'You can not invite this user to the event');
    // }

    const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
    let persrecord = {};

    //if email exist, check for user
    if (personnelUserId < 0 && !!data['userEmail']) {
      //register for event, get link
      let name = data['name'].trim().toLowerCase();
      let userAlias = await personUtil.registerPersonForEvent(client, shortDomain, eventId, invEmail,
        name.split(/\\s+/)[0].trim(), '');
      personnelUserId = userAlias['id'];
      //assign real user
      await personnelUtil.updatePersonnelUserById(client, personnel['id'], personnelUserId);

      const emailAlias = await personUtil.getEmailAliasForEvent(client, userAlias['id'], eventId);
      let sender = await externalParamsUtil.getSenderEmail(shortDomain);
      await personnelUtil.sendRegisterEmail(client, shortDomain, data, eventId, personnelUserId, emailAlias, sender);
    }
    else if (personnelUserId > 0 && !data['userEmail']) {
      //unregistering user
      await personUtil.unregisterPersonForEvent(client, eventId, personnel['email']);
      //and sending email
      const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);
      let sender = await externalParamsUtil.getSenderEmail(shortDomain);
      await personnelUtil.sendUnregisterEmail(client, sender, eventId, personnel['email'], personnelUserId);
    }

    //update fields
    if (data['type'] === 'event' || data['type'] === 'stand') {
      persrecord = await personnelUtil.updatePersonnelById(client, personnel['id'], role['name'],
        data['position'], !data['userEmail'] ? false : !!data['public'], data['name'], data['tags']);
      if (persrecord['personid'] > 0) {
        const emailAlias = await personUtil.getEmailAliasForEvent(client, persrecord['personid'], eventId);
        personUtil.generateDirectLinks(persrecord, shortDomain, eventId, emailAlias);

        //update ticket record
        if (data['pricing'] && data['pricing'] > 0) {
          const pricing = await pricingUtil.getPricingByIdOrThrowException(client, data['pricing']);
          const tickets = await ticketUtil.getActiveForUserAndEvent(client, persrecord['personid'], eventId);
          let samepricing = false;
          for (ticket of tickets) {
            if (ticket.payment_status === 'personnel' && ticket.pricing !== pricing['id']) {
              //this one we should update
              await ticketUtil.updatePaymentStatus(client, ticket['id'], 'cancelled');
            }
            samepricing |= ticket.payment_status === 'personnel' && ticket.pricing === pricing['id'];
          }

          if (!samepricing) {
            let ticketdata = {
              buyer: persrecord['personid'],
              event: eventId,
              pricing: pricing['id'],
              payment_status: 'personnel',
              tags: pricing['tags'],
              parameter: {}
            }

            await ticketUtil.createTicketInDb(client, ticketdata);
            persrecord['price'] = pricing['id'];
          }
        } else {  //ceck if we need to delete existing binding
          const tickets = await ticketUtil.getActiveForUserAndEvent(client, persrecord['personid'], eventId);
          for (ticket of tickets) {
            if (ticket.payment_status === 'personnel') {
              //this one we should update
              await ticketUtil.updatePaymentStatus(client, ticket['id'], 'cancelled');
            }
          }
        }
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
