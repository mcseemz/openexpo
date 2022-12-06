/**
 * @description Get stand invitation by its id.
 */
const validator = require('./model/validation');
const standInvitationUtil = require('./model/standInvitation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetStandInvitations');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data.context['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    await permissionUtil.assertCanAssignPersonnelToTheEvent(client, user['id'], event['id']);

    const invitations = await standInvitationUtil.getInvitationsForEvent(client, event['id']);

    return util.handle200(data, invitations);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
