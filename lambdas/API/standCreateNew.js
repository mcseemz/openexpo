/**
 * @description Create new stand.
 * only event owner can create stands directly
 * POST /stand
 * parameters in body:
 * {
 *   eventId
 *   tags
 *   language
 *   name
 * }
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const standUtil = require('./model/stand');
const poolUtil = require('./model/pool');
const personnelUtil = require('./model/personnel');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const stringUtil = require('./model/strings');
const util = require('./model/util');

function validateParams(params) {
  return !params['id'] &&
    !!params['eventId'] && validator.isNumber(params['eventId']) &&
    //!!params['language'] && validator.isValidLanguage(params['language']) &&
    !!params['name'] && validator.isValidNonEmptyString(params['name']) &&
    (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName'])))
    //&& (!params['status'] || validator.isValidStandStatus(params['status']))
    ;
  //TODO tags validity check
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandCreateNew', '', 'event', data['stand']['eventId']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data['stand'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
//    user['company'] = await companyUtil.createCompanyIfNotExistsForUser(client, user);

    //event owner can create stand in company
    await permissionUtil.assertCanInviteToCreateStandForEvent(client, user['id'], data['stand']['eventId']);

    data['stand']['customName'] = await validator.getValidCustomNameOrThrowException(client,  data['stand']['customName']);
    const stand = await standUtil.createStandInDb(client, user['company'], data['stand']['eventId'],
      /* data['stand']['language'] */ null, user['id'], data['stand']['customName'], data['stand']['tags'], 'draft');
    if (!stand) {
      throw new exceptionUtil.ApiException(405, `Couldn't create a stand`);
    }
    stand['strings'] = await stringUtil.insertStringsIntoDB(client,
      [{ref: 'stand', ref_id: stand['id'], category: 'name', language: 'en_GB'/*data['stand']['language']*/, value: data['stand']['name']}]);
    await personnelUtil.assignUserToStandWithParameters(client, user['id'], stand['id'], 'stand-owner');
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
