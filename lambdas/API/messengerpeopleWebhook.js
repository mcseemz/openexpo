/**
 * @description Process webhook from messengerpeople
 * "request": {
 * 	  "id": null,
 * 	  "uuid": "c6659d82-75ad-432b-a32d-0537a1dc93d2",
 * 	  "sender": "158330137",
 * 	  "recipient": "cd2b2ea8-ff16-4b28-9aba-8a8510c84e54",
 * 	  "messenger": "TG",
 * 	  "messenger_id": "8_339326352",
 * 	  "payload": {
 * 	      "type": "text",
 * 	      "text": "/start",
 * 	      "user": {
 * 	          "id": "158330137",
 * 	          "name": "Vazindra",
 * 	          "image": null
 * 	      },
 * 	      "timestamp": 1663186086
 * 	  },
 * 	  "outgoing": false,
 * 	  "statuscode": null,
 * 	  "result": null,
 * 	  "processed": null,
 * 	  "sent": null,
 * 	  "received": null,
 * 	  "read": null,
 * 	  "created": null
 * },
 */
const poolUtil = require('./model/pool');
const util = require("./model/util");
const exceptionUtil = require("./model/exception");
const externalParamsUtil = require('./model/externalParams');
const personUtil = require('./model/person');
const messengerpeopleUtil = require('./model/messengerpeople');
const {MESSENGER_TELEGRAM} = require("./model/person");

const env = process.env.Environment;
let secret; //Messengerpeople credentials
const secretName = env + '/messengerpeople';

exports.handler = async function(data, context) {
  util.handleStart(data, 'lambdaMessengerpeopleWebhook');

  if (!secret) {  //we consider credentials identical
    secret = JSON.parse(await externalParamsUtil.getSecret(secretName));
  }

  //normal request
  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByEnvironment(env, context);

    if (!data.request) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid parameters")
    }

    if (data.request.challenge && !data.request.verification_token) {
      throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid challenge parameters")
    }

    if (data.request.challenge && data.request.verification_token) {
      await messengerpeopleUtil.validateVerificationToken(data.request.verification_token);

      data["lambda_status"] = 200;
      return { challenge: data.request.challenge };
    }

    //identifying connection
    let messenger = data.request.messenger;
    const userid = data.request.sender;

    switch (messenger) {
      // (WB = WhatsApp, FB = Facebook, TW = Twitter, TG = Telegram)
      case "TG": messenger = MESSENGER_TELEGRAM; break;
      default: messenger = undefined;
    }

    client.log.debug(`messenger ${messenger} userid ${userid}`);

    //initiate binding
    if (data.request.payload.type === "text" && data.request.payload.text === '/start') {
      // find user by channel and username
      if (messenger) {
        let username = undefined;
        if (messenger === MESSENGER_TELEGRAM) {
          client.log.debug(`calling name resolve`);
          username = await messengerpeopleUtil.getTelegramUsernameById(client, userid);
        }

        client.log.debug(`username ${username}`);
        let persons = [];
        if (!username) {
          await messengerpeopleUtil.sendMessageById(client,
            'Sorry I am striggling to identify your username. Please contact admins to resolve this issue',
            userid, messenger);
        }
        else {
          persons = await personUtil.getPersonByMessengerUsername(client, messenger, '@' + username); //todo works only with telegam
        }

        let notified = false;
        // update user data with id, if requred
        for (let person of persons) {
          person.address[messenger + '_id'] = userid;
          await personUtil.updateUserAddressInDb(client, person.id, person.address);

          if (!notified) {
            let message = "Glad to see you, "+person.name + " " + person.surname;
            if (persons.length >1 ) {
              message += "\nLooks like you have several identites on our platform. We will update them all.";
            }
            await messengerpeopleUtil.sendMessage(client, person, message, messenger);
          }
         notified = true;
        }

        if (!notified) {
          await messengerpeopleUtil.sendMessageById(client,
            'Sorry, I cannot find you in our users. Make sure you saved username in your profile first.',
            userid, messenger);
        }
      }
    }
    else {
      await messengerpeopleUtil.sendMessageById(client,
        'Sorry, I cannot understand your message. I am just a bot, you know.',
        userid, messenger);
    }

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }

};
