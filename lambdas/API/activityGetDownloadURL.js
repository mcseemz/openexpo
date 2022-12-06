/**
 * @description Get pre-signed Url for downloading report file.
 * @class activityGetDownloadURL
 */

const AWS = require('aws-sdk');
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');

const s3 = new AWS.S3({signatureVersion: 'v4'});

let llog = util.log;

const signedUrlExpireSeconds = 60 * 60;

function validateParams(params) {
  return !!params['path'] && validator.isValidNonEmptyString(params['path']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaReportGetDownloadURL');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const parts = (data['path'].startsWith('/'))
        ? data['path'].substring(1).split('/')
        : data['path'].split('/');

    // company/5/events/107/records/r_d25fe06e57424087a75cea54087b_533_3841943057818-3841943066346.mp4
    const entity = parts[3]; //events or stands
    const entityid = parts[4]; //events or stands
    const codeword = parts[5]; //events or stands
    const filename = parts[6]; //events or stands


    if (!validator.isNumber(entityid) || codeword !== 'records') {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let eventid;
    //visibility check
    if (entity === 'events') {
      const event = await eventUtil.getEventFromDbOrThrowException(client, entityid);
      eventid = event.id;
    }
    else if (entity === 'stands') {
      const stand = await standUtil.getStandFromDbOrThrowException(client, entityid);
      eventid = stand.event;
    }
    else {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    if (!((await eventUtil.checkCanUserViewEvent(client, eventid, user.id)).letmein)) {
      throw new exceptionUtil.ApiException(403, 'User not authorized');
    }

    //todo tag match between ticket and activity?

    //6. transactioned business logic
    let params = {
      Bucket: client.uploadsBucket,
      Prefix: data['path']
    };
    const file = await s3.listObjectsV2(params).promise();

    llog.debug('file: ', file);
    if (!file['KeyCount']) {
      throw new exceptionUtil.ApiException(404, 'File not found');
    }

    params = {
      Bucket: client.uploadsBucket, Key: data['path'], Expires: signedUrlExpireSeconds
    };

    //8. response preparation
    const url = s3.getSignedUrl('getObject', params);
    llog.debug(`Generated signed url: ${url}`);

    return util.handle200(data, {url: url});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
