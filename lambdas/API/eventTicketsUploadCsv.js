/**
 * @description upload tickets to the system
 * @class eventTicketsUploadCsv
 */

const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const personUtil = require('./model/person');
const exceptionUtil = require('./model/exception');
const eventUtil = require('./model/event');
const util = require('./model/util');
const permissionUtil = require('./model/permissions');
const pricingUtil = require('./model/eventPricing');
const stringUtils = require("./model/strings");
const ticketUtil = require('./model/ticket');
const emailUtil = require('./model/email');

const AWS = require('aws-sdk');
// Initialize CognitoIdentityServiceProvider.
const cognito = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18",
});

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']) &&
    !!params['text'];
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventTicketsUploadCsv', 'pricing_change', 'event', data['eventId']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    let userpool = await poolUtil.getUserPoolFromOrigin(data['origin'])
    client.log.debug(`userpool: ${userpool}`);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);

    await permissionUtil.assertCanManageEventTickets(client, user['id'], event['id']);

    const pricingList = await pricingUtil.getAllPricingForEvent(client, data['eventId']);
    if (pricingList.length > 0) {
      const pricingIds = pricingList.map(e => e['id']);
      let additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'pricing', pricingIds, data['language']);

      if (additionalStrings != null) {
        pricingList.forEach((pr) => {
          pr['strings'] = additionalStrings.filter(s => s['ref_id'] === pr['id']);
          pr['strings'].forEach(s => delete s['ref_id']);
          pr['name'] = pr['strings'].filter(s => s['category'] === 'name')[0]['value'];
        });
      }
    }

    if (!data['text'].trim()) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, 'File is empty');
    }

    let lines = data['text'].split('\n');

    let ticketcnt = 0;
    let errorcnt = 0;
    let errortxt = "";

    let count = 0;
    while (true) {
      if (errorcnt > 20) break;

      count++;

      let line = lines.shift();
      if (!line) break;

      let fields = line.split(',');
      if (count === 1 && fields[0].startsWith('"')) {
        count++;
        continue; //it was header
      }

      //Customer email
      let email = fields[0].trim();
      if (!email || !validator.isValidEmail(email)) {
        errorcnt++;
        errortxt += "for line " + count + " missing email\n";
        continue;
      }
      //Price name
      let pricename = fields[1].trim();
      if (!pricename) {
        errorcnt++;
        errortxt += "for line " + count + " missing price name\n";
        continue;
      }
      //Ticket price
      let priceamt = fields[2].trim();
      if (!validator.isNumber(priceamt)) {
        errorcnt++;
        errortxt += "for line " + count + " invalid price amount\n";
        continue;
      }
      //Customer name
      let customername = fields[3].trim();
      if (customername && !validator.isValidNonEmptyString(customername)) {
        errorcnt++;
        errortxt += "for line " + count + " invalid user name\n";
        continue;
      }
      //Purchase datetime
      let optime = fields[4].trim();
      if (optime && !validator.isValidDateTime(optime)) {
        errorcnt++;
        errortxt += "for line " + count + " invalid operation datetime value. Should be in format 2022-12-25T21:48:44\n";
        continue;
      }

      let customer = await personUtil.getPersonFromDB(client, email, false);
      if (!customer && !customername) {
        errorcnt++;
        errortxt += "for line " + count + " new customer does not have a name\n";
        continue;
      }

      let priceTarget = undefined;
      for (let pricing of pricingList) {
        if (pricing['name'] === pricename) {
          priceTarget = pricing;
        }
      }
      if (!priceTarget) {
        errorcnt++;
        errortxt += "for line " + count + " invalid pricing name found. Should match one of ticket pricings in the event\n";
        continue;
      }

      //most of checks done, creating customer in the db
      if (!customer) {
        customer = await personUtil.createUserInDb(client, {
          email: email,
          name: customername.split(" ")[0].trim(),
          surname: customername.indexOf(" ")>=0
            ? customername.substring(customername.indexOf(" ")).trim()
            : ""
        });
        //create user in cognito
        await cognitoCreateUser(userpool, email);
        //send an email
      }
      //check if customer already has active ticket with this pricing
      if (customer) {
        let ticketExists = await ticketUtil.checkTicketExists(client, event['id'], customer['id'], ['payed', 'banned']);
        if (ticketExists) {
          errortxt += "Notice: for email " + email + " active ticket found. Ignoring\n";
        }
        else {
          let ticket = await ticketUtil.createTicketInDb(client, {
            event: event['id'],
            buyer:customer['id'],
            pricing: priceTarget['id'],
            payment_status: 'payed',
            parameter: {
              expiration: priceTarget.parameter.expiration
                ? util.formatDateYMD(ticketUtil.calculateExpirationDate(new Date(), priceTarget.parameter.expiration ))
                : null
            }
          })
          if (ticket) {
            ticketcnt++;
            //welcome email
            await emailUtil.sendEventRegistrationEmail(client, event, priceTarget, data['origin'], email, data['language'])
          }
        }
      }
    }

    if (errorcnt > 0) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "There are errors:\n" + errortxt);
    }

    errortxt += "Lines processed: " + count + "\n";
    errortxt += "Errors found: " + errorcnt + "\n";
    errortxt += "Tickets created: " + ticketcnt + "\n";

    return util.handle200(data, errortxt);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};

async function cognitoCreateUser(userpool, email) {
  const cognitoParams = {
    UserPoolId: userpool,
    Username: email,
    UserAttributes: [{
      Name: "email",
      Value: email,
    },
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
    TemporaryPassword: Math.random().toString(36).substring(2, 10),
  };

  let response = await cognito.adminCreateUser(cognitoParams).promise();
  console.log(JSON.stringify(response, null, 2));
  return response;
}
