const {Pool} = require('pg');
const aws = require('aws-sdk');
const externalParamsUtil = require('./externalParams');
const util = require("./util");

let poolMap = {};
let paramsMap = {};

const dynamoDB = new aws.DynamoDB.DocumentClient();

function scan(key, value, table) {
  if (key === 'origindomain' && value.startsWith("pr-")) {
    value = 'dev' + value.substring(value.indexOf('.'));
  }
  return new Promise((resolve, reject) => {
    let params = {
      TableName: table,
      FilterExpression: "#keysubst = :value",
      ExpressionAttributeValues: {':value': value},
      ExpressionAttributeNames: {"#keysubst": key}
    };
    dynamoDB.scan(params, function (err, data) {
      if (err) reject(err);
      resolve(data);
    });
  });
}

async function getUserPoolMapping(searchValue, key) {
  let data = await scan(key, searchValue, 'texorigins');
  let result = data.Items.sort((a, b) => b.count - a.count);
  result = result.map(({origindomain, apidomain, bucket, userpool, binarydomain, environment}) => {
    return {origindomain, apidomain, bucket, userpool, binarydomain, environment}
  });
  return result;
}

async function getPool(searchValue, key) {
  let shortDomain;
  if (key !== 'origindomain') {
    if (!paramsMap[searchValue]) {
      let originMap = await getUserPoolMapping(searchValue, key);
      if (Object.keys(originMap).length === 0) {
        console.error("undefined value: " + searchValue);
        throw new Error('Couldn\'t retrieve configuration');
      }

      paramsMap[searchValue] = originMap[0];
    }
    shortDomain = paramsMap[searchValue].origindomain;
  } else {
    shortDomain = searchValue;
  }

  //todo cache results!
  let {PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT} = await externalParamsUtil.initDbSecrets(shortDomain);

  let pool = poolMap[PGDATABASE];
  if (!pool) {
    console.log("generating new pool for: " + PGDATABASE);
    pool = new Pool({
      user: PGUSER,
      database: PGDATABASE,
      password: PGPASSWORD,
      host: PGHOST,
      port: PGPORT,
      max: 1,
      min: 0,
      idleTimeoutMillis: 120000,
      connectionTimeoutMillis: 10000
    });
    poolMap[PGDATABASE] = pool;
  } else {
    console.log("reuse pool for: " + PGDATABASE);
  }

  return pool;
}

async function initPoolClientByOrigin(origin, context) {
  const pool = await getPoolFromOrigin(origin);

  const client = await initClient(pool, context);

  client.uploadsBucket = await getBucketFromOrigin(origin);
  client.shortDomain = extractOrigin(origin);
  return client;
}

async function initPoolClientByEnvironment(env, context) {
  const pool = await getPoolFromEnvironment(env);
  const client = await initClient(pool, context);

  client.uploadsBucket = await getBucketFromEnvironment(env);
  const origin = await getOriginFromEnvironment(env);
  client.shortDomain = extractOrigin(origin);
  return client;
}

async function initPoolClientByApiDomain(domain, context) {
  const pool = await getPoolFromApiDomain(domain);
  const client = await initClient(pool, context);

  client.uploadsBucket = await getBucketFromApiDomain(domain);
  const origin = await getOriginFromApiDomain(domain);
  client.shortDomain = extractOrigin(origin);
  return client;
}

async function initPoolClientByBucket(bucketName, context) {
  const pool = await getPoolFromBucket(bucketName);
  const client = await initClient(pool, context);

  client.uploadsBucket = bucketName;
  const origin = await getOriginFromBucket(bucketName);
  client.shortDomain = extractOrigin(origin);
  return client;
}

async function initPoolClientByUserpool(userpool, context) {
  const pool = await getPoolFromUserPool(userpool);
  const client = await initClient(pool, context);

  client.uploadsBucket = await getBucketFromUserpool(userpool);
  const origin = await getOriginFromUserpool(userpool);
  client.shortDomain = extractOrigin(origin);
  return client;
}

async function initClient(pool, context) {
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool
  const client = await pool.connect();
  client.log = util.log;
  return client;
}

function extractOrigin(initDomain) {
  const lastSlash = initDomain.lastIndexOf('/');
  const colonPos = initDomain.indexOf(':', lastSlash);
  return initDomain.substring(lastSlash + 1, colonPos !== -1 ? colonPos : initDomain.length);
}

async function initParamsMapByUserpool(userpool) {
  if (!paramsMap[userpool]) {
    let originMap = await getUserPoolMapping(userpool, 'userpool');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + userpool);
      throw new Error('Couldn\'t retrieve configuration');
    }
    paramsMap[userpool] = originMap[0];
  }
  return paramsMap[userpool];
}


async function initParamsMapByApiDomain(apiDomain) {
  if (!paramsMap[apiDomain]) {
    let originMap = await getUserPoolMapping(apiDomain, 'apidomain');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + apiDomain);
      throw new Error('Couldn\'t retrieve configuration');
    }
    paramsMap[apiDomain] = originMap[0];
  }
  return paramsMap[apiDomain];
}

async function initParamsMapByOrigin(initDomain) {
  const origin = extractOrigin(initDomain);
  if (!paramsMap[origin]) {
    let originMap = await getUserPoolMapping(origin, 'origindomain');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + origin);
      throw new Error('Couldn\'t retrieve configuration');
    }
    paramsMap[origin] = originMap[0];
  }
  return paramsMap[origin];
}

async function initParamsMapByBucket(bucketName) {
  if (!paramsMap[bucketName]) {
    let originMap = await getUserPoolMapping(bucketName, 'bucket');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + bucketName);
      throw new Error('Couldn\'t retrieve configuration');
    }
    paramsMap[bucketName] = originMap[0];
  }
  return paramsMap[bucketName];
}

async function getPoolFromOrigin(initDomain) {
  const origin = extractOrigin(initDomain);
  return getPool(origin, 'origindomain');
}

/**
 * get database parameters by environment.
 * @param {string} env - current environment. dev/prod
 * @returns {Promise<pg.Pool>}
 */
async function getPoolFromEnvironment(env) {
  return getPool(env, 'environment');
}

async function getPoolFromApiDomain(apiDomain) {
  return getPool(apiDomain, 'apidomain');
}

async function getPoolFromBucket(bucket) {
  return getPool(bucket, 'bucket');
}

async function getPoolFromUserPool(userPool) {
  return getPool(userPool, 'userpool');
}

async function getBucketFromEnvironment(environment) {
  if (!paramsMap[environment]) {
    let originMap = await getUserPoolMapping(environment, 'environment');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + environment);
      throw new Error('Couldn\'t retrieve configuration');
    }

    paramsMap[environment] = originMap[0];
  }

  return paramsMap[environment].bucket;
}

async function getUserPoolFromEnvironment(environment) {
  if (!paramsMap[environment]) {
    let originMap = await getUserPoolMapping(environment, 'environment');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + environment);
      throw new Error('Couldn\'t retrieve configuration');
    }

    paramsMap[environment] = originMap[0];
  }

  return paramsMap[environment].userpool;
}

async function getUserPoolFromOrigin(initDomain) {
  const origin = extractOrigin(initDomain);
  if (!paramsMap[origin]) {
    let originMap = await getUserPoolMapping(origin, 'origindomain');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + origin);
      throw new Error('Couldn\'t retrieve configuration');
    }

    paramsMap[origin] = originMap[0];
  }

  return paramsMap[origin].userpool;
}

async function getOriginFromEnvironment(environment) {
  if (!paramsMap[environment]) {
    let originMap = await getUserPoolMapping(environment, 'environment');
    if (Object.keys(originMap).length === 0) {
      console.error("undefined value: " + environment);
      throw new Error('Couldn\'t retrieve configuration');
    }

    paramsMap[environment] = originMap[0];
  }

  return paramsMap[environment].origindomain;
}


/**
 * Get origin URL from api domain field in DynamoDB. With result caching.
 * @param apiDomain - api domain
 * @returns origin
 */
async function getOriginFromApiDomain(apiDomain) {
  return (await initParamsMapByApiDomain(apiDomain)).origindomain;
}

async function getOriginFromBucket(bucketName) {
  return (await initParamsMapByBucket(bucketName)).origindomain;
}

async function getOriginFromUserpool(userpool) {
  return (await initParamsMapByUserpool(userpool)).origindomain;
}

async function getBucketFromApiDomain(apiDomain) {
  return (await initParamsMapByApiDomain(apiDomain)).bucket;
}

async function getBinaryDomainFromApiDomain(apiDomain) {
  return (await initParamsMapByApiDomain(apiDomain)).binarydomain;
}

async function getEnvironmentFromApiDomain(apiDomain) {
  return (await initParamsMapByApiDomain(apiDomain)).environment;
}
//----------------------------------
async function getBucketFromOrigin(initDomain) {
  return (await initParamsMapByOrigin(initDomain)).bucket;
}

async function getBucketFromUserpool(userpool) {
  return (await initParamsMapByOrigin(userpool)).bucket;
}

async function getApiDomainFromOrigin(initDomain) {
  return (await initParamsMapByOrigin(initDomain)).apidomain;
}

async function getBinaryDomainFromOrigin(initDomain) {
  return (await initParamsMapByOrigin(initDomain)).binarydomain;
}

async function getEnvironmentFromOrigin(initDomain) {
  return (await initParamsMapByOrigin(initDomain)).environment;
}

exports.getPoolFromOrigin = getPoolFromOrigin;
exports.getPoolFromApiDomain = getPoolFromApiDomain;
exports.getPoolFromBucket = getPoolFromBucket;
exports.getPoolFromUserPool = getPoolFromUserPool;
exports.getBucketFromOrigin = getBucketFromOrigin;
exports.getBucketFromApiDomain = getBucketFromApiDomain;
exports.getBucketFromEnvironment = getBucketFromEnvironment;
exports.getUserPoolFromEnvironment = getUserPoolFromEnvironment;
exports.getUserPoolFromOrigin = getUserPoolFromOrigin;
exports.getBinaryDomainFromApiDomain = getBinaryDomainFromApiDomain;
exports.getApiDomainFromOrigin = getApiDomainFromOrigin;
exports.getBinaryDomainFromOrigin = getBinaryDomainFromOrigin;
exports.getEnvironmentFromApiDomain = getEnvironmentFromApiDomain;
exports.getPoolFromEnvironment = getPoolFromEnvironment;
exports.getOriginFromApiDomain = getOriginFromApiDomain;
exports.getOriginFromUserpool = getOriginFromUserpool;
exports.getOriginFromEnvironment = getOriginFromEnvironment;
exports.getEnvironmentFromOrigin = getEnvironmentFromOrigin;
exports.initPoolClientByOrigin = initPoolClientByOrigin;
exports.initPoolClientByEnvironment = initPoolClientByEnvironment;
exports.initPoolClientByApiDomain = initPoolClientByApiDomain;
exports.initPoolClientByBucket = initPoolClientByBucket;
exports.initPoolClientByUserpool = initPoolClientByUserpool;
