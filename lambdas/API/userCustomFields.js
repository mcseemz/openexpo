/**
 * @description Get custom fields for the user profile with definitions.
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const dictionaryUtil = require('./model/dictionary');

function validateParams(params) {
  return true;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserCustomFields');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const fieldDefinitions = await dictionaryUtil.getFieldFormatDescription(client, null, data['language']);
    const categories = fieldDefinitions.filter(fd => fd['value']['validation'].startsWith('category:')).map(fd => fd['value']['validation'].substring('category:'.length));
    const allowedCategoryFields = (categories.length) ? await dictionaryUtil.getAllowedValuesForCategories(client, categories, data['language']) : [];
    fieldDefinitions.forEach(fd => {
      fd['allowedValues'] = (fd['value']['validation'].startsWith('category:'))
          ? allowedCategoryFields.filter(f => f['category'] === fd['value']['validation'].substring('category:'.length))
          : [];
    });

    return util.handle200(data, fieldDefinitions);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
