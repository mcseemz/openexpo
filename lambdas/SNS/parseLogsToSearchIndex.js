/**
 *  @description Parse processed logs to detect data updates.
 *  we detect entity type to collect fields for proper index
 */
const poolUtil = require('./model/pool');
const util = require('./model/util');
const eventUtil = require('./model/event');
const stringUtils = require('./model/strings');
const exceptionUtil = require('./model/exception');
const standUtil = require('./model/stand');
const companyUtil = require('./model/company');
const newsUtil = require('./model/news');
const activityUtil = require('./model/activity');
const personnelUtil = require('./model/personnel');

const AWS = require('aws-sdk');
const { AWS_REGION, ELASTICSEARCH_DOMAIN } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN || "http://localhost");
const httpClient = new AWS.HttpClient();
const credentials = new AWS.EnvironmentCredentials('AWS');

const log = util.log;

/**
 * Sends a request to Elasticsearch
 *
 * @param {string} httpMethod - The HTTP method, e.g. 'GET', 'PUT', 'DELETE', etc
 * @param {string} requestPath - The HTTP path (relative to the Elasticsearch domain), e.g. '.kibana'
 * @param {Object} [payload] - An optional JavaScript object that will be serialized to the HTTP request body
 * @returns {Promise} Promise - object with the result of the HTTP response
 */
async function sendRequest( httpMethod, requestPath, payload) {
  const request = new AWS.HttpRequest(endpoint, AWS_REGION);

  request.method = httpMethod;
  request.path = request.path + requestPath;
  console.log('path: ' + request.path);
  console.log('credentials: ' + JSON.stringify(credentials));

  if (payload) {
    request.body = JSON.stringify(payload);
  }
  request.headers['Content-Type'] = 'application/json';
  request.headers['Host'] = ELASTICSEARCH_DOMAIN;

  const signer = new AWS.Signers.V4(request, 'es');
  signer.addAuthorization(credentials, new Date());

  return new Promise((resolve, reject) => {
    httpClient.handleRequest(request, null,
      response => {
        const { statusCode, statusMessage, headers } = response;
        let body = '';
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('end', () => {
          const data = {
            statusCode,
            statusMessage,
            headers
          };
          if (body) {
            data.body = JSON.parse(body);
          }
          resolve(data);
        });
      },
      err => {
        reject(err);
      });
  });
}

exports.handler = async function (data, context) {
  util.handleStart(data ); //'lambdaParseLogsToSearchIndex' remove to skip spam
  const debug = process.env.debug;
  const env = process.env.Environment;
  let client = util.emptyClient;
  try {
    if (!ELASTICSEARCH_DOMAIN) {
      throw new exceptionUtil.ApiException(404, 'Search disabled');
    }

    client = await poolUtil.initPoolClientByEnvironment(env, context);

    const result = data['Records'];
    if (debug) console.log("Event Data:", JSON.stringify(result, null, 2));

    if (result) {
      for (const record of result) {
        const {Message} = record['Sns'];
        let events = JSON.parse(Message);

        for (const json of events) {
          //if (debug) console.log('json: ', json); //will cause infinite loop
          if (json['idxen']) {
            const idxEntity = json['idxen'];
            const idxId = json['idxid'];
            const idxOp = json['idxop']; //ins|upd|del
            log.debug(`index operation ${idxEntity} ${idxId} ${idxOp}`);

            if (idxOp === 'del') {  //we need to delete
              let response = await sendRequest('DELETE', 'tex-v1-'+env+'/_doc/'+idxEntity+'-'+idxId, null);
              if (response.statusCode >= 300) {
                log.error(response);
                throw new exceptionUtil.ApiException(502, 'Invalid ES response');
              }
            }
            else {
              //personnel does not have strings
              const strings = idxEntity==='personnel' ? [] : (await stringUtils.getStringsForEntity(client, idxEntity, idxId));  //default ones only, if no language
              let name = strings.filter(e => e['category']==='name').map(x => x['value']);
              let descshort = strings.filter(e => e['category']==='description_short').map(x => x['value']);
              let descslong = strings.filter(e => e['category']==='description_long').map(x => x['value']);
              const idx = {
                object: { type: idxEntity, id: idxId },
                name: name,
                normalizedname: name, //	- unified name (after normalization)
                descshort: descshort,
                descslong: descslong,
                timestamp: new Date().getTime(),
                eventid: null,
                standid: null,
                categoryid: null,
                tagsdetected: null,  //after data extraction
                timespan: null  //activity timespan
              };

              switch (idxEntity) {
                case "person":

                  break;
                case "event":
                  //we consider no deletion (yet)
                  const event = await eventUtil.getEventFromDb(client, idxId);
                  idx.companyid = event['company'];
                  idx.tags = event['tags'];
                  idx.public = event['is_public'] && event['status'] === 'active'
                  idx.timespan = {gte: event['dateStart'], lte: event['dateEnd']}
                  break;
                case "stand":
                  const stand = await standUtil.getStandFromDb(client, idxId);
                  idx.companyid = stand['company'];
                  idx.eventid = stand['eventId'];
                  idx.tags = stand['tags'];
                  idx.public = stand['status'] === 'published';
                  break;
                case "company":
                  const company = await companyUtil.getCompanyById(client, idxId);
                  idx.companyid = company['id'];
                  idx.tags = company['tags'];
                  idx.public = true;
                  break;
                case "news":
                  const article = await newsUtil.getArticleById(client, idxId);
                  idx.companyid = article['company'];
                  idx.standid = article['stand'];
                  idx.eventid = article['event'];
                  idx.tags = article['tags'];
                  idx.public = true;
                  break;
                case "activity":
                  const agenda = await activityUtil.getActivityFromDb(client, idxId);
                  idx.companyid = null;
                  idx.standid = agenda['stand'];
                  idx.eventid = agenda['event'];
                  idx.tags = agenda['tags'];
                  idx.public = agenda['visibility'] === 'event_published' || agenda['visibility'] === 'stand_public';
                  idx.timespan = {gte: agenda['start'], lte: agenda['end']}
                  break;
                case "personnel":
                  const personnel = await personnelUtil.getPersonnelById(client, idxId);
                  idx.companyid = personnel['company'];
                  idx.standid = personnel['stand'];
                  idx.eventid = personnel['event'];
                  idx.name = personnel['name'];
                  idx.descshort = personnel['position'];
                  idx.public = personnel['public'];
                  break;
              }

              let response = await sendRequest('POST', 'tex-v1-' + env + '/_doc/' + idxEntity + '-' + idxId, idx);
              if (response.statusCode >= 300) {
                log.error(response);
                throw new exceptionUtil.ApiException(502, 'Invalid ES response');
              }
            }
          }
        }
      }
    }

    delete data['Records'];  //cleanup and avoid recursions
    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
