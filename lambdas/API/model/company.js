/**
 *  @description Company module
 *  @class companyUtil
 */
const util = require('./util');
const exceptionUtil = require('./exception');

const llog = util.log;

/**
 * Checks if user has a company, if he doesn't have creates new
 * @param client - PG client
 * @param user - 
 * @returns company
 */
async function createCompanyIfNotExistsForUser(client, user) {
  if (!user['company']) {
    //company doesn't exist yet. Create
    let query = {
      text: 'INSERT INTO Company(name , email, website, tags) VALUES($1, $2, $3, $4::jsonb) RETURNING *',
      values: [user['email'], user['email'], '', '[]']
    };

    llog.debug('REQUEST createCompanyIfNotExistsForUser: ', query);
    const company = await client.query(query);
    llog.debug('created: ', company);

    query = {
      text: `INSERT INTO personnel(person, stand, company, event, platform, role, position) VALUES($1, $2, $3, $4, $5, (select id from role where name='company-owner'), $6) RETURNING *`,
      values: [Number(user["id"]), null, Number(company.rows[0].id), null, null, "Company owner"]
    };

    llog.debug('REQUEST createCompanyIfNotExistsForUser-2: ', query);
    let res = await client.query(query);
    llog.debug('updated: ', res.rows[0]);

    return company.rows[0].id;
  } else {
    return user['company'];
  }
}

/**
 * Search company by it's id
 * @param client - PG client
 * @param companyId - id of the company 
 * @returns company, if found. Otherwise - null
 */
async function getCompanyById(client, companyId) {
  const query = {
    text: 'SELECT * FROM company where id = $1',
    values: [Number(companyId)]
  };

  llog.debug('REQUEST getCompanyById: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);
  if (userRes.rows.length === 0) {
    return null;
  } else {
    return userRes.rows[0];
  }
}

/**
 * Get company by id or throw the exception if not found.
 * @param client - PG client
 * @param companyId - id of the company
 * @returns company, if found. Otherwise - throws ApiException
 */
async function getCompanyByIdOrThrowException(client, companyId) {
  const query = {
    text: 'SELECT * FROM company where id = $1',
    values: [Number(companyId)]
  };

  llog.debug('REQUEST getCompanyByIdOrThrowException: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);
  if (userRes.rows.length === 0) {
    throw new exceptionUtil.ApiException(405, 'Company does not exist');
  } else {
    return userRes.rows[0];
  }
}

/**
 * Search company by params[id] and updating it
 * @param client - PG client
 * @param params - object 
 * @returns company, if found. Otherwise - null
 */
async function updateCompanyInDb(client, params) {
  const query = {
    text: 'UPDATE company SET name = $1, email = $2, website = $3, tags = $4::jsonb, vat = $5, address = $6 WHERE id = $7 RETURNING *',
    values: [params['name'] || '', params['email'] || '', params['website'] || '', JSON.stringify(params['tags']) || '[]',
      params['vat'] || '', params['address'] || {}, params['id']]
  };

  llog.debug('REQUEST updateCompanyInDb: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

exports.createCompanyIfNotExistsForUser = createCompanyIfNotExistsForUser;
exports.getCompanyById = getCompanyById;
exports.getCompanyByIdOrThrowException = getCompanyByIdOrThrowException;
exports.updateCompanyInDb = updateCompanyInDb;