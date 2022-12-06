/**
 * @description Get stands owned by the user filtered.
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const standUtil = require('./model/stand');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require("./model/exception");

function validateParams(params) {
  return !!params['language'] && validator.isValidLanguage(params['language']) &&
      (!params['dateStart'] || validator.isValidDate(params['dateStart'])) &&
      (!params['dateEnd'] || validator.isValidDate(params['dateEnd']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserGetOwnedStands');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let stands = await standUtil.getOwnStands(client, data['category'], data['type'] || 'all', user['id']);

    if (data['dateStart']) {
      if (!data['dateEnd']) {
        data['dateEnd'] = data['dateStart'];
      }

      stands = stands.filter(s => validator.isDateInRange(String(s['dateStart']), data['dateStart'], data['dateEnd']));
    }

    stands.forEach(s => {
      delete s['dateStart']
      delete s['dateEnd']
    });

    await standUtil.populateStandsWithAdditionalData(client, stands, data['language']);

    return util.handle200(data, stands);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
