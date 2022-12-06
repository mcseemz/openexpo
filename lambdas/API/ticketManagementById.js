/**
 * @description Ban/Unban ticket, and other management operations.
 * banned, refunded, cancelled ticket cannot operate on event
 *
 * stuff permissions check
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const permissionUtil = require('./model/permissions');
const ticketUtil = require('./model/ticket');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['ticketId'] && validator.isNumber(params['ticketId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaTicketManagementById');

  if (!validateParams(data)) {
    throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
  }

  let client = util.emptyClient;
  try {

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    const ticket = await ticketUtil.getByIdOrThrowException(client, data['ticketId']);

    //check that user can do management on ticket
    await permissionUtil.assertCanManageEventTickets(client, user['id'], ticket['event']);

    const operation = data['operation'];
    if (operation === 'ban' && ticket['payment_status'] === ticketUtil.STATUS_PAYED) {
      await ticketUtil.updatePaymentStatus(client, ticket['id'], ticketUtil.STATUS_BANNED);
    } else
    if (operation === 'unban' && ticket['payment_status'] === ticketUtil.STATUS_BANNED) {
      await ticketUtil.updatePaymentStatus(client, ticket['id'], ticketUtil.STATUS_PAYED);
    } else
    if (operation === 'cancel' && ticket['payment_status'] === ticketUtil.STATUS_NOT_PAYED) {
      await ticketUtil.updatePaymentStatus(client, ticket['id'], ticketUtil.STATUS_CANCELLED);
    } else
    if (operation === 'refund' && ticket['payment_status'] === ticketUtil.STATUS_PAYED) {
      await permissionUtil.assertCanManageEventMoney(client, user['id'], ticket['event']);
      await ticketUtil.updatePaymentStatus(client, ticket['id'], ticketUtil.STATUS_REFUNDED);
    } else
    if (operation === 'confirm' && ticket['payment_status'] === ticketUtil.STATUS_NOT_PAYED) {
      await permissionUtil.assertCanManageEventMoney(client, user['id'], ticket['event']);
      await ticketUtil.updatePaymentStatus(client, ticket['id'], ticketUtil.STATUS_PAYED);
    }    
    else {
      throw new exceptionUtil.ApiException(405, 'Invalid ticket status and operation combination');
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
