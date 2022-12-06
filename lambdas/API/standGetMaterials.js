/**
 * @description Get materials associated with a given stand.
 */
 const util = require('./model/util');
 const exceptionUtil = require('./model/exception');
 const poolUtil = require('./model/pool');
 
function validateParams(params) {
  return !!params['standid'];
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaStandGetMaterials');

  let client = util.emptyClient;
  try {
      if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    return util.handle200(data, {});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
