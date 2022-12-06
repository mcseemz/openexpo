/**
 * @description Get user by Id.
 */
const validator = require('./model/validation');
const userUtil = require('./model/person');
const binaryUtil = require('./model/binary');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const roleUtil = require('./model/role');

function validateParams(params) {
  return !!params['userId'] && (validator.isNumber(params['userId']) || params['userId'] === '@me');
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserGetById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    if (!data.context['email']) {
      throw new exceptionUtil.ApiException(403, 'You are not authorized to view this data');
    }

    let user;
    if (data['userId'] === '@me') {
      user = await userUtil.getPersonFromDB(client, data.context['email'], true);
      user['grants'] = await roleUtil.getMyCompanyGrants(client, user['id']);
      userUtil.preparePersonForOutput(user);  //fields cleanup
    } else {
      const tmpUser = await userUtil.getPersonById(client, data['userId']);
      if (tmpUser) {
        user = {
          id: tmpUser['id'],
          name: tmpUser['name'],
          surname: tmpUser['surname']
        }
      }
    }

    if (user) {
      user['branding'] = await binaryUtil.getBrandingMaterialsForUser(client, user['id'], data['language']);
    }

    return util.handle200(data, user);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
