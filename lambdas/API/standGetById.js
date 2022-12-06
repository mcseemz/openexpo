/**
 * @description Get stand by id.
 */
const validator = require('./model/validation');
const standUtil = require('./model/stand');
const stringsUtil = require('./model/strings');
const binaryUtil = require('./model/binary');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const permissionUtil = require('./model/permissions');

function validateParams(params) {
  return !!params['standId'] && (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandGet');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const stand = await standUtil.getStandFromDbOrThrowException(client, data['standId'], user ? user['id'] : '');

    //TODO validation that stand is available (event published/public, stand status active)

    const isUber = user
      ? await permissionUtil.assertIsPlatformEventAccess(client, user['id'])
      : false;
    if (isUber) {
      //we add event editing granst so frontend check works
      stand['grants'].push('stand-edit');
      stand['grants'].push('stand-delete');
      stand['grants'].push('stand-manage-news');
      stand['grants'].push('stand-manage-staff');
      stand['grants'].push('stand-view-report');
      stand['grants'].push('stand-use-chat');
      stand['grants'].push('stand-use-video');
    }

    stand['show_empty'] = stand.parameter && stand.parameter.show_empty;
    stand['chat_enable'] = stand.parameter && stand.parameter.chat_enable;

    delete stand.parameter;

    const additionalStrings = await stringsUtil.getStringsForEntity(client, 'stand', stand['id'], data['language']);

    if (additionalStrings != null) {
      stand['strings'] = additionalStrings;
    }

    if (!data['open']) {
      stand['standMaterials'] = await binaryUtil.getMaterialsForStand(client, stand['id']);
      //get branding for stand materials
      const allIds = stand['standMaterials'].map(e => e['id']);
      const allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'branding', 'upload', allIds);
      stand['standMaterials'].forEach((c) => {
        c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
      });
    }
    stand['branding'] = await binaryUtil.getBrandingMaterialsForStand(client, stand['id']);

    return util.handle200(data, stand);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
