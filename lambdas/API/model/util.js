const log = require('pino')({level: (process.env.debug || 'warn'),
  base: {}, timestamp: false,
  hooks: {
    logMethod (inputArgs, method) {
      if (inputArgs.length >= 2) {
        const arg1 = inputArgs.shift()
        const arg2 = inputArgs.shift()
        return method.apply(this, [arg2, arg1, ...inputArgs])
      }
      return method.apply(this, inputArgs)
    }
  }
});

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function uuid32() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function handleStart(data, lambdaName, activityType, entity, entityId) {
  let lentity;
  let lentity_id;
  if (data['eventId']) {  //predefined values
    lentity = 'event';
    lentity_id = data['eventId'];
  }
  else if (data['standId']) {
    lentity = 'stand';
    lentity_id = data['standId'];
  }
  else if (data['companyId']) {
    lentity = 'company';
    lentity_id = data['companyId'];
  }

  if (lambdaName) {
    data["lambda_name"] = lambdaName;
  }
  data["lambda_start"] = Date.now();
  data["activity_type"] = activityType || '';
  data["entity"] = entity || lentity || '';
  data["entity_id"] = entityId || lentity_id || '';
  data["env"] = process.env.Environment;
}

function handle200(data, body) {
  data["lambda_status"] = 200;
  const result = {
    statusCode: 200
  };

  if (body) {
    result['body'] = body;
  }

  return result;
}

/**
 * return redirect result
 * @method handle301
 * @param data - incoming data
 * @param url - url to resirect
 */
function handle301(data, url) {
  data["lambda_status"] = 301;
  return {
    statusCode: 301,
    headers: {
      "Location": url
    },
    body: null
  };
}


function handleError(data, err) {
  data["lambda_status"] = err['errorCode'] ? err['errorCode'] : 502;
  data["stacktrace"] = err.stack;
  if(err['errorMessage']) {
    data["lambda_error_message"] = err['errorMessage'];
  }
  return {
    statusCode: data["lambda_status"],
    body: err['errorMessage'] ? err['errorMessage'] : JSON.stringify(err)
  };
}

function handleFinally(data, client) {
//  console.log("RELEASING")
  if (client) {
    client.release(true);
  }

  data["lambda_end"] = Date.now();
  log.error("RELEASING", data);  //stats output
}

/**
 * mapping between referenced entity and the table where to loor for ref_id.
 * userd in collections for templating
 * @param ref
 * @returns {string|*}
 */
function mapRefToTable(ref) {
  switch (ref) {
    case 'upload': return 'binaries';
    case 'user': return 'person';
    default: return ref
  }
}

/**
 * fast hash generation
 * https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0#gistcomment-2775538
 */
function hashCode(s) {
  let h;
  for(let i = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;

  return h;
}

/**
 * class for defining objects for weak database relations
 */
class ObjectRef {
  constructor(entity, entityId) {
    this.entity = entity;
    this.entityId = entityId;
  }
}

/**
 * class for PG Client stub
 */
class ClientStub {
  release() { }
  query(query) { }
}

/**
 *
 * @param {Date} date
 * @returns {string} YYYY-MM-DD
 */
function formatDateYMD(date) {
  const year = date.getFullYear();
  const month = date.getMonth() < 9 ? `0${date.getMonth()+1}` : date.getMonth()+1;
  const day = date.getDate() < 10 ? '0'+date.getDate() : date.getDate();
  const hours = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
  const minutes = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes();

  // return `${year}-${month}-${day} ${hours}:${minutes}`;
  return `${year}-${month}-${day}`;
}

const emptyClient = new ClientStub();

exports.uuid = uuid;
exports.uuid32 = uuid32;
exports.handleStart = handleStart;
exports.handle200 = handle200;
exports.handle301 = handle301;
exports.handleError = handleError;
exports.handleFinally = handleFinally;
exports.mapRefToTable = mapRefToTable;
exports.hashCode = hashCode;
exports.formatDateYMD = formatDateYMD;
exports.ObjectRef = ObjectRef;
exports.emptyClient = emptyClient;
exports.log = log;
