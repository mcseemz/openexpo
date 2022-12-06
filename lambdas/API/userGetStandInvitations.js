/**
 * @description Get invitations for a given user.
 */
const standInvitationUtil = require('./model/standInvitation');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return true;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserGetStandInvitations');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const invitations = await standInvitationUtil.getInvitationsForUser(client, data['context']['email']);

    return util.handle200(data, invitations);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
