/**
 * @description Create new article.
 * @class articleCreateNew 
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const newsUtil = require('./model/news');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');
const stringUtils = require('./model/strings');
const binaryUtil = require('./model/binary');
const eventUtil = require('./model/event');
const standUtil = require('./model/stand');
const streamUtil = require('./model/stream');

function validateParams(params) {
  return !params['id'] && !!params['images'] && !!params['strings'] &&
      params['strings'].some(s => s['category'] === 'name' && validator.isValidNonEmptyString(s['value'])) &&
      params['strings'].some(s => s['category'] === 'description_long' && validator.isValidNonEmptyLongString(s['value'])) &&
      (!params['event'] || validator.isNumber(params['event'])) &&
      (!params['stand'] || validator.isNumber(params['stand'])) &&
      (!params['company'] || validator.isNumber(params['company'])) &&
      !!(!!params['event'] ^ !!params['stand'] ^ !!params['company']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  const entity = data['article']['event'] ? 'event' : (data['article']['stand'] ? 'stand' : '');
  const entityId = data['article']['event'] ? data['article']['event'] : (data['article']['stand'] ? data['article']['stand'] : '');
  util.handleStart(data, 'lambdaArticleCreateNew', '', entity, entityId);

  let client = util.emptyClient;
  try {
    if (!validateParams(data['article'])) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //5. data permission checks/filtering
    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    if (!data['article']['language'] && !data['language']) {
      if (!user['language']) {
        throw new exceptionUtil.ApiException(405, 'Language is not specified and is not configured for user');
      }

      data['language'] = user['language'];
    }
    data['article']['editor'] = user['id'];
    data['language'] = data['article']['language'] || data['language'];

    if (data['article']['company']) {
      await permissionUtil.assertCanManageCompanyNews(client, data['article']['company'], user['id']);
    } else if (data['article']['event']) {
      await permissionUtil.assertCanManageEventNews(client, user['id'], data['article']['event']);
    } else {
      await permissionUtil.assertCanManageStandNews(client, user['id'], data['article']['stand']);
    }

    //6. transactioned business logic
    await binaryUtil.assertBinariesPublished(client, data['article']['images']);
    const article = await newsUtil.crateNew(client, data['article']);

    const stringsToCreate = data['article']['strings'].map(s => {
      s['ref'] = 'news'
      s['ref_id'] = article['id'];
      s['language'] = data['language'];
      return s;
    });

    article['strings'] = stringsToCreate ? await stringUtils.insertStringsIntoDB(client, stringsToCreate) : [];
    article['branding'] = [];

    if (article['status'] === 'published') {
      data['article'] = article;
      data['activity_type'] = streamUtil.NEWS_ADD;
    }

    return util.handle200(data, article);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
