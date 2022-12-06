/**
 * @description Delete article by id.
 * @class articleDeleteById
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

function validateParams(params) {
  return !!params['articleId'] && validator.isNumber(params['articleId']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaArticleDeleteById');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    const article = await newsUtil.getArticleById(client, data['articleId']);
    if (article['company']) {
      await permissionUtil.assertCanManageCompanyNews(client, article['company'], user['id']);
    } else if (article['event']) {
      await permissionUtil.assertCanManageEventNews(client, user['id'], article['event']);
    } else {
      await permissionUtil.assertCanManageStandNews(client, user['id'], article['stand']);
    }

    //delete strings
    await stringUtils.deleteStringsRelatedToEntityIfExists(client, article['id'], 'news');
    //delete images
    if (article['images']) {
      for (let i in article['images']) {
        try {
          const material = await binaryUtil.getMaterialByUrlOrThrowException(client, article['images'][i]);
          await binaryUtil.deleteMaterialOrchestrated(client, material, client.uploadsBucket)
        } catch (err) {
          if (err['errorCode'] !== 404) {
            throw new err;
          }
        }
      }
    }

    //delete branding
    await binaryUtil.deleteBinariesForRefEntity(client, 'news', 'news', article['id'], client.uploadsBucket);
    //delete article
    await newsUtil.deleteArticle(client, article['id']);

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
