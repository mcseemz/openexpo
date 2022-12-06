/**
 * @description Update existing article.
 * @class articleUpdateById  
 */
const AWS = require('aws-sdk');
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const newsUtil = require('./model/news');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');
const stringUtils = require('./model/strings');
const binaryUtil = require('./model/binary');

let llog = util.log;

function validateParams(params) {
  return !!params['id'] && !!params['images'] && !!params['strings'] &&
      params['strings'].some(s => s['category'] === 'name' && validator.isValidNonEmptyString(s['value'])) &&
      params['strings'].some(s => s['category'] === 'description_long' && validator.isValidNonEmptyLongString(s['value'])) &&
      (!params['event'] || validator.isNumber(params['event'])) &&
      (!params['stand'] || validator.isNumber(params['stand'])) &&
      (!params['company'] || validator.isNumber(params['company'])) &&
      !!(!!params['event'] ^ !!params['stand'] ^ !!params['company']) &&
      (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaArticleUpdateById');

  data['article']['id'] = data['articleId'];

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
    const oldArticle = await newsUtil.getArticleById(client, data['article']['id']);

    //images to delete
    const imagesToDelete = oldArticle['images'].filter(i => !data['article']['images'].includes(i));
    llog.debug('imagesToDelete: ', imagesToDelete);
    for (let i in imagesToDelete) {
      try {
        const material = await binaryUtil.getMaterialByUrlOrThrowException(client, imagesToDelete[i]);
        await binaryUtil.deleteMaterialOrchestrated(client, material, client.uploadsBucket);
      } catch (err) {
        if (err['errorCode'] !== 404) {
          throw new err;
        }
      }
    }

    const article = await newsUtil.updateArticle(client, data['article']);

    const stringsToUpdate = data['article']['strings'].map(s => {
      s['ref'] = 'news'
      s['ref_id'] = article['id'];
      s['language'] = data['language'];
      return s;
    });

    article['strings'] = stringsToUpdate ? await stringUtils.updateStringsInDB(client, stringsToUpdate) : [];
    article['branding'] = await binaryUtil.getBrandingMaterialsForArticle(client, article['id'], data['language']);

    if (oldArticle['status'] !== 'published' && article['status'] === 'published') {
      const entity = article['event'] ? 'event' : (article['stand'] ? 'stand' : '');
      const entityId = article['event'] ? article['event'] : (article['stand'] ? article['stand'] : '');
      
      data['activity_type'] = 'news_add';
      data["entity"] = entity || '';
      data["entity_id"] = entityId || '';
    }

    return util.handle200(data, article);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
