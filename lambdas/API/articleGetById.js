/**
 * @description Get articles by id.
 * @class articleGetById 
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const util = require('./model/util');
const newsUtil = require('./model/news');
const permissionUtil = require('./model/permissions');
const personUtil = require('./model/person');
const binaryUtil = require('./model/binary');

function validateParams(params) {
  return !!params['articleId'] && validator.isNumber(params['articleId']) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaArticleGetById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    //6. transactioned business logic
    const article = await newsUtil.getArticleById(client, data['articleId']);
    const user = data['open'] ? null : (await personUtil.getPersonFromDbOrThrowException(client, data['context']['email'])) ;

    if (data['forEditing'] || article['status'] !== 'published' || !validator.isTodayOrInPast(article['published'])) {
      if (data['open']) {
        throw new exceptionUtil.ApiException(403, 'You are not allowed to view this content');
      }

      if (article['company']) {
        await permissionUtil.assertCanManageCompanyNews(client, article['company'], user['id']);
      } else if (article['event']) {
        await permissionUtil.assertCanManageEventNews(client, user['id'], article['event']);
      } else {
        await permissionUtil.assertCanManageStandNews(client, user['id'], article['stand']);
      }
    }

    //8. response preparation
    if (!data['forEditing']) {
      delete article['strings']['description_short'];
      delete article['status'];
      if (article['event']) {
        if (!(await permissionUtil.assertUserHasTicketWithAccessToContent(client, user?user['id']:null, article['event'], null, article['tags']))) {
          throw new exceptionUtil.ApiException(403, 'You are not allowed to view this content');  
        }
      } else if (article['stand']){
        if (!(await permissionUtil.assertUserHasTicketWithAccessToContent(client, user?user['id']:null, null, article['stand'], article['tags']))) {
          throw new exceptionUtil.ApiException(403, 'You are not allowed to view this content');  
        }
      } 
    }

    article['branding'] = await binaryUtil.getBrandingMaterialsForArticle(client, article['id'], data['language']);

    return util.handle200(data, article);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
