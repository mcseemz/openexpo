/**
 * @description Search for a data.
 *  input parameters:
 *  str - string
 *  scope - all|event|stand|company|article|agenda|personnel, default all
 */
const validator = require('./model/validation');
const poolUtil = require('./model/pool');
const exceptionUtil = require('./model/exception');
const binaryUtils = require('./model/binary');
const util = require('./model/util');

const AWS = require('aws-sdk');
const { AWS_REGION, ELASTICSEARCH_DOMAIN } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN || "http://localhost");
const httpClient = new AWS.HttpClient();
const credentials = new AWS.EnvironmentCredentials('AWS');

const llog = util.log;

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
  llog.debug(`path: ${request.path}`);
  llog.debug('credentials: ', credentials);
  llog.debug('payload: ', payload);

  request.body = JSON.stringify(payload);
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

function validateParams(params) {
  return (!!params['str'] && validator.isValidNonEmptyString(params['str'])) &&
    (!params['start'] || validator.isNumber(params['start'])) &&
    (!params['size'] || validator.isNumber(params['size'])) &&
    (!params['eventId'] || validator.isNumber(params['eventId'])) &&
    (!params['standId'] || validator.isNumber(params['standId'])) &&
    (!params['scope'] || validator.isValidNonEmptyString(params['scope'])) &&
    (!params['language'] || validator.isValidLanguage(params['language']));
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaEventSearch');

  const env = process.env.Environment;

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    if (!ELASTICSEARCH_DOMAIN) {
      throw new exceptionUtil.ApiException(404, 'Search disabled');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const start = data['start'] || 0;
    const size = data['size'] || 10;

    let query = {
      query : {
        bool: {
          must: [
            { multi_match: {
                query: (data['str']),
                fields: ["name^3","normalizedname^3","tags","tagsdetected","descshort","desclong","*_lang"]
              }},
            {
              term: {
                public: true
              }
            }
          ]
        }
      },
      _source : ["object","name","timespan", "descshort","descslong"],
      highlight: {
        fields : {
          name : {},
          descshort : {},
          descslong : {}
        }
      },
      size: (size+1),
      from: (start)
    }

    if (data['scope'] && data['scope'] !== 'all') {
      query.query.bool.must.push({
        match: { "object.type": data['scope'] }
      })
    }

    if (data['eventId']) {
      query.query.bool.must.push({
        match: { eventid: data['eventId'] }
      })
    } else
    if (data['standId']) {
      query.query.bool.must.push({
        match: { eventid: data['standId'] }
      })
    }

    let response = await sendRequest('POST', 'tex-v1-'+env+'/_search', query);
    console.log("RESPONSE: " + JSON.stringify(response));

    if (response.statusCode >= 300) {
      console.log("ERROR: " + JSON.stringify(response));
      throw new exceptionUtil.ApiException(502, 'Invalid ES response');
    }

    const respsize = response.body.hits.hits.length;
    const more = (respsize === size+1);
    const total = response.body.hits.total.value;

    if (more) { // there's more, trunk last response, as we requested one more
      response.body.hits.hits.splice(-1, 1);
    }

    const searchres = [];
    for (let i in response.body.hits.hits) {
      const hit = response.body.hits.hits[i];

      const data = {
        ref: hit._source.object.type,
        ref_id: hit._source.object.id,
        name: hit._source.name,
        start: hit._source.timespan ? hit._source.timespan.gte : null,
        end: hit._source.timespan ? hit._source.timespan.lte : null,
        descshort: hit._source.descshort,
        descslong: hit._source.descslong,
        // name: hit.highlight.name || hit._source.name,
        // descshort: hit.highlight.descshort || hit._source.descshort,
        // descslong: hit.highlight.descslong || hit._source.descslong,
      }

      if (hit._source.object.type === 'event') {
        data.branding = await binaryUtils.getBrandingMaterialsForEvent(client, hit._source.object.id, data['language'], false);
      } else
      if (hit._source.object.type === 'stand') {
        data.branding = await binaryUtils.getBrandingMaterialsForStand(client, hit._source.object.id, data['language'], false);
      } else
      if (hit._source.object.type === 'personnel') {
        data.branding = await binaryUtils.getBrandingMaterialsForPersonnel(client, hit._source.object.id, data['language']);
      } else
      if (hit._source.object.type === 'news') {
        data.branding = await binaryUtils.getBrandingMaterialsForArticle(client, hit._source.object.id, data['language'], false);
      }

      //TODO how to validate that stand personnel is for visible event? navigate to that?
      searchres.push(data);
    }

    return util.handle200(data, {
      status: "success",
      start: start,
      size: size,
      more: more,
      total: total,
      result: searchres});
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
