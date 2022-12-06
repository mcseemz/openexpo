/**
 * @description Record sponsored action for a current user.
 *  updates relation with new stats depending on placeid
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const personUtil = require('./model/person');
const validator = require('./model/validation');
const ticketUtil = require('./model/ticket');
const sponsorshipUtil = require('./model/sponsorship');

function validateParams(params) {
  return !!params['relationId'] && validator.isNumber(params['relationId']) &&
      !!params['placeId'] && validator.isValidNonEmptyString(params['placeId']) &&
      (!params['language'] || validator.isValidLanguage(params['language'])) &&
    params['data']
    ;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaSponsorshipRecordAction');
  const env = await poolUtil.getEnvironmentFromOrigin(data['origin']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const relation = await relationUtil.getOrThrowException(client, data['relationId']);

    //validations
    await sponsorshipUtil.isValidForActions(client, relation, data['placeId']);
    //checking that user is registered
    const ticket = await ticketUtil.getForUserAndEventOrThrowException(client, user['id'], relation['subject_ref_id']);

    const placeId = data['placeId'];
    let action_type = 'click';

    if (placeId === 'banner') { //view log handled by sponsorshipRecordView, click by sponsorshipGetActionData
/*      await sponsorshipUtil.updateTicketWithBannerView(client, ticket, relation)
      const tags = {
        place_id: data['placeId'],
        env: env,
        action_type: 'click',
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
 */
    }
    else if (placeId === 'lottery') {
    //update last roll time
    //update prize info
      await sponsorshipUtil.updateTicketWithLotteryRoll(client, ticket, relation, data['data']['prizeId'])
      if (data['data']['prizeId']) {
        action_type = 'win';
      }
    }
    else if (placeId === 'survey') {
    //update fill time
    //update answers
      await sponsorshipUtil.updateTicketWithSurveyResult(client, ticket, relation, data['data']['questions']);
    }

    //track action
    const tags = {
      place_id: data['placeId'],
      env: env,
      action_type: action_type,
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
