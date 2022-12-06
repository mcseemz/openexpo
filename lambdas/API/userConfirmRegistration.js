/**
 * @description Confirm user registration.
 */

const AWS = require('aws-sdk');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({apiVersion: '2019-11-07'});

function validateParams(params) {
  return !!params['code'] && !!params['userName'] && !!params['clientId'];
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserConfirmRegistration');

  let client = util.emptyClient;
  try {
    if (!validateParams(data['params'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    let params = {
      ClientId: data['params']['clientId'],
      ConfirmationCode: data['params']['code'],
      Username: data['params']['userName']
    }

    await CognitoIdentityServiceProvider.confirmSignUp(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
