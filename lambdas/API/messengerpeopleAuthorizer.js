// A simple token-based authorizer example to demonstrate how to use an authorization token
// to allow or deny a request. In this example, the caller named 'user' is allowed to invoke
// a request if the client-supplied token value is 'allow'. The caller is not allowed to invoke
// the request if the token value is 'deny'. If the token value is 'unauthorized' or an empty
// string, the authorizer function returns an HTTP 401 status code. For any other token value,
// the authorizer returns an HTTP 500 status code.
// Note that token values are case-sensitive.

const externalParamsUtil = require('./model/externalParams');

const env = process.env.Environment;
let secret; //Messengerpeople credentials
const secretName = env + '/messengerpeople';

exports.handler = async function(event, context /*, callback*/) {
  console.log('called', JSON.stringify(event), JSON.stringify(context));
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  var token = event.authorizationToken.replace("Bearer ", "").trim();
  console.log('token to try: ' + token);

  console.log("context", JSON.stringify(context));

  if (!secret) {  //we consider credentials identical
    secret = JSON.parse(await externalParamsUtil.getSecret(secretName));
  }

  if (!secret.secret || secret.secret !== token) {
    console.log("Secret not matched");
    return "Unauthorized";   // Return a 401 Unauthorized response
    // callback("Unauthorized");   // Return a 401 Unauthorized response
  } else {
    console.log("Secret matched");
    return generatePolicy('messengerpeople', 'Allow', event.methodArn);
    // callback(null, generatePolicy('user', 'Allow', event.methodArn));
  }
  // switch (token) {
  //   case 'allow':
  //     callback(null, generatePolicy('user', 'Allow', event.methodArn));
  //     break;
  //   case 'deny':
  //     callback(null, generatePolicy('user', 'Deny', event.methodArn));
  //     break;
  //   case 'unauthorized':
  //     callback("Unauthorized");   // Return a 401 Unauthorized response
  //     break;
  //   default:
  //     callback("Error: Invalid token"); // Return a 500 Invalid token response
  // }
};

// Help function to generate an IAM policy
var generatePolicy = function(principalId, effect, resource) {
  var authResponse = {};

  authResponse.principalId = principalId;
  if (effect && resource) {
    var policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    var statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  // Optional output with custom properties of the String, Number or Boolean type.
  authResponse.context = {
    "stringKey": `${new Date().getTime()}`,
    "numberKey": 123,
    "booleanKey": true
  };

  console.log("generated policy", JSON.stringify(authResponse))
  return authResponse;
}
