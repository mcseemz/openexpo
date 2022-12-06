/**
 * @description Stub for a payment gateway.
 */

exports.handler = async function (data, context) {
  return {
    statusCode: 200,
    body: {
      "id": "0VF52814937998046",
      "status": "AUTHORIZED",
      "amount": {
        "total": "10.99",
        "currency": "USD"
      },
      "invoice_id": "INVOICE-123",
      "seller_protection": {
        "status": "ELIGIBLE",
        "dispute_categories": [
          "ITEM_NOT_RECEIVED",
          "UNAUTHORIZED_TRANSACTION"
        ]
      },
      "expiration_time": "2017-10-10T23:23:45Z",
      "create_time": "2017-09-11T23:23:45Z",
      "update_time": "2017-09-11T23:23:45Z",
      "links": [
        {
          "rel": "self",
          "method": "GET",
          "href": "https://api.paypal.com/v2/payments/authorizations/0VF52814937998046"
        },
        {
          "rel": "capture",
          "method": "POST",
          "href": "https://api.paypal.com/v2/payments/authorizations/0VF52814937998046/capture"
        },
        {
          "rel": "void",
          "method": "POST",
          "href": "https://api.paypal.com/v2/payments/authorizations/0VF52814937998046/void"
        },
        {
          "rel": "reauthorize",
          "method": "POST",
          "href": "https://api.paypal.com/v2/payments/authorizations/0VF52814937998046/reauthorize"
        }
      ]
    }
  };
};