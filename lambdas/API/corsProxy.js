/**
 * @description Return CORS for event
 */

exports.handler = function (event, context) {
  const responseCode = 200;

  //TODO надо допилить, чтобы реагировал на dev и prod origin, и выдавал правильные CORS
  const response = {
    statusCode: responseCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Accept,language,Authorization,Referer,Sec-Fetch-Dest,User-Agent,Content-Type,Origin,X-Requested-With",
      "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT"
    },
    body: JSON.stringify(event)
  };

//  console.log(response);
  context.succeed(response);
}