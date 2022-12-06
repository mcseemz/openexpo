/**
 * @description Create lowlevel post
 */
const poolUtil = require('./model/pool');
const util = require("./model/util");

exports.handler = async function(data, context) {
  util.handleStart(data, 'lambdaLowlevelPost');

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByApiDomain(data['headers']['Host'], context);

    var tablename;
    var fields = "";
    var values = "";

    Object.keys(data.body).forEach(function(key) {
      var value = data.body[key];
      if (key == 'table') {
        tablename = value;
      }
      else if (key.endsWith("_s")) {
        fields += ", " + key.substring(0, key.length - 2);
        values += ", \'" + value + "\'";
      }
      else if (key.endsWith("_i")) {
        fields += ", " + key.substring(0, key.length - 2);
        values += ", " + value;
      }
    });

    //TODO not safe SQL parameter. Enable request validation!
    const request = "INSERT INTO " + tablename + " (" + fields.substring(2) + ") VALUES ( " + values.substring(2) + ") RETURNING *";

    client.log.debug("REQUEST:", request)
    const res = await client.query(request);
    client.log.debug("found:", res.rows[0])

    return util.handle200(JSON.stringify(res.rows[0]));
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }

};
