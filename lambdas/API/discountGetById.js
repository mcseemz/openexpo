/**
 * @description Get discount by Id.
 * @class discountGetById
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const discountUtil = require('./model/discount');

/**
* checks for discountCode
* @param {Object} incoming params
* @method validateParams
* @return {Boolean} true if params are ok 
*/
function validateParams(params) {
    return !!params['discountCode'];
}

/**
 * @method handler
 * @async
 * @param {Object} data with processed params
 * @param {Object} context lambda context
 * @return {Object} discount schema object. Status:<br/> 
 * 200 - ok<br/>
 * 404 - invalid Id<br/>
 * 405 - invalid args<br/>
*/
exports.handler = async function (data, context) {
    util.handleStart(data, 'lambdaDiscountGetById');

    let client = util.emptyClient;
    try {
        if (!validateParams(data)) {
            throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
        }

        client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

        const discount = await discountUtil.getDiscountFromDbOrThrowException(client, data.discountCode);
        delete discount['company'];
        return util.handle200(data, discount);
    } catch (err) {
        return util.handleError(data, err)
    } finally {
        util.handleFinally(data, client);
    }
}
