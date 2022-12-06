/**
 * @description Lambda for getting event reports generation. </br>
 * - all event tickets in s3: /company/12/events/49/report/event-49.ticket-list.json
 *
 * @class EBTimestreamSponsorReport
 */
// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Set region
AWS.config.update({region: process.env.AWS_REGION});

const s3 = new AWS.S3({signatureVersion: 'v4'});

const util = require('./model/util');
const poolUtil = require('./model/pool');
const eventUtils = require('./model/event');

const { promisify } = require('util');
const Cursor = require('pg-cursor');
Cursor.prototype.readAsync = promisify(Cursor.prototype.read);

const log = util.log;

 /**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} event line from containing base64-ed zipped line from logs containing json with stats parameters
 * @param {Object} context of invocation
 */
exports.handler = async function (event, context) {
  util.handleStart(event, "lambdaEventReport");

  const env = event['env'];

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByEnvironment(env, context);

    //get list of active events

    const events = await eventUtils.getActiveEvents(client);
    //for each event
    console.log('event list:', events);

    for (const event of events) {
      console.log('active event: ' + JSON.stringify(event));
      //bucket path
      const filePrefix = `company/${event['company']}/events/${event['id']}/report/`;

      try {

        let resultset = [];
        const text = `SELECT p.email, concat(p.name, ' ', p.surname), p.company,
            pr.access_price, pr.access_currency, ticket.payment_status, ticket.date_action
            FROM ticket
                left join person p on ticket.buyer = p.id
                left join event_pricing pr on ticket.pricing = pr.id
            WHERE ticket.event = $1 ORDER BY ticket.date_action`;
        const values = [event['id']];
        const cursor = client.query(new Cursor(text, values, {rowMode:'array'}));

        let rows = await cursor.readAsync(100)
        while (rows.length) {
          resultset.push(rows);
          rows = await cursor.readAsync(100)
        }

        //file s3://tex-binary-dev/company/12/events/49/report/event-49.ticket-list.json
        const fileName = `event-${event['id']}.ticket-list.json`;

        console.log(`S3 filename: ${filePrefix + fileName}`);

        const params = {
          Body: JSON.stringify(resultset),
          Bucket: client.uploadsBucket,
          Key: `${filePrefix + fileName}`
        };
        await s3.putObject(params).promise();
      } catch (err) {
        log.error(err);
      }
    }
    console.log("closing event report");
    return util.handle200(event,{ message: "event received" })
  } catch (err) {
    log.error(err);
  } finally {
    util.handleFinally(event, client);
  }
};
