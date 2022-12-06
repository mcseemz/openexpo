import { CognitoUserPoolTriggerHandler } from 'aws-lambda';

export const handler: CognitoUserPoolTriggerHandler = async event => {
  console.log(event);

  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  return event;
};