/**
 * @description Return action configuration depending on placeid
 *  banner,video,logo: Proxy sponsor urls redirect.
 *  lottery: current lottery status and data
 *  survey: current survey status and data
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const personUtil = require('./model/person');
const sponsorshipUtil = require('./model/sponsorship');
const ticketUtil = require('./model/ticket');

function validateParams(params) {
  return true;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaSponsorshipGetActionData');
  const env = await poolUtil.getEnvironmentFromOrigin(data['origin']);

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //6. transactioned business logic
    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const relation = await relationUtil.getOrThrowException(client, data['relationId']);

    //validations
    await sponsorshipUtil.isValidForActions(client, relation, data['placeId']);
    //checking that user is registered
    const ticket = await ticketUtil.getForUserAndEventOrThrowException(client, user['id'], relation['subject_ref_id']);

    const placeId = data['placeId'];

    let response = {};

    if (placeId === 'banner' ||
        placeId === 'video' ||
        placeId === 'logo') {
      const link = relation['parameter'][placeId + 'Url'];
      console.log(`placeId: ${placeId}, link: ${link}`);
      if (!link) {
        throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
      }

      const tags = {
        place_id: placeId,
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
          target_url: link,
          user_id_field: user.id
        },
        timestamp: new Date().valueOf()
      };

      return util.handle301(data, link);  //!!!
    }
    else if (placeId === 'lottery') {
      //return lottery configuration
      const lottery = relation['parameter']['lottery'];
      delete lottery['start'];
      lottery['enabled'] = true;
      const ticketpar = ticket['parameter'];
      if (ticketpar['sponsorship']) {
        for (let i in ticketpar['sponsorship']) { //looking for our relation
          if (ticketpar['sponsorship'][i]['relationId'] === relation['id']) {
            const ticketrel = ticketpar['sponsorship'][i];
            if (ticketrel['lottery']) {
              lottery['last'] = ticketrel['lottery']['last']; //last roll data
            }
            //check that lottery is enabled was not answered yet
            if (ticketrel['lottery'] && ticketrel['lottery']['prizeId'] !== null) {
              lottery['reason'] = 'won';
              lottery['enabled'] = false;
            }
          }
        }
      }

      let i = lottery['options'].length;
      while (i--) {
        if (lottery['options'][i]['winners'] >= lottery['options'][i]['amount']
          && lottery['options'][i]['amount'] >=0) { //dropping outsold items
          lottery['options'].splice(i, 1);
        } else {
          delete lottery['options'][i]['amount'];
          delete lottery['options'][i]['winners'];
        }
      }
      //adding sponsor info
      lottery['logo'] = relation['parameter']['logo']
      if (relation['object_ref'] === 'user') {
        lottery['sponsor'] = relation['userName'];
      } else
      if (relation['object_ref'] === 'company') {
        lottery['sponsor'] = relation['companyName'];
      }
      response = lottery;
    }
    else if (placeId === 'survey') {
      //return survey configuration
      const survey = relation['parameter']['survey'];
      delete survey['start'];
      survey['enabled'] = true;

      const ticketpar = ticket['parameter'];
      if (ticketpar['sponsorship']) {
        for (let i in ticketpar['sponsorship']) { //looking for our relation
          if (ticketpar['sponsorship'][i]['relationId'] === relation['id']) {
            const ticketrel = ticketpar['sponsorship'][i];
            //check that survey was not answered yet
            if (ticketrel['survey']) {
              survey['reason'] = 'processed';
              survey['last'] = ticketrel['survey']['last'];
              survey['enabled'] = false;
            }
          }
        }
      }

      //adding sponsor info
      survey['logo'] = relation['parameter']['logo']
      if (relation['object_ref'] === 'user') {
        survey['sponsor'] = relation['userName'];
      } else
      if (relation['object_ref'] === 'company') {
        survey['sponsor'] = relation['companyName'];
      }
      response = survey;
    }

    return util.handle200(data, response);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
