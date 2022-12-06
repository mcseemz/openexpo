/**
 * @description Get pre-signed Url for downloading report file.
 */

const AWS = require('aws-sdk');
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const permissionUtil = require('./model/permissions');
const sponsorshipUtil = require('./model/sponsorship');

const s3 = new AWS.S3({signatureVersion: 'v4'});

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
    const event = await eventUtil.getEventFromDbOrThrowException(client, parts[3]);
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    let customerObj = new util.ObjectRef(user['company'] ? 'company' : 'user', user['company'] || user['id']);
    const relation = await sponsorshipUtil.sponsorshipGet(client, event['id'], customerObj);

    if (relation && user['company']) {
      await permissionUtil.assertCanManageCompanySponsorship(client, user['company'], user['id']);
    } else if (!relation) {
      await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);
    }

    //6. transactioned business logic
    let params = {
      Bucket: client.uploadsBucket,
      Prefix: data['path']
    };
    const file = await s3.listObjectsV2(params).promise();

    console.log('file', file);
    if (!file['KeyCount']) {
      throw new exceptionUtil.ApiException(404, 'File not found');
    }

    params = {
      Bucket: client.uploadsBucket, Key: data['path'], Expires: signedUrlExpireSeconds
    };

    //8. response preparation
    const url = s3.getSignedUrl('getObject', params);
    console.log("Generated signed url:", url);

    return util.handle200(data, {url: url});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
