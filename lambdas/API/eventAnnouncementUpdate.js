/**
 * @description Store announcement for the event.
 * Send notification to all connected channels
 * @classdesc eventAnnouncementUpdate
 */

const poolUtil = require('./model/pool');
const validator = require('./model/validation');
const personUtil = require('./model/person');
const eventUtil = require('./model/event');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const permissionUtil = require('./model/permissions');
const messengerpeople = require('./model/messengerpeople');
const {STATUS_PAYED, STATUS_PERSONNEL} = require("./model/ticket");
const {MESSENGER_TELEGRAM, MESSENGER_WHATSAPP} = require("./model/person");
const stringsUtil = require("./model/strings");
 
 function validateParams(params) {
   return !!params['eventId'] && !!params['eventAnnouncement'] &&
   (!params['eventAnnouncement']['text'] || validator.isValidNonEmptyString(params['eventAnnouncement']['text'], 500));
 }

 exports.handler = async function (data, context) {
    util.handleStart(data, 'lambdaEventAnnouncementUpdate');

     let client = util.emptyClient;
    try {
        if (!validateParams(data)) {
          throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
        }

        client = await poolUtil.initPoolClientByOrigin(data['origin'], context);
    
        const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
        const event = await eventUtil.getEventFromDbOrThrowException(client, data['eventId']);
    
        await permissionUtil.assertCanUpdateEvent(client, user['id'], event['id']);

        const announcementText = data['eventAnnouncement']['text']?data['eventAnnouncement']['text']
          .replace(/(?:\r)/g, '\\r')
          .replace(/(?:\n)/g, '\\n')
          .replace(/(?:\")/g, '\\"')
          .replace(/(?:\')/g, '\\"')
          :'';

        const updatedAnnouncement = await eventUtil.updateEventAnnouncement(client, event['id'], announcementText);
        client.log.debug(`updatedAnnouncement length ${updatedAnnouncement.length}`, updatedAnnouncement);
        if (updatedAnnouncement && (announcementText.length > 0)) {

          let eventNameString = await stringsUtil.getStringsForEntity(client, 'event', event['id'], data['language']);
          eventNameString = eventNameString.find(s => s['category'] === 'name');
          eventNameString = '"' + (eventNameString ? eventNameString['value'] : 'Noname event') + '"';

          let message = "New announcement in event " + eventNameString + ":\n" + announcementText;

          let channels = await personUtil.getEventAttendeesChannelIds(client, event.id, [STATUS_PAYED, STATUS_PERSONNEL]);

          //TODO replace with SNS push, and separate lambda for delivery. We can hit lambda time limitations here.
          // we also should return ASAP tp user
          for (let channel of channels) {
            if (channel.telegram_id) {
              await messengerpeople.sendMessageById(client, message, channel.telegram_id, MESSENGER_TELEGRAM);
            }
            if (channel.whatsapp_id) {
              await messengerpeople.sendMessageById(client, message, channel.whatsapp_id, MESSENGER_WHATSAPP);
            }
          }
        }
      
        return util.handle200(data, updatedAnnouncement);
      } catch (err) {
        return util.handleError(data, err);
      } finally {
        util.handleFinally(data, client);
      }
 };
