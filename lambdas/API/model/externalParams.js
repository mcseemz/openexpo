let AWS = require('aws-sdk'),
    region = process.env.AWS_REGION;

// Create a Secrets Manager client
const parameterStore = new AWS.SSM();

let secretsManager = new AWS.SecretsManager({
  region: region
});

/**
 * get secret from Secrets Manager
 * @param secretName name of secret
 * @returns {Promise<Object>}
 */
async function getSecret(secretName) {
  if (secretName.startsWith("pr-")) {
    secretName = 'dev' + secretName.substring(secretName.indexOf('.'));
  }

  return new Promise((resolve, reject) => {
    secretsManager.getSecretValue({SecretId: secretName}, function (err, data) {
      if (err) {
        reject(err);
      } else {
        if ('SecretString' in data) {
          resolve(data.SecretString);
        } else {
          let buff = new Buffer(data.SecretBinary, 'base64');
          resolve(buff.toString('ascii'));
        }
      }
    });
  });
}

async function getParam(paramName) {
  if (paramName.startsWith("/pr-")) {
    paramName = '/dev' + paramName.substring(paramName.indexOf('.'));
  }

  return new Promise((resolve, reject) => {
    parameterStore.getParameter({Name: paramName}, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}

async function initDbSecrets(origin) {
  let secret = await getSecret(`${origin}/database`);
  secret = JSON.parse(secret);

  return {
    PGUSER: secret['username'],
    PGPASSWORD: secret['password'],
    PGDATABASE: secret['dbname'],
    PGHOST: secret['host'],
    PGPORT: secret['port']
  }
}

async function getModeratorsList(origin) {
  let param = await getParam(`/${origin}/moderators`);
  return param['Parameter']['Value'].split(',');
}

async function getSenderEmail(origin) {
  if (origin.indexOf(':') > 0) {  //remove port if present
    origin = origin.substring(0, origin.indexOf(':'));
  }
  let param = await getParam(`/${origin}/sender`);
  return param['Parameter']['Value'];
}

exports.getSecret = getSecret;
exports.initDbSecrets = initDbSecrets;
exports.getModeratorsList = getModeratorsList;
exports.getSenderEmail = getSenderEmail;
