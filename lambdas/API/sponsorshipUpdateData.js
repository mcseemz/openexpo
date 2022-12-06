/**
 * @description Update sponsorship data.
 *  incoming relation data is slightly filtered for parametes, no deep validation
 *  then inserted into db
 */
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const relationUtil = require('./model/relation');
const personUtil = require('./model/person');
const sponsorshipUtil = require('./model/sponsorship');
const permissionUtil = require('./model/permissions');
const eventUtil = require('./model/event');

function validateParams(params) {
  return true;
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaSponsorshipUpdateData');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    const relation = await relationUtil.getOrThrowException(client, data['relationId']);
    const event = await eventUtil.getEventFromDbOrThrowException(client, relation['subject_ref_id']);

    await permissionUtil.assertCanManageEventSponsorship(client, user['id'], event['id']);

    //initial validity check
    let validPlaceIds = sponsorshipUtil.getValidEntries();
    for (const prop in data['relation']) {
      if (validPlaceIds.includes(prop)) {
        relation['parameter'][prop] = data['relation'][prop];
        if (prop === sponsorshipUtil.LOTTERY && typeof relation['parameter'][prop]['active'] === 'undefined' ) {
          relation['parameter'][prop]['active'] = false;
        }
        if (prop === sponsorshipUtil.SURVEY && typeof relation['parameter'][prop]['active'] === 'undefined' ) {
          relation['parameter'][prop]['active'] = false;
        }
      }
    }

    const updatedRelation = await relationUtil.updateParameter(client, relation['id'], relation['parameter']);

    return util.handle200(data, updatedRelation);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
