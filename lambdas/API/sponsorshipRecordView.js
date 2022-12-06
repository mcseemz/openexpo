/**
 * @description Record sponsored view for a current user.
 *  checks for active event and tier switch
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const personUtil = require('./model/person');
const validator = require('./model/validation');
const ticketUtil = require('./model/ticket');
const sponsorshipUtil = require('./model/sponsorship');

// connection details inherited from environment
let pool;

console.log("PostgreSQL POST Function");

function validateParams(params) {
  return !!params['relationId'] && validator.isNumber(params['relationId']) &&
      !!params['placeId'] && validator.isValidNonEmptyString(params['placeId']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventPageRecordView');
  const env = await poolUtil.getEnvironmentFromOrigin(data['origin']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const relation = await relationUtil.getOrThrowException(client, data['relationId']);
    const user = await personUtil.getPersonFromDB(client, data['context']['email']);

    await sponsorshipUtil.isValidForActions(client, relation, data['placeId']);
    //checking that user is registered
    const ticket = await ticketUtil.getForUserAndEventOrThrowException(client, user['id'], relation['subject_ref_id']);

    if (data['placeId'] === 'banner') {
      await sponsorshipUtil.updateTicketWithBannerView(client, ticket, relation)
    }

    const tags = {
      place_id: data['placeId'],
      env: env,
      action_type: 'view',
      sponsor_id: relation['object_ref_id'],
      sponsor_type: relation['object_ref'],
      event_id: relation['subject_ref'] === 'event' ? relation['subject_ref_id'] : -1,
      user_id: user.id
    };

    data['isSponsorStat'] = true;
    data['batchItem'] = {
      measurement: 'sponsor_data',
      tags: tags,
      fields: {
        user_id_field: user.id
      },
      timestamp: new Date().valueOf()
    };

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
