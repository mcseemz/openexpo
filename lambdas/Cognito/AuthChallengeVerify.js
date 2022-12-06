// const util = require("./model/util");

exports.handler = async function (event) {
  console.log(event);
  // util.handleStart(event, 'lambdaAuthChallengeVerify');

  const expectedAnswer = event.request.privateChallengeParameters.secretLoginCode;
  if (event.request.challengeAnswer === expectedAnswer) {
    event.response.answerCorrect = true;
  } else {
    event.response.answerCorrect = false;
  }

  // util.handle200(event);
  return event;
};