/**
 * @description Create resized image if the size is in dictionary.
 * called from API using lambda proxy
<pre>
{
    "resource": "/resizeimage/{proxy+}",
    "path": "/resizeimage/branding/company/1/events/9/f-172360d4c3b-f905d0f3ca421.560x315.jpg",
    "httpMethod": "GET",
    "headers": {
        "Accept": "*\/*",
        "Accept-Encoding": "gzip, deflate",
        "CloudFront-Forwarded-Proto": "https",
        "CloudFront-Is-Desktop-Viewer": "true",
        "CloudFront-Is-Mobile-Viewer": "false",
        "CloudFront-Is-SmartTV-Viewer": "false",
        "CloudFront-Is-Tablet-Viewer": "false",
        "CloudFront-Viewer-Country": "DE",
        "Host": "apidev.enter_your.domain",
        "User-Agent": "Slack-ImgProxy (+https://api.slack.com/robots)",
        "Via": "1.1 71b147cd3102755b55ba8b6fd34e3f4a.cloudfront.net (CloudFront)",
        "X-Amz-Cf-Id": "CDCfc1riwHgmfQ3ss4tEQ5_0ikC9dVbNk0Lg897mK1zSexmOyVW1Hg==",
        "X-Amzn-Trace-Id": "Root=1-5ef70de8-06989d237242b3cfc2fe4c4a",
        "X-Forwarded-For": "3.125.9.158, 70.132.34.148",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https"
    },
    "multiValueHeaders": {
...
    },
    "queryStringParameters": null,
    "multiValueQueryStringParameters": null,
    "pathParameters": {
        "proxy": "branding/company/1/events/9/f-172360d4c3b-f905d0f3ca421.560x315.jpg"
    },
    "stageVariables": null,
    "requestContext": {
        "resourceId": "5cnbtj",
        "resourcePath": "/resizeimage/{proxy+}",
        "httpMethod": "GET",
        "extendedRequestId": "Ox8cZEbHliAFrdQ=",
        "requestTime": "27/Jun/2020:09:14:16 +0000",
        "path": "/resizeimage/branding/company/1/events/9/f-172360d4c3b-f905d0f3ca421.560x315.jpg",
        "accountId": "enter_your_aws_account",
        "protocol": "HTTP/1.1",
        "stage": "LATEST",
        "domainPrefix": "apidev",
        "requestTimeEpoch": 1593249256817,
        "requestId": "c7a38086-78ca-4d59-998e-06b5aed7526c",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "sourceIp": "3.125.9.158",
            "principalOrgId": null,
            "accessKey": null,
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "Slack-ImgProxy (+https://api.slack.com/robots)",
            "user": null
        },
        "domainName": "apidev.enter_your.domain",
        "apiId": "40t82hy92m"
    },
    "body": null,
    "isBase64Encoded": false
}
</pre>
 * @class resizeImage
 */
const AWS = require('aws-sdk');
const dictionaryUtils = require('./model/dictionary');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');

const s3 = new AWS.S3();
const lambda = new AWS.Lambda({
  region: process.env.AWS_REGION
});

// connection details inherited from environment
let pool;

/**
 * stub. returns true
 * @param {Object} params
 * @method validateParams
 * @return {Boolean} true
 */
function validateParams(params) {
  return true;
}

/**
 * @method handler
 * @async
 * @param {Object} event with proxy lambda event
 * @param {Object} context lambda context
 * @return {Object} if all good - 301 to new resized file. Otherwise error with description in body
 */
exports.handler = async function (event, context) {
  util.handleStart(event, 'ImageResize');

  const apiDomain = event['headers']['Host'];
  let binaryDomain = await poolUtil.getBinaryDomainFromApiDomain(apiDomain);
  let env = await poolUtil.getEnvironmentFromApiDomain(apiDomain);

  event["origin"] = apiDomain;

  let client = util.emptyClient;
  try {
    if (!validateParams(event)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByApiDomain(apiDomain, context);

    //1. Get filename
    const fileName = event.path.substring(event.path.lastIndexOf("/") + 1);
    console.log('fileName: ' + fileName);
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot < 0) {
      throw new exceptionUtil.ApiException(405, 'Invalid filename supplied');
    }

    const preLastDot = fileName.lastIndexOf('.', lastDot - 1);
    if (preLastDot < 0) {
      throw new exceptionUtil.ApiException(405, 'Invalid dimensions supplied');
    }

    let dimensions = fileName.substring(preLastDot + 1, lastDot);
    if (!dimensions) {
      throw new exceptionUtil.ApiException(405, 'Invalid dimensions format');
    }

    const allowedConversion = await dictionaryUtils.dimensionExists(client, dimensions);
    if (!allowedConversion) {
      throw new exceptionUtil.ApiException(405, 'Given conversion is not allowed');
    }

    const originalFileName = event.path.substring(event.path.lastIndexOf("/") + 1, event.path.indexOf(dimensions) - 1) +
        event.path.substring(event.path.lastIndexOf("."));
    dimensions = dimensions.split('x');

    const filePrefix = event.path.substring(event.path.indexOf("/", 1) + 1, event.path.lastIndexOf("/") + 1);

    console.log('bucket: ' + client.uploadsBucket);
    console.log('originalFileName: ' + originalFileName);
    console.log('filePrefix: ' + filePrefix);
    console.log('width: ' + dimensions[0]);
    console.log('height: ' + dimensions[1]);
    console.log('env: ' + env);

    const lambdaParams = {
      FunctionName: 'resizeImageImpl-' + env,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({"file": {"bucket": client.uploadsBucket, "fileName": originalFileName, "prefix": filePrefix}, "width": dimensions[0], "height": dimensions[1]})
    };
    const lambdaResponse = await lambda.invoke(lambdaParams).promise();

    if (lambdaResponse['StatusCode'] === 200) {
      console.log('Success');
    } else {
      const url = `https://openexpo-statics-${env}.s3.eu-central-1.amazonaws.com/img/resizeFailed.gif`;
      console.log('Resize failed returning stub image');
      return util.handle301(event, url);
    }

    const tags = {TagSet: []};
    tags['TagSet'].push({
      Key: "public",
      Value: "yes"
    });

    const params = {
      Bucket: client.uploadsBucket,
      Key: filePrefix + fileName,
      Tagging: tags
    };

    await s3.putObjectTagging(params).promise();

    const url = `https://${binaryDomain}/${filePrefix}${fileName}`; //- Cloudfront caches redirects currently, so we end up with TOO_MANY_REDIRECTS
//    const url = `http://${client.uploadsBucket}.s3-website.eu-central-1.amazonaws.com/${filePrefix}${fileName}`;
    console.log('url: ' + url);

    return util.handle301(event, url);
  } catch (err) {
    return util.handleError(event, err);
  } finally {
    util.handleFinally(event, client);
  }
};
