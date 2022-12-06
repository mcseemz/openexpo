
const AWS = require("aws-sdk");
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const activityUtil = require('./model/activity');
const standUtil = require('./model/stand');
const eventUtil = require('./model/event');
const binaryUtil = require('./model/binary');
const poolUtil = require('./model/pool');
const s3 = new AWS.S3();

//=====================================================
/**
 * S3 event processing to update binary state and tag it properly </br>
 * event format documented here: https://docs.aws.amazon.com/AmazonS3/latest/dev/notification-content-structure.html </br>
 <pre>
 {
    "Records": [
        {
            "eventVersion": "2.1",
            "eventSource": "aws:s3",
            "awsRegion": "eu-central-1",
            "eventTime": "2020-06-17T23:37:42.667Z",
            "eventName": "ObjectCreated:Put",
            "userIdentity": {
                "principalId": "AWS:AROA2FLWYMPUBNJEZHA5K:standCreateUploadUrl"
            },
            "requestParameters": {
                "sourceIPAddress": "2.4.28.178"
            },
            "responseElements": {
                "x-amz-request-id": "DF2D2BA1CC7B8B20",
                "x-amz-id-2": "baZ87iMSiwCmuhdGN8XJbt3jBTAlX8mzxgV9Cm1XD541suf4NB+ZIBNNy9nlXXLJU80JmCh1eNiJEGd6g4hrP5Hsj0OXCFYL"
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "f8182873-75f4-4ce4-9e89-de629ab38d22",
                "bucket": {
                    "name": "tex-binary-dev",
                    "ownerIdentity": {
                        "principalId": "AK7SIAEEJBSKQ"
                    },
                    "arn": "arn:aws:s3:::tex-binary-dev"
                },
                "object": {
                    "key": "company/5/stands/8/binary/f-172c4a52ac3-34b5b5fb8716.png",
                    "size": 375319,
                    "eTag": "a5616cb9037e58edb16c554948459804",
                    "sequencer": "005EEAA948152992C2"
                }
            }
        }
    ]
}
 </pre>
 * @class UploadS3Object
 */

/**
 * @method handler
 * @async
 * @param {Object} event incoming S3 event
 * @param {Object} context lambda context
 * @return {Object} { </br>
         statusCode: 404, </br>
         body: 'Related binary not found' </br>
       }</br>
 */
exports.handler = async (event, context) => {
  util.handleStart(event, 'lambdaUploadS3Object');
  const bucketName = event.Records[0].s3.bucket.name;
  const filepath = event.Records[0].s3.object.key;

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByBucket(bucketName, context);

    if (filepath.startsWith("records/")) {
      //special case, uploaded record from WCS
      //r_d25fe06e57424087a75cea54087b_533_1632783146633-1632783276885.mp4
      let filename = filepath.substring(filepath.lastIndexOf("/") + 1);
      let filebase = filename.substring(0, filename.lastIndexOf("."));
      let fileextension = filename.substring(filename.lastIndexOf(".") + 1);
      let filedata = filebase.split("_");
      //resolve activity id
      let activityid = filedata[2];
      //resolve event/stand id/company
      const activity = await activityUtil.getActivityFromDbOrThrowException(client, activityid);
      let entity;
      let entityid;
      let companyid;
      if (activity.stand) {
        const stand = await standUtil.getStandFromDbOrThrowException(client, activity.stand);
        entity = 'stand';
        entityid = stand.id;
        companyid = stand.company;
      }
      if (activity.event) {
        const event = await eventUtil.getEventFromDbOrThrowException(client, activity.event);
        entity = 'event';
        entityid = event.id;
        companyid = event.company;
      }

      //generate path to move
      //company/5/stands/8/records/r_....
      const stub = await binaryUtil.createUploadBinaryStub(client, entity, entityid, null,'video', 'record',
        filename, 'activity', activityid, []);
      const newPath = stub.url; //file will be renamed

      client.log.debug(`new file path: ${newPath}`);
      //move object
      let s3params = {
        Bucket: bucketName,
        CopySource: bucketName + '/' + filepath,
        Key: newPath
      };
      await s3.copyObject(s3params).promise();
      //deleting original object
      await s3.deleteObject({
        Bucket: bucketName,
        Key: filepath,
      }).promise();

      //update activity records with new url
      await activityUtil.updateActivityRecordsById(client, activityid, `s3://${newPath}`);
      //update upload status
      await binaryUtil.updateBinaryByKey(client, newPath, event.Records[0].s3.object.size);
    }
    else {
      const binary = await binaryUtil.updateBinaryByKey(client, event.Records[0].s3.object.key, event.Records[0].s3.object.size);

      if (binary == null) {
        throw new exceptionUtil.ApiException(404, 'Related binary not found');
      }

      //statistics
      if (binary['category'] === 'binary') {
        event['entity'] = binary['stand'] ? 'stand' : 'event';
        event['entity_id'] = binary['stand'] || binary['event'];
        event['activity_type'] = 'document_add';
        event['binary'] = {};
        event['binary']['id'] = binary['id'];
        event['bucket'] = event.Records[0].s3.bucket.name;
      }

      //tag with confirmed=yes
      //tag branding with public=yes
      const tags = {TagSet: []};
      tags['TagSet'].push({
        Key: "confirmed",
        Value: "yes"
      });

      if (binary['category'] === 'branding' || binary['category'] === 'news' || binary['category'] === 'sponsor') {
        tags['TagSet'].push({
          Key: "public",
          Value: "yes"
        });
      }

      const params = {
        Bucket: event.Records[0].s3.bucket.name,
        Key: event.Records[0].s3.object.key,
        Tagging: tags
      };

      await s3.putObjectTagging(params).promise();

      const getParams = {
        Bucket: event.Records[0].s3.bucket.name,
        Key: event.Records[0].s3.object.key
      };
      const data = await s3.getObject(getParams).promise();
      client.log.debug('now object status ', data);
    }
    return util.handle200(event, 'Successfully updated');
  } catch (err) {
    return util.handleError(event, err);
  } finally {
    util.handleFinally(event, client);
  }
};
