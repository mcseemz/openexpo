const exceptionUtil = require('./exception');
const stringUtils = require('./strings');
const validator = require('./validation');
const util = require('./util')
const ARTICLE_PUBLISHED = 'published';
const ARTICLE_DRAFT = 'draft';


function calculateOffset(recordsPerPage, pageNum) {
  return Number(recordsPerPage || 0) * Number(pageNum || 0);
}

async function getRecordsForEntity(client, query, language) {
  const llog = client.log || util.log;

  llog.debug("REQUEST:", query);
  let articles = await client.query(query);
  llog.debug(`Found: ${articles.rows.length}`);
  articles = articles.rows;

  articles = articles.filter(a => a['status'] !== ARTICLE_PUBLISHED || validator.isTodayOrInPast(a['published']));

  if (!articles.length) {
    return [];
  }

  const articleIds = articles.map(a => a['id']);
  const additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'news', articleIds, language);

  if (additionalStrings != null) {
    articles.forEach((s) => {
      s['strings'] = additionalStrings.filter(str => str['ref_id'] === s['id']);
      delete s['strings']['description_long'];
      s['strings'].forEach(str => delete str['ref_id']);
    });
  }

  return articles.length ? articles : [];
}

async function getArticlesForEvent(client, entityId, status, pageNum, recordsPerPage, tags, language) {
  const offset = calculateOffset(recordsPerPage, pageNum);
  const query = {
    text: `SELECT *
           FROM news
           where event = $1
             and status = $2
             and content_type = 'article'
           AND CASE
                   WHEN $3::text[] IS NULL THEN true
                   ELSE tags::jsonb ?| $3::text[] END
           order by published desc
           offset $4`,
    values: [Number(entityId), status || ARTICLE_PUBLISHED, tags, offset]
  };

  if (recordsPerPage) {
    query.text = query.text + " limit " + Number(recordsPerPage);
  }

  return await getRecordsForEntity(client, query, language);
}

async function getArticlesForCompany(client, entityId, status, pageNum, recordsPerPage, tags, language) {
  const offset = calculateOffset(recordsPerPage, pageNum);
  const query = {
    text: `SELECT *
           FROM news
           where company = $1
             and status = $2
             and content_type = 'article'
           AND CASE
                   WHEN $3::text[] IS NULL THEN true
                   ELSE tags::jsonb ?| $3::text[] END
           order by published desc
           offset $4`,
    values: [Number(entityId), status || ARTICLE_PUBLISHED, tags, offset]
  };

  if (recordsPerPage) {
    query.text = query.text + " limit " + Number(recordsPerPage);
  }

  return await getRecordsForEntity(client, query, language);
}

async function getArticlesForStand(client, entityId, status, pageNum, recordsPerPage, tags, language) {
  const offset = calculateOffset(recordsPerPage, pageNum);
  const query = {
    text: `SELECT *
           FROM news
           WHERE stand = $1
             AND status = $2
             AND content_type = 'article'
           AND CASE
                   WHEN $3::text[] IS NULL THEN true
                   ELSE tags::jsonb ?| $3::text[] END
           ORDER BY published DESC
           OFFSET $4`,
    values: [Number(entityId), status || ARTICLE_PUBLISHED, tags, offset]
  };

  if (recordsPerPage) {
    query.text = query.text + " limit " + Number(recordsPerPage);
  }

  return await getRecordsForEntity(client, query, language);
}

async function getArticleById(client, articleId, language) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT *
           FROM news
           where id = $1`,
    values: [Number(articleId)]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug(`Found: ${res.rows.length}`);

  if (res.rows.length > 0) {
    res.rows[0]['strings'] = await stringUtils.getStringsForEntity(client, 'news', Number(articleId), language);
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Article not found');
  }
}

async function crateNew(client, article) {
  const llog = client.log || util.log;

  const query = {
    text: `insert into news(event, stand, company, editor, status, content_type, images, tags, published)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
           returning *`,
    values: [article['event'] ? Number(article['event']) : null, article['stand'] ? Number(article['stand']) : null,
      article['company'] ? Number(article['company']) : null, Number(article['editor']), article['status'] ? article['status'] : 'draft', 'article', JSON.stringify(article['images']),
      JSON.stringify(article['tags']) || '[]', (article['status'] === 'published') ? (article['published'] ? article['published'] : new Date()) : null]
  };

  llog.debug('REQUEST crateNew: ', query);
  let res = await client.query(query);
  llog.info('created: ', res.rows[0]);
  llog.error({idxen: "news", idxid: res.rows[0]['id'], idxop:"ins"}); //indexation

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(500, `Couldn't create an article`);
  }
}

async function updateArticle(client, article) {
  const llog = client.log || util.log;

  const query = {
    text: `update news
           set editor    = $1,
               status    = $2,
               images    = $3,
               tags      = $4::jsonb,
               published = $5,
               updated   = $6
           where id = $7
           returning *`,
    values: [Number(article['editor']), article['status'] ? article['status'] : 'draft', JSON.stringify(article['images']),
    JSON.stringify(article['tags']) || '[]', (article['status'] === 'published') ? (article['published'] ? article['published'] : new Date()) : null,
      new Date(), article['id']]
  };

  llog.debug('REQUEST updateArticle: ', query);
  let res = await client.query(query);
  llog.info('updated: ', res.rows[0]);
  llog.error({idxen: "news", idxid: res.rows[0]['id'], idxop:"upd"}); //indexation

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(500, `Couldn't update an article`);
  }
}

async function deleteArticle(client, articleId) {
  const llog = client.log || util.log;

  let query = {
    text: 'DELETE FROM news where id = $1 returning *',
    values: [Number(articleId)]
  };

  llog.debug('REQUEST deleteArticle: ', query);
  let res = await client.query(query);
  llog.info(`deleted: ${res.rows.length}`);
  llog.error({idxen: "news", idxid: articleId, idxop:"del"}); //indexation
}

exports.getArticlesForCompany = getArticlesForCompany;
exports.getArticlesForEvent = getArticlesForEvent;
exports.getArticlesForStand = getArticlesForStand;
exports.getArticleById = getArticleById;
exports.crateNew = crateNew;
exports.deleteArticle = deleteArticle;
exports.updateArticle = updateArticle;
exports.ARTICLE_PUBLISHED = ARTICLE_PUBLISHED;
exports.ARTICLE_DRAFT = ARTICLE_DRAFT;
