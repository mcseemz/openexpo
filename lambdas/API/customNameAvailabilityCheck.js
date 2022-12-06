/**
 * @description Check if the custom name for the entity of specified type is taken
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const validator = require('./model/validation');
const customNameUtil = require('./model/customname');
const util = require('./model/util');
const slugify = require('slugify');

function validateParams(params) {
  return !!params['customName'] && validator.isValidNonEmptyString(params['customName'])
    && !!params['dataType'] && validator.isValidNonEmptyLongString(params['dataType']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'customNameAvailabilityCheck');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    if (data['customName']) {
      data['customName'] = slugify(data['customName'], {remove: /[:]/g});
    };

    const isAvailable = await customNameUtil.customNameIsAvailable(client, data['customName']);
    if (!isAvailable){
      throw new exceptionUtil.ApiException(409, 'Name is not available');  
    }

    return util.handle200(data, isAvailable);
  } catch (err) {
     return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
