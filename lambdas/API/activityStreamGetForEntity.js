/**
 * @description Lambda for getting activity stream for entity.
 * @class activityStreamGetForEntity  
 */

const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const streamUtil = require('./model/stream');
const streamPackedUtil = require('./model/streamPacked');
const activityUtil = require('./model/activity');
const pricingUtil = require('./model/eventPricing');
const binaryUtil = require('./model/binary');
const newsUtil = require('./model/news');
const stringUtil = require('./model/strings');

let llog = util.log;

function validateParams(params) {
  return !!params['entityType'] && validator.isValidActivityStreamEntityType(params['entityType']) &&
      !!params['entityId'] && validator.isNumber(params['entityId']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

/**
 * Main method. Depending on event parse parameters
 * @method GET
 * @param {Object} data object containing necessary information
 * @param {Object} context of invocation
 * @returns {Promise} Body contains array object that represents stream for the given activity<br/>
 * Status:<br/>
 * 200 - ok<br/>
 * 405 - invalid args<br/>
 * 502 - processing error
 */
exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaActivityStreamGetForEntity');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const packs = await streamPackedUtil.getPacksForEntity(client, data['entityType'], data['entityId'], data['expanded'] || true);

    const activityStream = [];
    const activityIds = [];

    for (const p of packs) {
      const res = {};
      switch (p['action']) {
        case streamUtil.STAND_ADD:
          res['type'] = 'stand';
          res['action'] = 'added';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = p['parameter'];
          break;
        case streamUtil.STAND_LEFT:
          res['type'] = 'stand';
          res['action'] = 'removed';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = p['parameter'];
          break;
        case streamUtil.NEWS_ADD:
          res['type'] = 'news';
          res['action'] = 'added';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = p['parameter'];
          const article = await newsUtil.getArticleById(client, p['parameter'][0]);
          res['status'] = article['status'];
          break;
        case streamUtil.ACTIVITY_ADD:
          res['type'] = 'activity';
          res['action'] = 'added';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = [await activityUtil.getSimpleActivityFromDb(client, p['parameter'][0])];
          activityIds.push(p['parameter'][0]);
          break;
        case streamUtil.ACTIVITY_START:
          res['type'] = 'activity';
          res['action'] = 'started';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = [await activityUtil.getSimpleActivityFromDb(client, p['parameter'][0])];
          activityIds.push(p['parameter'][0]);
          break;
        case streamUtil.PRICING_CHANGE:
          res['type'] = 'pricing';
          res['action'] = 'changed';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = await pricingUtil.getPricingForActivityStream(client, p['parameter']);
          break;
        case streamUtil.DOCUMENT_ADD:
          res['type'] = 'upload';
          res['action'] = 'added';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = await binaryUtil.getBinariesForActivityStream(client, p['parameter'], data['language']);
          break;
        case streamUtil.LOTTERY_START:
          res['type'] = 'lottery';
          res['action'] = 'start';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = p['parameter'];
          break;
        case streamUtil.SURVEY_START:
          res['type'] = 'survey';
          res['action'] = 'start';
          res['created'] = p['action_date'];
          res['quantity'] = p['parameter'].length;
          res['items'] = p['parameter'];
          break;
      }

      activityStream.push(res);
    }

    const strings = await stringUtil.getStringsForMultipleEntities(client, 'activity', activityIds, data['language']);
    for(let onestring of strings) { //we expect all of them have 'activity' type, so no need to check
      delete onestring.description_long;
      llog.debug('onestring, activityStream ', onestring,activityStream);
      let findString = activityStream.find(x => x['type'] === 'activity' && x['items'][0].id === onestring['ref_id']);
      llog.debug('findString ', findString);
      findString['strings'] = onestring;
    }

    return util.handle200(data, activityStream);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
