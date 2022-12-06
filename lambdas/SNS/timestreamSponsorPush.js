/**
 * Lambda for pushing filtered CloudWatch data to Timestream. </br>
 * We take snadard statistics from incoming log line it and pack it for proper influx json. Supported parameters are:

 * @class timestreamSponsorPush
 */
const AWS = require('aws-sdk');

// Set regions
AWS.config.update({region: 'eu-central-1'});
AWS.config.timestreamwrite = {region: process.env.TimestreamRegion};

const SPONSOR_DATABASE = process.env.TimestreamDatabase;
const SPONSOR_TABLE = process.env.TimestreamSponsorTable.split("\|")[1];


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
        {'Name': 'place_id', 'Value': record.tags.place_id ? record.tags.place_id : "-1"}, //event-landing
        {'Name': 'env', 'Value': record.tags.env},
        {'Name': 'action_type', 'Value': String(record.tags.action_type)},  //view/click
        {'Name': 'sponsor_id', 'Value': String(record.tags.sponsor_id)},
        {'Name': 'sponsor_type', 'Value': record.tags.sponsor_type},
        {'Name': 'event_id', 'Value': String(record.tags.event_id)},
        {'Name': 'user_id', 'Value': String(record.tags.user_id)}
    ];

    const action = {
        'Dimensions': dimensions,
        'MeasureName': 'user_id_field',
        'MeasureValue': String(record.fields.user_id_field),
        'MeasureValueType': 'BIGINT',
        'Time': String(record.timestamp),
        'TimeUnit': 'MILLISECONDS'
    };

    const records = [action];

    const params = {
        DatabaseName: SPONSOR_DATABASE,
        TableName: SPONSOR_TABLE,
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
 * @param {String} event line from containing base64-ed zipped line from logs containing json with stats parameters
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
        
        if (json['isSponsorStat'] && (json['lambda_status'] === 200 || json['lambda_status'] === 301)) { //success processing only
          if (debug) console.log('processing sponsor event');
          await timestreamRecord(json['batchItem']);
        }
      }
    }
  }        
  return {};
}