/**
 * Lambda for pushing filtered CloudWatch data to SNS. </br>
 * We take snadard statistics from incoming log line it and pack it for proper influx json. Supported parameters are:
 * @class CWLogsProcessing
 */
const AWS = require('aws-sdk');
// Set region
AWS.config.update({region: 'eu-central-1'});

const sns = new AWS.SNS({apiVersion: '2010-03-31'});

const zlib = require('zlib');

/**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} event line from containing base64-ed zipped line from logs containing json with stats parameters
 * @param {Object} context of invocation
 * @return ObjectExpression
 */
exports.handler = async function(event, context) {
  const debug = process.env.debug;
  if (debug) console.log("EVENT:\n", event);

  const messages = []; //we'll push it to SNS

  let payload = Buffer.from(event.awslogs.data, 'base64');
  const logevents = JSON.parse(zlib.unzipSync(payload).toString()).logEvents;

  for (const logevent of logevents) {
    const {message} = logevent;
    if (message.includes('"Sns": {')) { //we do not process data logged from SNS topics to escape recursions
      if (debug) console.log("sns skipped");
      continue;
    }
    if (message.includes('lambda_name:')) { //we do not process raw json object data with keywords logged from some event processing
      if (debug) console.log("raw data skipped");
      continue;
    }
    if (debug) console.log(message);

    try {
      const mes = JSON.parse(message);
      delete mes.level;
      messages.push(mes);
    } catch (e) {
      console.log('error detected. Message:', message, e);
      throw e;
    }
  }

  //pushing them to SNS
  //Create publish parameters
  const params = {
    Message: JSON.stringify(messages),
    TopicArn: process.env.LogStreamArn //'arn:aws:sns:eu-central-1:enter_your_aws_account:LogStream'
  };

  if (messages.length > 0)
    try {
      await sns.publish(params).promise();
    } catch (e) {
      console.log('sns failed');
      console.log(e.stack)
    }
  if (debug) console.log('sns done');

  return {};
}
