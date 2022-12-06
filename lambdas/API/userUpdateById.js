/**
 * @description Update given user.
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const dictionaryUtil = require('./model/dictionary');

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']) &&
      (!params['name'] || validator.isValidNonEmptyString(params['name'])) &&
      (!params['surname'] || validator.isValidNonEmptyString(params['surname'])) &&
      (!params['timezone'] || validator.isValidTimeZone(params['timezone'])) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

//todo name/surname validation for valid strings (no spec. chars)
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserUpdateById');

  data['user']['id'] = data['userId'];
  let client = util.emptyClient;
  try {
    if (!validateParams(data['user'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    if (user['id'] !== Number(data['user']['id'])) {
      await permissionUtil.assertCanManageUserData(client, user['id']);
    }

    if (data['user']['fields']) {
      const fieldNames = Object.keys(data['user']['fields']);
      const fieldDefinitions = await dictionaryUtil.getFieldFormatDescription(client, fieldNames);
      console.log('fieldDefinitions', fieldDefinitions);
      if (fieldNames.length !== fieldDefinitions.length) {
        throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
      }

      const categories = fieldDefinitions.filter(fd => fd['value']['validation'].startsWith('category:')).map(fd => fd['value']['validation'].substring('category:'.length));
      const allowedCategoryFields = (categories.length) ? await dictionaryUtil.getAllowedValuesForCategories(client, categories) : [];

      fieldNames.forEach(fName => {
        const fieldDefinition = fieldDefinitions.find(f => f['fieldname'] === fName);
        const allowedValues = (fieldDefinition['value']['validation'].startsWith('category:'))
            ? allowedCategoryFields.filter(f => f['category'] === fieldDefinition['value']['validation'].substring('category:'.length)).map(f => f['value'])
            : [];
        if (!validator.isValidCustomField(data['user']['fields'][fName], fieldDefinition['value']['type'], fieldDefinition['value']['validation'], allowedValues, fieldDefinition['value']['len'])) {
          throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
        }
      });
    }

    let address = {
      linkedin: data['user'].address.linkedin,
      twitter: data['user'].address.twitter,
      facebook: data['user'].address.facebook,
      instagram: data['user'].address.instagram,
      telegram: data['user'].address.telegram,
      telegram_id: data['user'].address.telegram !== user.address.telegram ? null : user.address.telegram_id,
      whatsapp: data['user'].address.whatsapp,
      whatsapp_id: data['user'].address.whatsapp !== user.address.whatsapp ? null : user.address.whatsapp_id,
      city: data['user'].address.city,
      phone: data['user'].address.phone,
      state: data['user'].address.state,
      prefix: data['user'].address.prefix,
      address1: data['user'].address.address1,
      address2: data['user'].address.address2,
      postcode: data['user'].address.postcode,
      use_as_billing: data['user'].address.use_as_billing
    }

    let updatedUser = await personUtil.updateUserInDbNoAddress(client, data['user']);
    if (updatedUser == null) {
      throw new exceptionUtil.ApiException(404, 'User not found');
    }

    updatedUser = await personUtil.updateUserAddressInDb(client, Number(data['user']['id']), address);

    updatedUser['branding'] = data['user']['branding'];
    personUtil.preparePersonForOutput(updatedUser);

    return util.handle200(data, updatedUser);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
