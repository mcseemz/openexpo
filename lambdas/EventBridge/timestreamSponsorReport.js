/**
 * @description Lambda for getting Timestream sponsor data. </br>
 * We take daily stats per active event and store them in S3 for frontend access
 * @class EBTimestreamSponsorReport
 */
// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Set region
AWS.config.update({region: 'eu-central-1'});
AWS.config.timestreamquery = {region: 'eu-west-1'};

const s3 = new AWS.S3({signatureVersion: 'v4'});

const util = require('./model/util');
const poolUtil = require('./model/pool');
const tierUtil = require('./model/tier');
const eventUtils = require('./model/event');
const sponsorshipUtil = require('./model/sponsorship');

const SPONSOR_DATABASE = process.env.TimestreamDatabase;
const SPONSOR_TABLE = process.env.TimestreamSponsorTable.split("\|")[1];
const BANNER_REQUEST_STRING = `SELECT BIN(time, 1d) as date, place_id, action_type, count(*) as total FROM "${SPONSOR_DATABASE}"."${SPONSOR_TABLE}" where event_id=\'<event_id>\' and sponsor_type=\'<sponsor_type>\'  and sponsor_id=\'<sponsor_id>\' GROUP BY place_id, action_type, BIN(time, 1d)`

const log = util.log;
//========================================================
const queryClient = new AWS.TimestreamQuery();

function parseRow(columnInfo, row) {
  const data = row.Data;
  let rowOutput = {};

  for (let i = 0; i < data.length; i++ ) {
    let info = columnInfo[i];
    let datum = data[i];
    rowOutput = {
      ...rowOutput,
      ...parseDatum(info, datum)
    };
  }
  return rowOutput;
}

/**
 *
 * @param {Object} response - info on columns
 * @param response.ColumnInfo
 * @param response.Rows
 * @param {Array} resultset
 */
function parseQueryResult(response, resultset) {
  const columnInfo = response.ColumnInfo;
  const rows = response.Rows;

  log.debug("Metadata: ",columnInfo);
  log.debug(`resultset: ${resultset}`);

  rows.forEach(function (row) {
    log.debug(parseRow(columnInfo, row));
    resultset.push(parseRow(columnInfo, row));
  });
}

async function getAllRows(query, nextToken, resultset) {
  const params = { QueryString: query };

  if (nextToken) {
    params.NextToken = nextToken;
  }

  await queryClient.query(params).promise()
    .then(
      (response) => {
        parseQueryResult(response, resultset);
        if (response.NextToken) {
          getAllRows(query, response.NextToken, resultset);
        }
      },
      (err) => {
        console.error("Error while querying:", err);
      });
}

/**
 *
 * @param info.Type.TimeSeriesMeasureValueColumnInfo
 * @param info.Type.ArrayColumnInfo
 * @param info.Type.RowColumnInfo
 * @param info.Name
 * @param datum.ArrayValue
 * @param datum.RowValue
 * @param datum.NullValue
 * @param datum.TimeSeriesValue
 * @param datum.ScalarValue
 * @returns {{}|[]}
 */
function parseDatum(info, datum) {
  if (datum.NullValue != null && datum.NullValue === true) {
    const result = {};
    result[info.Name] = null;
    return result;
  }

  const columnType = info.Type;

  // If the column is of TimeSeries Type
  if (columnType.TimeSeriesMeasureValueColumnInfo != null) {
    return parseTimeSeries(info, datum);
  }
  // If the column is of Array Type
  else if (columnType.ArrayColumnInfo != null) {
    const arrayValues = datum.ArrayValue;
    const result = {};
    result[info.Name] = parseArray(info.Type.ArrayColumnInfo, arrayValues);
    return result;
  }
  // If the column is of Row Type
  else if (columnType.RowColumnInfo != null) {
    const rowColumnInfo = info.Type.RowColumnInfo;
    const rowValues = datum.RowValue;
    return parseRow(rowColumnInfo, rowValues);
  }
  // If the column is of Scalar Type
  else {
    return parseScalarType(info, datum);
  }
}

function parseTimeSeries(info, datum) {
  const timeSeriesOutput = [];

  datum.TimeSeriesValue.forEach(function (dataPoint) {
    timeSeriesOutput.push({
      time: dataPoint.Time,
      value: parseDatum(info.Type.TimeSeriesMeasureValueColumnInfo, dataPoint.Value)
    });
  });

  return timeSeriesOutput;
}

function parseScalarType(info, datum) {
  const result = {};
  result[info.Name] = datum.ScalarValue;
  return  result;
}

function parseArray(arrayColumnInfo, arrayValues) {
  const arrayOutput = [];
  arrayValues.forEach(function (datum) {
    arrayOutput.push(parseDatum(arrayColumnInfo, datum));
  });

  return arrayOutput;
}

/**
 * fetch action data from timestream, grouped by day
 * @param {Object} event
 * @param {Object} sponsor - relation with sponsor config
 * @returns {Promise<[]>}
 */
async function getBannerStats(event, sponsor) {
  const resultset = [];
  const REQ_READY_STRING = BANNER_REQUEST_STRING
    .replace('<event_id>', event['id'])
    .replace('<sponsor_type>', sponsor.object_ref)
    .replace('<sponsor_id>', sponsor.object_ref_id);
  log.debug(`requesting: ${REQ_READY_STRING}`);
  await getAllRows(REQ_READY_STRING, null, resultset);

  log.debug('resultset:', resultset);
  return resultset;
}

/**
 * get lottery data for sponsor and event
 * @param {pg.client} client
 * @param {Object} event
 * @param {Object} sponsor - relationship
 * @returns {Promise<*>} rows with data
 */
async function getLotteryStats(client, event, sponsor) {
  const var1 = '$.sponsorship[*] ? ( @.relationId == ' + sponsor['id'] + ').lottery.prizeId';
  const var2 = '$.sponsorship[*] ? ( @.relationId == ' + sponsor['id'] + ').lottery.prizeId ? (@ != null)';
  let query = {
    text: `select p.name, p.surname, p.email,
                    jsonb_path_query(r.parameter, '$.lottery.options[*] ? ( @.id == $prize).label',
                         jsonb_build_object( 'prize',
                             jsonb_path_query(t.parameter, '${var1}')
                         )
                    ) as prizeName
             from ticket t
                join person p on t.buyer = p.id
                join event e on t.event = e.id
                join relation r on r.id = $2
             where e.id = $1 and
                 jsonb_path_exists(t.parameter, '${var2}')
          `,
    values: [Number(event['id']), Number(sponsor['id'])]
  };

  log.debug("REQUEST:", query);
  let res = await client.query(query);
  log.debug(`fetched: ${res.rows.length}`);
  return res.rows;
}

/**
 * get survey data for sponsor and event
 * @param {Object} client - database
 * @param {Object} event - event object
 * @param {Object} sponsor - relationship
 * @returns {Promise<*>} rows with data
 */
async function getSurveyStats(client, event, sponsor) {
  //2. get person name,surname and email, along with question and answer. one line per question.
  //complicated  request as we have to replace question id with its name, thus building new object
  const var1 = '$.sponsorship[*] ? ( @.relationId == ' + sponsor['id'] + ').survey';
  let query = {
    text: `select tickq.name, tickq.surname, tickq.email,
                  jsonb_build_object('label', definition ->> 'label', 'value', answer #> '{value}') as data
           from (select jsonb_path_query(r.parameter, '$.survey.questions[*]') as definition
                 from relation r
                 where r.id = $2) as names
           join
                (select p.name, p.surname, p.email, jsonb_path_query(t.parameter, '$.sponsorship.survey.questions[*]') as answer
                 from ticket t
                          join person p on t.buyer = p.id
                          join event e on t.event = e.id
                 where e.id = $1 and
                     jsonb_path_exists(t.parameter, '${var1}')
                ) as tickq
           on definition ->> 'id' = answer ->> 'id'
          `,
    values: [Number(event['id']), Number(sponsor['id'])]
  };

  log.debug("REQUEST:", query);
  let res = await client.query(query);
  log.debug(`fetched: ${res.rows.length}`);
  return res.rows;
}

/**
 * generate report for:
 * - banner actions view/click
 * - lottery winners
 * - survey results
 * @param event - eventbridge data
 * @param context
 * @returns {Promise<void>}
 */
async function generateSponsorshipReport(event, context) {
  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByEnvironment(event['env'], context);

    //get list of active events

    const events = await eventUtils.getActiveEvents(client);
    //for each event
    console.log('event list:', events);

    for (const event of events) {
      console.log('active event: ' + JSON.stringify(event));
      //check if it has sponsorship
      const sponsors = await sponsorshipUtil.getSponsorsForEvent(client, event['id']);
      console.log('sponsors', sponsors);
      //bucket path
      const filePrefix = `company/${event['company']}/events/${event['id']}/sponsor-data/`;

      let tiers = await tierUtil.getTiersEnabledForEventSimple(client, event['id']);
      let tiersBanner = tiers.filter(e => e['switches']['banner']).map(e => e['id']);  //id
      let tiersLottery = tiers.filter(e => e['switches']['lottery']).map(e => e['id']);  //id
      let tiersSurvey = tiers.filter(e => e['switches']['survey']).map(e => e['id']);  //id

      for (const sponsor of sponsors) {
        if (tiersBanner.includes(sponsor['parameter']['tierId']))
          try {
            const resultset = await getBannerStats(event, sponsor);

            //file s3://tex-binary-dev/company/12/events/49/sponsor-data/event-49.sponsor-user-445
            const fileName = `event-${event['id']}.sponsor-${sponsor['object_ref']}-${sponsor['object_ref_id']}.json`;

            console.log(`S3 filename: ${filePrefix + fileName}`);

            const params = {
              Body: JSON.stringify(resultset),
              Bucket: client.uploadsBucket,
              Key: filePrefix + fileName
            };
            await s3.putObject(params).promise();
          } catch (err) {
            console.error(err);
          }

        //lottery
        if (tiersLottery.includes(sponsor['parameter']['tierId']))
          try {
            //select tickets with named relation id
            let resultset = await getLotteryStats(client, event, sponsor);

            //put to event s3://tex-binary-dev/company/12/events/49/sponsor-data/event-49.sponsor-user-445-lottery.json
            const fileName = `event-${event['id']}.sponsor-${sponsor['object_ref']}-${sponsor['object_ref_id']}-lottery.json`;
            console.log(`S3 filename: ${filePrefix + fileName}`);
            const params = {
              Body: JSON.stringify(resultset),
              Bucket: client.uploadsBucket,
              Key: filePrefix + fileName
            };
            await s3.putObject(params).promise();
          } catch (err) {
            console.error(err);
          }

        //survey
        if (tiersSurvey.includes(sponsor['parameter']['tierId']))
          try {
            //select tickets with named relation id
            let resultset = await getSurveyStats(client, event, sponsor);

            //put to event s3://tex-binary-dev/company/12/events/49/sponsor-data/event-49.sponsor-user-445-lottery.json
            const fileName = `event-${event['id']}.sponsor-${sponsor['object_ref']}-${sponsor['object_ref_id']}-survey.json`;
            console.log(`S3 filename: ${filePrefix + fileName}`);
            const params = {
              Body: JSON.stringify(resultset),
              Bucket: client.uploadsBucket,
              Key: filePrefix + fileName
            };
            await s3.putObject(params).promise();
          } catch (err) {
            console.error(err);
          }
      }
    }
    console.log("closing sponsor report");
  } catch (err) {
    log.error(err);
  } finally {
    util.handleFinally(event, client);
  }

}


/**
 //========================================================
 /**
 * Main method. Depending on event parse parameters
 * @method handler
 * @param {String} event line from containing base64-ed zipped line from logs containing json with stats parameters
 * @param {Object} context of invocation
 */
exports.handler = async function (event, context) {
  util.handleStart(event, "lambdaTimestreamSponsorReport");
  /*
   console.log("checking timestream databases");
   await listDatabases();
   console.log("checked timestream databases");
  */
//get data grouped by place, date and sponsor
  await generateSponsorshipReport(event, context);
  return util.handle200(event,{ message: "event received" })

};
