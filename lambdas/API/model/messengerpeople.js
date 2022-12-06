/**
 * integration with messengerpeople API for sending messages
 * receiving is via messengerpeople*.js lambdas
 */

const exceptionUtil = require('./exception');
const externalParamsUtil = require("./externalParams");
const Axios = require('axios');
const {MESSENGER_TELEGRAM, MESSENGER_WHATSAPP} = require("./person");

const env = process.env.Environment;
let secret; //Messengerpeople credentials
const secretName = env + '/messengerpeople';

//we ignore errors, as some sessions may be stale. When sending massively, we will not break the batch because of it.
Axios.interceptors.response.use(function (response) {
  return response;
}, function (error) {
  return Promise.resolve(error);
});

async function validateVerificationToken(verificationToken) {
  if (!secret) {  //we consider credentials identical
    secret = JSON.parse(await externalParamsUtil.getSecret(secretName));
    if (!secret.bearer) throw new exceptionUtil.ApiError(exceptionUtil.InternalServerError, 'misconfiguration')
  }
  if (verificationToken !== secret.verificationToken) {
    throw new exceptionUtil.ApiError(exceptionUtil.Invalid, "invalid parameters for challenge")
  }
}

/**
 *
 * @param {Object} client
 * @param {Object} person
 * @param {String} message
 * @param {String} channel
 * @returns {Promise<void>}
 */
async function sendMessage(client, person, message, channel = undefined) {

  if (!secret) {  //we consider credentials identical
    secret = JSON.parse(await externalParamsUtil.getSecret(secretName));
    if (!secret.bearer) throw new exceptionUtil.ApiError(exceptionUtil.InternalServerError, 'misconfiguration')
  }

  const config = {
    headers: { Authorization: `Bearer ${secret.bearer}` }
  };

  let promises = [];

  if (person.address.telegram_id && secret.telegramIdentifier && (!channel || channel === MESSENGER_TELEGRAM)) {
    const bodyParameters = {
      identifier: secret.telegramIdentifier + ":" + person.address.telegram_id,
      payload : {
        text: message
      }
    };

    promises.push(Axios.post(
      'https://api.messengerpeople.dev/messages',
      bodyParameters,
      config
    ));
  }

  if (person.address.whatsapp_id && secret.whatsappIdentifier && (!channel || channel === MESSENGER_WHATSAPP)) {
    const bodyParameters = {
      identifier: secret.whatsappIdentifier + ":" + person.address.whatsapp_id,
      payload : {
        text: message
      }
    };

    promises.push(Axios.post(
      'https://api.messengerpeople.dev/messages',
      bodyParameters,
      config
    ));
  }

  const res = await Promise.all(promises);

  client.log.debug('sendMessage called: ', res.length);
}

/**
 * send message to specified id in specified channel
 * @param client
 * @param {String} message
 * @param {String} channelid
 * @param {String} channel identifier, MESSENGER_TELEGRAM or MESSENGER_WHATSAPP
 * @returns {Promise<void>}
 */
async function sendMessageById(client, message, channelid, channel) {
  let channelIdentifier;

  if (!secret) {  //we consider credentials identical
    secret = JSON.parse(await externalParamsUtil.getSecret(secretName));
    if (!secret.bearer) throw new exceptionUtil.ApiError(exceptionUtil.InternalServerError, 'misconfiguration')
  }
  if (channel === MESSENGER_TELEGRAM) channelIdentifier = secret.telegramIdentifier;
  if (channel === MESSENGER_WHATSAPP) channelIdentifier = secret.whatsappIdentifier;

  const config = {
    headers: { Authorization: `Bearer ${secret.bearer}` }
  };

  let promises = [];

  const bodyParameters = {
    identifier: channelIdentifier + ":" + channelid,
    payload : {
      text: message
    }
  };

  const res = await Axios.post(
    'https://api.messengerpeople.dev/messages',
    bodyParameters,
    config
  );

  client.log.debug(`sendMessage called: ${res.status} ${res.statusText}`, res.data);
}

async function getTelegramUsernameById(client, userid) {
  let channelIdentifier;

  if (!secret) {  //we consider credentials identical
    secret = JSON.parse(await externalParamsUtil.getSecret(secretName));
    if (!secret.bearer) throw new exceptionUtil.ApiError(exceptionUtil.InternalServerError, 'misconfiguration')
  }
  channelIdentifier = secret.telegramIdentifier;

  const config = {
    headers: { Authorization: `Bearer ${secret.bearer}` }
  };

  const res = await Axios.get(
    `https://api.messengerpeople.dev/channels/telegram/${channelIdentifier}/${userid}`,
    config
  );

  client.log.debug(`getTelegramUsernameById called: ${res.status} ${res.statusText}`, res.data);
  if (res.status === 200 && res.data && res.data.ok) {
    return res.data.result.user.username
  }
  else return undefined;
}

exports.validateVerificationToken = validateVerificationToken;
exports.sendMessage = sendMessage;
exports.sendMessageById = sendMessageById;
exports.getTelegramUsernameById = getTelegramUsernameById;
