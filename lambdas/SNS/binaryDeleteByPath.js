/**
 * @description Delete binary in S3 by Path. Source is SQS message
 * @class binaryDeleteByPath
 * {
    "Records": [
        {
            "messageId": "059f36b4-87a3-44ab-83d2-661975830a7d",
            "receiptHandle": "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
            "body": "test",
            "attributes": {
                "ApproximateReceiveCount": "1",
                "SentTimestamp": "1545082649183",
                "SenderId": "AIDAIENQZJOLO23YVJ4VO",
                "ApproximateFirstReceiveTimestamp": "1545082649185"
            },
            "messageAttributes": {},
            "md5OfBody": "098f6bcd4621d373cade4e832627b4f6",
            "eventSource": "aws:sqs",
            "eventSourceARN": "arn:aws:sqs:us-east-2:123456789012:my-queue",
            "awsRegion": "us-east-2"
        }
    ]
}
 */
const binaryUtil = require('./model/binary');
const util = require('./model/util');

const llog = util.log;

exports.handler = async function(event, context) {
  util.handleStart(event, 'lambdaBinaryDeleteByPath');

  for (const record of event.Records) {
    const { body } = record;

    try {
      const message = JSON.parse(body);
      const {uploadsBucket, path} = message;

      //todo check that current env matched env in uploads bucket name?
      await binaryUtil.deleteMaterialDuplicates({log: llog}, path, uploadsBucket);

    } catch (e) {
      llog.error('cannot process message body', e);
      llog.error(`message body ${body}`);
    }
    llog.debug(`deleted successfully: ${body}`);
  };

  util.handleFinally(event, null);
  return {};
}
