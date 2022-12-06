
const NEWS_ADD = "news_add";
const STAND_ADD = "stand_add";
const STAND_LEFT = "stand_left";
const ACTIVITY_ADD = "activity_add";
const ACTIVITY_START = "activity_start";
const PRICING_CHANGE = "pricing_change";
const DOCUMENT_ADD = "document_add";
const LOTTERY_START = "lottery_start";
const SURVEY_START = "survey_start";


async function createStreamEntry(client, entity, entityId, action, subject, subjectId, parameter) {
  const query = {
    text: 'INSERT into stream (object_ref, object_ref_id, action, subject_ref, subject_ref_id, parameter) VALUES ($1, $2, $3, $4, $5, $6) returning *',
    values: [entity, Number(entityId), action, subject, subjectId, parameter]
  };

  console.log("REQUEST:", query);

  const res = await client.query(query);
  console.log("created:", res.rows);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function getFreshStreamEntries(client, type) {
  const query = {
    text: `select *
           from stream
           where action_date = $1
             and action = $2
           order by created`,
    values: [new Date(), type]
  };

  console.log("REQUEST:", query);
  const {rows} = await client.query(query);
  console.log("selected:", rows);

  if (rows.length > 0) {
    return rows;
  } else {
    return [];
  }
}


exports.createStreamEntry = createStreamEntry;
exports.getFreshStreamEntries = getFreshStreamEntries;
exports.NEWS_ADD = NEWS_ADD;
exports.STAND_ADD = STAND_ADD;
exports.STAND_LEFT = STAND_LEFT;
exports.ACTIVITY_ADD = ACTIVITY_ADD;
exports.ACTIVITY_START = ACTIVITY_START;
exports.PRICING_CHANGE = PRICING_CHANGE;
exports.DOCUMENT_ADD = DOCUMENT_ADD;
exports.LOTTERY_START = LOTTERY_START;
exports.SURVEY_START = SURVEY_START;