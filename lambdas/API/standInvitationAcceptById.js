/**
 * @description Accept invitation associated with a given stand by invitation id.
 *  Works when accepted from UI.
 *  For email path check @see confirmationResolve.js
 */

const validator = require('./model/validation');
const personUtil = require('./model/person');
const standUtil = require('./model/stand');
const standInvitationUtil = require('./model/standInvitation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personnelUtil = require('./model/personnel');
const companyUtil = require('./model/company');
const customNameUtil = require('./model/customname');

function validateParams(params) {
  return !!params['invitationId'] && validator.isNumber(params['invitationId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandInvitationAcceptById', '', 'event');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const invitation = await standInvitationUtil.getInvitationByIdOrThrowException(client, data['invitationId']);
    const user = await personUtil.getPersonFromDbOrThrowException(client, invitation['email_to']);
    data['entity_id'] = invitation['event'];

    if (user['email'] !== data['context']['email']) {
      throw new exceptionUtil.ApiException(405, `Registered user and user from invitation don't match`);
    }

    //create company for stand
    user['company'] = await companyUtil.createCompanyIfNotExistsForUser(client, user);

    const stand = await standUtil.createStandInDb(client, user['company'], invitation['event'], data['language'], user['id'], customNameUtil.getSubstituteName());
    //create stand owner
    await personnelUtil.assignUserToStandWithParameters(client, user['id'], stand['id'], 'stand-owner');

    await standInvitationUtil.deleteInvitationIfExists(client, invitation.id);

    stand['strings'] = [];
    stand['standMaterials'] = [];
    stand['branding'] = [];

    if (stand['status'] === 'published') {
      data['activity_type'] = 'stand_add';
    }

    return util.handle200(data, stand);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
