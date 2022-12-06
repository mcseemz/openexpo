/**
 * check if some activities should be added by schedule, e.g. lotteries and surveys.
 * fetches env from environment variable
 * fetches data from env database
 *
 * incoming event format
 * {
    "version": "0",
    "id": "53dc4d37-cffa-4f76-80c9-8b7d4a4d2eaa",
    "detail-type": "Scheduled Event",
    "source": "aws.events",
    "account": "123456789012",
    "time": "2015-10-08T16:53:06Z",
    "region": "us-east-1",
    "resources": [
        "arn:aws:events:us-east-1:123456789012:rule/my-scheduled-rule"
    ],
    "detail": {}
}
 */
const poolUtil = require('./model/pool');
const util = require('./model/util');
const streamUtil = require('./model/stream');
const relationUtil = require('./model/relation');
const sponsorshipUtil = require('./model/sponsorship');
const activityUtil = require('./model/activity');
const eventUtil = require('./model/event');

const log = util.log;

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaScheduledActivities');

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByEnvironment(data['env'], context);

    try {

      //lotteries to activate
      let query = {
        text: `select r.*, e.status
               from relation r
                        join event e on r.subject_ref_id = e.id
               where subject_ref = 'event'
                 and r.operation = 'sponsor'
                 and e.status = 'active'
                 and (r.parameter::jsonb ? 'lottery')
                 and (r.parameter::jsonb #> '{lottery, active}')::bool = false
                 and (r.parameter::json #> '{lottery, start}')::text::date < now()`
      };

      console.log("REQUEST:", query);
      let res = await client.query(query);
      console.log("selected:", res.rows);

      if (res.rows.length) {
        console.log("nonzero rows");
        for (let idx in res.rows) {
          console.log(`now idx:  ${idx}`);
          let row = res.rows[idx];
          let logstring = {lambda_name: data["lambda_name"]};
          logstring['env'] = data['env'];
          logstring['entity'] = 'event';
          logstring['entity_id'] = row['subject_ref_id'];
          logstring['relationid'] = row['id'];
          logstring['activity_type'] = streamUtil.LOTTERY_START;
          logstring['lambda_status'] = 200;
          // log for packing
          log.error(logstring);  //stats output with definite delivery to Cloudwatch logs (marked as error)
          // update lottery status
          let relationParameter = row['parameter'];
          relationParameter[sponsorshipUtil.LOTTERY]['active'] = true;
          console.log("initiating update 1", relationParameter[sponsorshipUtil.LOTTERY]);
          await relationUtil.updateParameter(client, logstring['relationid'], relationParameter);
        }
      }
    } catch (err) {
      console.log("error", err)
    }

    //surveys to activate
    try {
      let query = {
        text: `select r.*, e.status
               from relation r
                        join event e on r.subject_ref_id = e.id
               where subject_ref = 'event'
                 and r.operation = 'sponsor'
                 and e.status = 'active'
                 and (r.parameter::jsonb ? 'survey')
                 and (r.parameter::jsonb #> '{survey, active}')::bool = false
                 and (r.parameter::json #> '{survey, start}')::text::date < now()`
      };

      console.log("REQUEST:", query);
      let res = await client.query(query);
      console.log("selected:", res.rows);

      if (res.rows.length) {
        for (let idx in res.rows) {
          console.log(`now idx:  ${idx}`);
          let row = res.rows[idx];
          let logstring = {lambda_name: data["lambda_name"]};
          logstring['env'] = data['env'];
          logstring['entity'] = 'event';
          logstring['entity_id'] = row['subject_ref_id'];
          logstring['relationid'] = row['id'];
          logstring['activity_type'] = streamUtil.SURVEY_START;
          logstring['lambda_status'] = 200;
          // log for packing
          log.error(logstring);  //stats output with definite delivery to Cloudwatch logs (marked as error)
          // update survey status
          let relationParameter = row['parameter'];
          relationParameter[sponsorshipUtil.SURVEY]['active'] = true;
          console.log("initiating update 1");
          await relationUtil.updateParameter(client, logstring['relationid'], relationParameter);
        }
      }
    } catch (err) {
      console.log("error", err)
    }

    //activity to start
    try {
      const events = await eventUtil.getOngoingEvents(client);
      for (let event of events) {
        const activities = await activityUtil.getActivitiesUpcoming(client, event.id, activityUtil.AGENDA,
          ['stand_public', 'event_published', 'stand_promoted']);
        for (let activity of activities) {
          let logstring = {lambda_name: data["lambda_name"]};
          logstring['env'] = data['env'];
          logstring['entity'] = 'event';
          logstring['entity_id'] = event.id;
          logstring['activity_type'] = streamUtil.ACTIVITY_START;
          logstring['activityid'] = activity.id;
          logstring['lambda_status'] = 200;
          // log for packing
          log.error(logstring);  //stats output with definite delivery to Cloudwatch logs (marked as error)
        }
      }
    } catch (err) {
      console.log("error", err)
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
