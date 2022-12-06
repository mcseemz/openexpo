/**
 * @description Update stand by id.
 */
const validator = require('./model/validation');
const standUtils = require('./model/stand');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['id'] && (!params['language'] || validator.isValidLanguage(params['language'])) &&
      (!params['company'] || validator.isNumber(params['company'])) &&
      (!!params['event'] || validator.isNumber(params['event'])) &&
      (!params['status'] || validator.isValidStandStatus(params['status'])) &&
      (!params['customName'] || (!!params['customName'] && !validator.isNumber(params['customName'])));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandUpdateById', '', 'event', data['stand']['event']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data.stand)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const initialStand = await standUtils.getStandFromDbOrThrowException(client, data['standId']);
    data['stand']['id'] = initialStand['id'];
    await permissionUtil.assertCanUpdateStand(client, user['id'], initialStand['id']);

    const oldStand = await standUtils.getStandFromDbOrThrowException(client, data.stand['id']);

    data.stand.parameter = {
      show_empty: data.stand['show_empty'] || false,
      chat_enable: data.stand['chat_enable'] || false,
    }
    data['stand']['customName'] = await validator.getValidCustomNameOrThrowException(client, data['stand']['customName'],'stand',data['stand']['id']);
    const stand = await standUtils.updateStandInDbOrThrowException(client, data.stand, user['id']);

    stand['show_empty'] = stand.parameter.show_empty;
    stand['chat_enable'] = stand.parameter.chat_enable;

    delete stand.parameter;

    stand['strings'] = data.stand['strings'];
    stand['standMaterials'] = data.stand['standMaterials'];
    stand['branding'] = data.stand['branding'];

    //for streams
    if (oldStand['status'] !== 'published' && stand['status'] === 'published') {
      data['activity_type'] = 'stand_add';
    }

    return util.handle200(data, stand);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
