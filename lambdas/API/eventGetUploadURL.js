/**
 * @description Get pre-signed Url for downloading event attachments.
 */

const AWS = require('aws-sdk');
const validator = require('./model/validation');
const binaryUtil = require('./model/binary');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

const s3 = new AWS.S3({signatureVersion: 'v4'});

const signedUrlExpireSeconds = 60 * 60;

function validateParams(params) {
  return !!params['id'] && validator.isNumber(params['id']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventGetUploadURL');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //todo permission check for user can download materials
    const material = await binaryUtil.getMaterialByIdOrThrowException(client, data['id']);

    //TODO: Check if we need any of these ACL: 'bucket-owner-full-control', ContentType: 'text/csv'
    if (material['category'] === 'branding') { //branding can be downloaded without signing
      const domain = await poolUtil.getBinaryDomainFromOrigin(data['origin']);
      return util.handle200(data, {url: `https://${domain}/${material['url']}`});
    }
    //otherwise we have to sign the url to download file
    const params = {
      Bucket: client.uploadsBucket, Key: material['url'], Expires: signedUrlExpireSeconds
    };

    const url = s3.getSignedUrl('getObject', params);
    console.log("Generated signed url:", url);

    return util.handle200(data, {url: url});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
