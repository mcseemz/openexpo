/**
 * Configures an email to new user to confirm the registration.
 * expected event format:
 {
  version: '1',
  region: 'eu-central-1',
  userPoolId: 'eu-central-1_WmDb8dJpb',
  userName: '05839a40-a8a6-4189-aec5-7dcb5e4fa752',
  callerContext: {
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '5r70usnvfi23lpl1jkfgjgrc8i'
  },
  triggerSource: 'CustomMessage_SignUp',
  request: {
    userAttributes: {
      sub: '05839a40-a8a6-4189-aec5-7dcb5e4fa752',
      'cognito:email_alias': 'somebody@enter_your.domain',
      'cognito:user_status': 'CONFIRMED',
      email_verified: 'true',
      email: 'somebody@enter_your.domain'
    }
  },
  response: {}
}
 */

const {activateTemplate} = require('./resources/activationEmailTemplate');
const {emailTemplate} = require('./resources/forgotPasswordEmailTemplate');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const util = require('./model/util');

function configureSignUpMessage(event) {
  event.response.smsMessage = "Welcome to the service. Your confirmation code is " + event.request.codeParameter;
  event.response.emailSubject = "Openexpo: Confirm your email address";
  const domain = event.request.userAttributes['custom:domain'];
  const invitationId = event.request.userAttributes['custom:invitationId'];
  const invitationType = event.request.userAttributes['custom:invitationType'];
  const url = `https://${domain}/emailconfirm?userName=${encodeURIComponent(event.request.userAttributes.email)}&code=${event.request.codeParameter}&clientId=${event.callerContext.clientId}`
    + (invitationId ? `&invitationId=${invitationId}` : '')
    + (invitationType ? `&invitationType=${invitationType}` : '');
  event.response.emailMessage = activateTemplate(url);
}

async function configureResetPasswordMessage(event, context) {
  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByUserpool(event.userPoolId, context);

    if (event.request.userAttributes['cognito:user_status'] === 'RESET_REQUIRED') {
      //forced reset status, possible CSV upload
      const user = await personUtil.getPersonFromDB(client, event.request.userAttributes.email);
      if (!user) { //new user, we need to add it
        await personUtil.createUserInDb(client, {
          email:event.request.userAttributes['email'],
          name:event.request.userAttributes['name'],
          surname:event.request.userAttributes['family_name']
        });
      }
    }
    const user = await personUtil.getPersonFromDbOrThrowException(client, event.request.userAttributes.email);
    event.response.smsMessage = "Your confirmation code is " + event.request.codeParameter;
    event.response.emailSubject = "Openexpo: Password recovery";
    event.response.emailMessage = emailTemplate(event.request.codeParameter, user['name'], user['surname']);
  } catch (err) {
    console.error("error:", err);
  } finally {
    console.log("RELEASING")
    if (client) {
      client.release(true);
    }
  }
}

exports.handler = async function (event, context, callback) {
  console.log(event, 'lambdaCustomMessage');  //cannot add values to event
  console.log("EVENT:\n", event);

  if (event.triggerSource === "CustomMessage_SignUp") {
    configureSignUpMessage(event);
  } else if (event.triggerSource === "CustomMessage_ForgotPassword") {  //reset password flow for both uploads and general resets
    await configureResetPasswordMessage(event, context);
  }

  console.log("CLOSING EVENT:\n", event);
  callback(null, event);
};
