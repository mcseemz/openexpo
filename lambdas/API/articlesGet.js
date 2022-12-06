/**
 * @description Get articles by criteria.
 * @class articlesGet
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
  return !!params['entityType'] && validator.isValidNewsType(params['entityType']) &&
    !!params['entityId'] && validator.isNumber(params['entityId']) &&
    (!params['status'] || validator.isValidNewsStatus(params['status'])) &&
    (!params['pageNum'] || validator.isNumber(params['pageNum'])) &&
    (!params['recordsPerPage'] || validator.isNumber(params['recordsPerPage'])) &&
    (!params['language'] || validator.isValidLanguage(params['language']));
}

async function checkPermissions(client, data) {
  if (data['open']) {
    throw new exceptionUtil.ApiException(403, 'You are not allowed to view this content');
  }
  const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
  
  switch (data['entityType']) {
    case 'company':
      await permissionUtil.assertCanManageCompanyNews(client, data['entityId'], user['id']);
      break;
    case 'event':
      await permissionUtil.assertCanManageEventNews(client, user['id'], data['entityId']);
      break;
    case 'stand':
      await permissionUtil.assertCanManageStandNews(client, user['id'], data['entityId']);
      break;
  }
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaArticlesGet');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    let articles;
    if (data['status'] && data['status'] !== 'published') {
      await checkPermissions(client, data);
    }

    let event, stand;
    switch (data['entityType']) {
      case 'company':
        articles = await newsUtil.getArticlesForCompany(client, data['entityId'], data['status'], data['pageNum'], data['recordsPerPage'], null, data['language']);
        break;
      case 'event':
        event = data['entityId']; 
        articles = await newsUtil.getArticlesForEvent(client, data['entityId'], data['status'], data['pageNum'], data['recordsPerPage'], null, data['language']);
        break;
      case 'stand':
        stand = data['entityId'];
        articles = await newsUtil.getArticlesForStand(client, data['entityId'], data['status'], data['pageNum'], data['recordsPerPage'], null, data['language']);
    }

    if (articles) {
      const articleIds = articles.map(e => e['id']);
      const allBranding = await binaryUtil.getBinariesForMultipleRefEntities(client, 'news', 'news', articleIds);      
      articles.forEach((c) => {
        c['branding'] = allBranding.filter(m => m['ref_id'] === c['id']);
      });
      
      const user = await personUtil.getPersonFromDB(client, data['context']['email']);
      await permissionUtil.populateMultipleEntitiesWithAllowedProperty(client, event, stand, articles, user?user['id']:null);
    }

    return util.handle200(data, articles || []);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
