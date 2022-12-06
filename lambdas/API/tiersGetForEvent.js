/**
 * @description Get tiers for the given event.
 * called from: /event/{eventid}/visitor/tiers and /event/{eventid}/tiers
 * second form checks for permission and returns complete sponsor configurations
 * first return only sponsor ids
 */
const validator = require('./model/validation');
const eventUtil = require('./model/event');
const tierUtil = require('./model/tier');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const sponsorshipUtil = require('./model/sponsorship');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');

function validateParams(params) {
  return !!params['eventId'] && validator.isNumber(params['eventId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaTiersGetForEvent');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);
    client.debug=true;

    const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);
    let tiers = await tierUtil.getTiersForEvent(client, event['id'], data['language']);

    const tierIds = tiers.map(t => t['id']);
    const sponsors = await sponsorshipUtil.getRelationDataForTiers(client, data['eventId'], tierIds);

    if (data['visitor']) {
      tiers = tiers.filter(t => t['is_enabled']);

      tiers.forEach((t) => {
        t['sponsors'] = sponsors.filter(s => s['parameter']['tierId'] === t['id'])
          .map(x => {
            return {
              object_ref: x['object_ref'],
              object_ref_id: x['object_ref_id'],
              relation_id: x['id']
            }
          });
      });
    } else {
      const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
      await permissionUtil.assertCanManageEventSponsorship(client, user['id'],data['eventId'])

      tiers.forEach((t) => {
        t['sponsors'] = sponsors.filter(s => s['parameter']['tierId'] === t['id']);
      });
    }

    return util.handle200(data, tiers);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
