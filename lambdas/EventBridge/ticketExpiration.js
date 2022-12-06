/**
 * @description Lambda for expiring tickets with established expiration date. </br>
 * - all event tickets in s3: /company/12/events/49/report/event-49.ticket-list.json
 *
 * @class ticketExpiration
 */

const util = require('./model/util');
const poolUtil = require('./model/pool');
const eventUtils = require('./model/event');
const ticketUtil = require('./model/ticket');
const personUtil = require('./model/person');
const emailUtil = require('./model/email');

 /**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} event line from containing base64-ed zipped line from logs containing json with stats parameters
 * @param {Object} context of invocation
 */
exports.handler = async function (event, context) {
  util.handleStart(event, "lambdaTicketExpiration");

  const env = event['env'];

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByEnvironment(env, context);

    let origin = poolUtil.getOriginFromEnvironment(env);

    //get list of active tickets
    let tickets = await ticketUtil.getExpiredTickets(client);

    client.log.info(`found ${tickets.log} tickets to expire`);

    for (const ticket of tickets) {
      //get event
      let event = await eventUtils.getEventFromDb(client, ticket['event']);
      if (!event) {
        client.log.error(`event ${ticket['event']} not found`);
        continue;
      }
      //check if event is still active
      if (event['status'] !== 'active') {
        continue;
      }

      //set ticket as archived
      await ticketUtil.updatePaymentStatus(client, ticket['id'], ticketUtil.STATUS_ARCHIVED);
      //get user email
      let person = await personUtil.getPersonById(client, ticket['buyer']);
      if (!person) {
        client.log.error(`person ${ticket['buyer']} not found for event ${ticket['event']}`);
        continue;
      }
      if (!person['email']) {
        client.log.error(`person email ${ticket['buyer']} not found for event ${ticket['event']}`, person);
        continue;
      }
      //send email
      await emailUtil.sendTicketExpiredEmail(client, event, origin, person['email']);
    }

    client.log.debug("ticket processing done");
    return util.handle200(event,{ message: "ticket processing done" })
  } catch (err) {
    log.error(err);
  } finally {
    util.handleFinally(event, client);
  }
};
