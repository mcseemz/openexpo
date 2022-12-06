/**
 * @description Reindex data for an event
 * based on https://www.citusdata.com/blog/2016/03/30/five-ways-to-paginate/
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const roleUtil = require('./model/role');
const personUtil = require('./model/person');

const log = util.log;

function validateParams(params) {
  return (!params['scope'] || validator.isValidNonEmptyString(params['scope']));
}

async function getPostgresPageCount(client, table) {
  let query = {
    text: `SELECT pg_relation_size($1) / current_setting('block_size')::int as pgcnt`,
    values: [table]
  };

  log.info("REQUEST:", query);
  let {rows} = await client.query(query);
  log.info("fetched:", rows);
  return rows[0]['pgcnt'];
}

async function getPostgresPage(client, table, page) {
  let query = {
    text: `SELECT id FROM ${table} WHERE ctid = ANY (ARRAY
        (SELECT ('(' || ${page} || ',' || s.i || ')')::tid
         FROM generate_series(0,current_setting('block_size')::int/4) AS s(i)
        )
        )`
  };

  log.info("REQUEST:", query);
  const res = await client.query(query);
  log.info("fetched:", res.rows);
  return res.rows;
}

/**
 * iterate over all objects for a scope table
 * @param {Object} client - database client
 * @param {string} scope table
 * @param {string} idxEntity - name for indexation
 * @returns {Promise<Object>} returning object with scope and number of affected objcts
 */
async function iterate_entity(client, scope) {
  let total = 0;
  const cnt = await getPostgresPageCount(client, scope);
  for (let i = 0; i < cnt; i++) {
    log.info(`page ${i}`);
    const pagedata = await getPostgresPage(client, scope, i);
    log.info(`page size ${pagedata.length}`);
    for (let j in pagedata) {
      log.error({
        idxen: scope,
        idxid: pagedata[j]['id'],
        idxop: 'upd'
      });
      total++;
    }
  }

  return {entity: scope, affected: total};
}

/**
 *
 * @param  data.scope - what to reindex: event|stand
 * @param {string} data.origin - origin domain
 * @param context
 * @returns {Promise<{statusCode: number}|{body: *|string, statusCode: *}>}
 */
exports.handler = async function(data, context) {
  util.handleStart(data, 'lambdaEventSearch');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);

    //validate user is uberadmin
    const grants = await roleUtil.getMyGrantsForPlatform(client, user['id']);
    if (grants.length === 0) {
      throw new exceptionUtil.ApiException(403, 'You did something wrong');
    }

    const response = [];

    const scope = data['scope'] || 'all';
    log.info(`${scope} scope found`);
    switch (scope) {
      case "event":
      case "stand":
      case "company":
      case "personnel":
      case "activity":
      case "news":
        response.push(await iterate_entity(client, scope));
        break;
      case "all":
        for (let entity of ['event','stand','company','personnel','news','activity']) {
          response.push(await iterate_entity(client, entity));
        }
        break;
    }

    return util.handle200(data, response);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
