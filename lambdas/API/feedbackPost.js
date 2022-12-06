/**
 * @description Send event for moderation before publishing.
 * @class feedbackPost
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const externalParamsUtil = require('./model/externalParams');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
var ses = new AWS.SES({ apiVersion: '2010-12-01' });

// connection details inherited from environment


/**
* checks for email (required), name (required), tel, eventid, standid
* @param {Object} incoming params
* @method validateParams
* @return {Boolean} true if params are ok
*/
function validateParams(params) {
  return !!params['email'] && validator.isValidEmail(params['email'])
    && !!params['name'] && validator.isValidNonEmptyString(params['name'])
    && (!params['tel'] || validator.isValidNonEmptyString(params['tel']))
    && (!params['eventid'] || validator.isNumber(params['eventid']))
    && (!params['standid'] || validator.isNumber(params['standid']))
    ;
}

/**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} data object containing necessary information<br/>
 * - data['body'] object to be send <br />
 * Example:
 * <pre>
 *{
 *  "name": "Testter",
 *  "email": "pr-273@enter_your.domain"
 * }
 * </pre>
 * @param {Object} context of invocation
 * @return {Object} new meeting object.<br/>
 * Status:<br/>
 * 200 - ok<br/>
 * 502 - processing error
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaFeedbackPost');
  const shortDomain = data['origin'].substring(data['origin'].lastIndexOf('/') + 1);

  try {

      if (!validateParams(data.body)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    //TODO text XSS validation

    if (data.body.standid) {
      data.body.msg += `\n\nStand link: ${shortDomain}/stand/${data.body.standid}`;
    }
    else if (data.body.eventid) {
      data.body.msg += `\n\nEvent link: ${shortDomain}/event/${data.body.eventid}`;
    }

    let moderators = await externalParamsUtil.getModeratorsList(shortDomain);
    let sender = await externalParamsUtil.getSenderEmail(shortDomain);

    let messageText, messageSubject, messageTags;
    if (data.body.page === "contact") {
      messageText = `Request for demo:\nemail: ${data.body.email}\nname: ${data.body.name}\ntel: ${data.body.tel}\nmessage: ${data.body.msg}`;
      messageSubject = "New request for demo";
      messageTags = 'RequestDemo';
    } else {
      messageText = `Partnership request from:\nemail: ${data.body.email}\nname: ${data.body.name}`;
      messageSubject = "New partnership request";
      messageTags = 'RequestPartnership';
    }

    const params = {
      Destination: {
        ToAddresses: moderators
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: messageText
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: messageSubject
        }
      },
      Source: sender,
      ConfigurationSetName: "tex-dev",
      Tags: [
        {
          Name: 'email-general', /* required */
          Value: messageTags  /* required */
        }
      ]
    };

    data.messageId = await ses.sendEmail(params).promise();

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data);
  }
};
