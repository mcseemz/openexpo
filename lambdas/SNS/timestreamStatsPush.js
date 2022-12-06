/**
 * Lambda for pushing filtered CloudWatch data to Timestream. </br>
 * We take snadard statistics from incoming log line it and pack it for proper influx json. Supported parameters are:
 <pre>
  origin: 'https://dev.enter_your.domain',
  eventId: '76',
  placeIds: 'event-landing',
  language: 'en_GB',
  context: {
    sub: '49cff371-eb26-496d-b717-522b03f0b6a4',
    username: '49cff371-eb26-496d-b717-522b03f0b6a4',
    email: 'someuser@email.domain',
    userId: ''
  },
  lambda_name: 'lambdaEventPageGetPromos',
  lambda_start: 1606236444759,
  activity_type: '',
  entity: '',
  entity_id: '',
  lambda_status: 404,
  lambda_end: 1606236445978
 </pre>
 * @class timestreamLambdaPush
 */
// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Set regions
AWS.config.update({region: 'eu-central-1'});
AWS.config.timestreamwrite = {region: process.env.TimestreamRegion};

const LAMBDA_DATABASE = process.env.TimestreamDatabase;
const LAMBDA_TABLE = process.env.TimestreamLambdasTable.split("\|")[1];


//========================================================
/**
 * Recommended Timestream write client SDK configuration:
 *  - Set SDK retry count to 10.
 *  - Use SDK DEFAULT_BACKOFF_STRATEGY
 *  - Set RequestTimeout to 20 seconds .
 *  - Set max connections to 5000 or higher.
 */
var https = require('https');
var agent = new https.Agent({
    maxSockets: 5000
});
var writeClient = new AWS.TimestreamWrite({
        maxRetries: 10,
        httpOptions: {
            timeout: 20000,
            agent: agent
        }
    });

async function timestreamRecord(record) {
    console.log("Writing records");

    const dimensions = [
        {'Name': 'origin', 'Value': record.origin || "N/A"}, 
        {'Name': 'language', 'Value': record.language || "N/A" }, 
        {'Name': 'lambda_name', 'Value': record.lambda_name},
        {'Name': 'lambda_status', 'Value': String(record.lambda_status || 0)},
    ];

    if (record.context && record.context.email)
      dimensions.push({'Name': 'user_email', 'Value': record.context.email});
    if (record.eventId)
      dimensions.push({'Name': 'eventId', 'Value': String(record.eventId) });
    else if (record.entityId && record.entityType && record.entityType === 'event')
      dimensions.push({'Name': 'eventId', 'Value': String(record.entityId) });

    let duration = (record.lambda_end || 0) - (record.lambda_start || 0);

    if (duration < 0 || duration > 600 * 1000) { //error in calculation duration
      dimensions.push({'Name': 'duration_error', 'Value': "1" });
      duration = 0;
    }

    const action = {
        'Dimensions': dimensions,
        'MeasureName': 'duration',
        'MeasureValue': String(duration),
        'MeasureValueType': 'BIGINT',
        'Time': String(record.lambda_start),
        'TimeUnit': 'MILLISECONDS'
    };

    const records = [action];

    const params = {
        DatabaseName: LAMBDA_DATABASE,
        TableName: LAMBDA_TABLE,
        Records: records
    };

  try {
    const request = writeClient.writeRecords(params);

    await request.promise().then(
        (data) => {
            console.log("Write timestream successful");
        },
        (err) => {
            console.log("Error writing timestream:", err);
            if (err.code === 'RejectedRecordsException') {
                const responsePayload = JSON.parse(request.response.httpResponse.body.toString());
                console.log("RejectedRecords: ", responsePayload.RejectedRecords);
                console.log("Other records were written successfully. ");
            }
        }
    );
    
  } catch (err) {
    console.log("Write ERROR", err);
  }
}
//========================================================
/**
 * Main method. Depending on event parse parameters
 * @method handler
  
 * @param {Object} context of invocation
 * @return ObjectExpression
 */
exports.handler = async function (data, context) {
  const debug = process.env.debug;
  if (debug) console.log("SNS data:\n", data);
 
  const result = data['Records'];
  if (debug) console.log("Event Data:", JSON.stringify(result, null, 2));

  if (result) {
    if (debug) console.log("Records found");

    for (const record of result) {
      const {Message} = record['Sns'];
      let events = JSON.parse(Message);

      for (const json of events) {
        if (debug) console.log('json: ', json);
        
        await timestreamRecord(json);
      }
    }
  }        
  return {};
}
