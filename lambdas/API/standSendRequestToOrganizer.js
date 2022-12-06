/**
 * @description Send request from stand owner to an organizer.
 *  Creates invitation and returns its id.
 */

const validator = require('./model/validation');
const eventUtil = require('./model/event');
const personUtil = require('./model/person');
const standInvitationUtil = require('./model/standInvitation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const util = require('./model/util');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandSendRequestToOrganizer');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['event'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const event = await eventUtil.getEventFromDbOrThrowException(client, data['event']['eventId']);

    const userId = personUtil.getPersonId(client, data['context']['email']);
    const invitationId = await standInvitationUtil.createInvitation(client, userId, event['company'], event['id']);
    
    if (invitationId === -1) {
      throw new exceptionUtil.ApiException(502, `Couldn't create invitation.`);
    }

    return util.handle200(data, invitationId);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
