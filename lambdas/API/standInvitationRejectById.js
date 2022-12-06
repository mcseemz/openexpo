/**
 * @description Reject invitation associated with a given stand by invitation id.
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const standInvitationUtil = require('./model/standInvitation');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return !!params['invitationId'] && validator.isNumber(params['invitationId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandInvitationRejectById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const invitation = await standInvitationUtil.getInvitationById(client, data['invitationId']);
    if (invitation == null) {
      throw new exceptionUtil.ApiException(404, 'Invitation not found');
    }

    const user = await personUtil.getPersonFromDB(client, invitation['email_to']);
    if (user == null) {
      throw new exceptionUtil.ApiException(404, 'User not registered');
    }

    if (user['email'] !== data['context']['email']) {
      throw new exceptionUtil.ApiException(405, 'Registered user and user from invitation don\'t match');
    }

    const numDeleted = await standInvitationUtil.deleteInvitationIfExists(client, data['invitationId']);
    if (numDeleted <= 0) {
      throw new exceptionUtil.ApiException(404, 'Invitation not found',);
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
