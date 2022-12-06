/**
 * @description creating challenge email to user
 */
const AWS = require('aws-sdk');

const externalParamsUtil = require('./model/externalParams');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
// const util = require('./model/util');

let ses = new AWS.SES({ apiVersion: '2010-12-01' });
const digitGenerator = require('crypto-secure-random-digit');

exports.handler = async function (event) {
  console.log(event);
  // util.handleStart(event, 'lambdaAuthChallengeCreate');

  let secretLoginCode;
  if (!event.request.session || !event.request.session.length) {
    //todo check that user exists in db

    // This is a new auth session
    // Generate a new secret login code and mail it to the user
    secretLoginCode = digitGenerator.randomDigits(6).join('');

    await sendEmail(event.request.userAttributes.email, secretLoginCode, event.userPoolId);

  } else {

    // There's an existing session. Don't generate new digits but
    // re-use the code from the current session. This allows the user to
    // make a mistake when keying in the code and to then retry, rather
    // the needing to e-mail the user an all new code again.
    const previousChallenge = event.request.session.slice(-1)[0];
    if (previousChallenge.challengeMetadata && previousChallenge.challengeMetadata.match(/CODE-(\d*)/)) {
      secretLoginCode = previousChallenge.challengeMetadata.match(/CODE-(\d*)/)[1];
    }
  }

  // This is sent back to the client app
  event.response.publicChallengeParameters = {
    email: event.request.userAttributes.email
  };

  // Add the secret login code to the private challenge parameters
  // so it can be verified by the "Verify Auth Challenge Response" trigger
  event.response.privateChallengeParameters = { secretLoginCode };

  // Add the secret login code to the session so it is available
  // in a next invocation of the "Create Auth Challenge" trigger
  event.response.challengeMetadata = `CODE-${secretLoginCode}`;

  // util.handle200(event);
  return event;
};

async function sendEmail(emailAddress, secretLoginCode, userpool) {

  let shortDomain = await poolUtil.getOriginFromUserpool(userpool);
  if (!shortDomain) {
    console.error("undefined userpool: " + userpool);
    throw new exceptionUtil.ApiException(404, 'domain not found');
  }

  console.log("take first origin: " + shortDomain);

  let sender = await externalParamsUtil.getSenderEmail(shortDomain);

  const params = {
    "Source": sender,
    "Template": "loginCodeGeneration",
    "Destination": {
      "ToAddresses": [emailAddress]
    },
    "ConfigurationSetName": "tex-dev",
    "Tags": [
      {
        Name: 'email-general',
        Value: 'loginCodeGeneration'
      },
    ],
    "TemplateData": `{ "code": "${secretLoginCode}", "domain": "${shortDomain}" }`
  }

  await ses.sendTemplatedEmail(params).promise();
}
