/**
 *  @description Discount module
 *  @class discountUtil
 */
const util = require('./util');
const exceptionUtil = require('./exception');

/**
* identify discount by id.
* Throw exception if not found
* @param {Object} client
* @param {number} discountId
* @returns {Promise<*[]|*>}
*/
async function getDiscountFromDbOrThrowException(client, discountId) {
    let query = {
        text: `SELECT * FROM discount WHERE id = $1`,
        values: [discountId]
    };
    
    const llog = client.log || util.log;
    llog.debug('REQUEST createActivityInDb: ', query);
    const discountRes = await client.query(query);
    llog.debug(`fetched: ${discountRes.rows.length}`);

    if (discountRes.rows.length === 0 || !discountRes.rows[0]) {
        throw new exceptionUtil.ApiException(404, 'Discount not found');;
    };

    return discountRes.rows[0];
}

exports.getDiscountFromDbOrThrowException = getDiscountFromDbOrThrowException;