/**
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
 * https://aws.amazon.com/blogs/mobile/implementing-passwordless-email-authentication-with-amazon-cognito/
 *
 * {
  version: '1',
  region: 'eu-central-1',
  userPoolId: '<userpoolid>',
  userName: 'ccea8343-542d-4039-9721-359ea8cea741',
  callerContext: {
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '<clientId>'
  },
  triggerSource: 'DefineAuthChallenge_Authentication',
  request: {
    userAttributes: {
      sub: 'ccea8343-542d-4039-9721-359ea8cea741',
      'cognito:user_status': 'FORCE_CHANGE_PASSWORD',
      email_verified: 'true',
      'custom:domain': '<domainname>',
      'custom:baseEmail': '<email>',
      email: 'a-73-115549788--1340040841@enter_your.domain'
    },
    session: []
  },
  response: { challengeName: null, issueTokens: null, failAuthentication: null }
}
 */

const util = require("./model/util");

  //создать альяс email
function recreateAlias(curEmailAlias, curEmail) {
  //a-73-115549788--1340040841@enter_your.domain
  const split = curEmailAlias.split('-',4);
  if (split[0] !== 'a' || Number(split[1])<=0 ) return "";
  let emailAlias = 'a-' + split[1] + '-';
  emailAlias += util.hashCode(emailAlias + curEmail);
  emailAlias += '-' + util.hashCode(curEmail) + "@enter_your.domain";

  return emailAlias;
}

exports.handler = async function (event) {
  console.log(event);
  // util.handleStart(event, 'lambdaAuthChallengeDefine');

  if (event.request.session &&
    event.request.session.find(attempt => attempt.challengeName !== 'CUSTOM_CHALLENGE')) {
    // We only accept custom challenges; fail auth
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  } else if (event.request.session &&
    event.request.session.length >= 3 &&
    event.request.session.slice(-1)[0].challengeResult === false) {
    // The user provided a wrong answer 3 times; fail auth
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  } else if (event.request.session &&
    event.request.session.length &&
    event.request.session.slice(-1)[0].challengeName === 'CUSTOM_CHALLENGE' && // Doubly stitched, holds better
    event.request.session.slice(-1)[0].challengeResult === true) {
    // The user provided the right answer; succeed auth
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else if ( event.request.userAttributes['custom:invitationType'] === 'freshtix.com') {
    // The user is from freshtix. Login through
    console.log("freshtix detected. Appriving.");
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else if ( event.request.userAttributes['custom:baseEmail'] &&
    recreateAlias(event.request.userAttributes['email'], event.request.userAttributes['custom:baseEmail'])
      === event.request.userAttributes['email']) {
    // The user is from freshtix. Login through
    console.log("transparent login detected. Approving.");
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else {
    // The user did not provide a correct answer yet; present challenge
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  }

  // util.handle200(event);
  return event;
};
