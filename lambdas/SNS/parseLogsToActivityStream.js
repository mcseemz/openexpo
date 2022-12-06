/**
 *  @description Parse processed logs to add events to activity streams.
 *  supported activities list is in stream.js
 */
const poolUtil = require('./model/pool');
const util = require('./model/util');
const streamUtil = require('./model/stream');

exports.handler = async function (data, context) {
  util.handleStart(data); //we remove name to abort the logging cycle
  const debug = process.env.debug;

  let client = util.emptyClient;
  try {
    const result = data['Records'];
    if (debug) console.log("Event Data:", JSON.stringify(result, null, 2));

    if (result) {
      console.log("Records found");

      for (const record of result) {
        const {Message} = record['Sns'];
        let events = JSON.parse(Message);

        for (const json of events) {
          if (debug) console.log('json: ', json);
          if (json['activity_type'] && json['lambda_status'] === 200) {
            console.log('new stream event', json['activity_type']);

            if (json['activity_type'] === streamUtil.DOCUMENT_ADD) {  //uploaded binary
              client = await poolUtil.initPoolClientByBucket(json['bucket'], context);
            } else if (json['activity_type'] === streamUtil.LOTTERY_START ||
              json['activity_type'] === streamUtil.SURVEY_START ||
              json['activity_type'] === streamUtil.ACTIVITY_START ) {  //scheduled activities
                client = await poolUtil.initPoolClientByEnvironment(json['env'], context);
            } else {  //user activities
              client = await poolUtil.initPoolClientByOrigin(json['origin'], context);
            }

            switch (json['activity_type']) {
              case streamUtil.NEWS_ADD:
                const article = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.NEWS_ADD, 'news', json['article']['id'], null);
                console.log('article stream entry:', article);
                break;
              case streamUtil.STAND_ADD:
                const stand = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.STAND_ADD, 'stand', json['stand']['id'], null);
                console.log('stand stream entry:', stand);
                break;
              case streamUtil.ACTIVITY_ADD:
                const activity = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.ACTIVITY_ADD, 'activity', json['activity']['id'], null);
                console.log('activity stream entry:', activity);
                break;
              case streamUtil.ACTIVITY_START:
                const activityst = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.ACTIVITY_START, 'activity', json['activityid'], null);
                console.log('activity stream entry:', activityst);
                break;
              case streamUtil.PRICING_CHANGE:
                const pricingChange = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.PRICING_CHANGE, 'pricing', json['pricing']['id'], null);
                console.log('pricing change stream entry:', pricingChange);
                break;
              case streamUtil.DOCUMENT_ADD:
                const documentAdd = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.DOCUMENT_ADD, 'upload', json['binary']['id'], null);
                console.log('document add stream entry:', documentAdd);
                break;
              case streamUtil.LOTTERY_START:
                const lotteryStart = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.LOTTERY_START, 'relation', json['relationid'], null);
                console.log('lottery start stream entry:', lotteryStart);
                break;
              case streamUtil.SURVEY_START:
                const surveyStart = await streamUtil.createStreamEntry(client, json['entity'], json['entity_id'], streamUtil.SURVEY_START, 'relation', json['relationid'], null);
                console.log('survey start stream entry:', surveyStart);
                break;
            }
          }
        }
      }
    }

    delete data.Records;  //cleanup and avoid recursions
    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
