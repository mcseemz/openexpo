/**
 * @description Get events where user acts as an organizer (event personnel). lambdaUserGetEvents
 */
const validator = require('./model/validation');
const personUtil = require('./model/person');
const poolUtil = require('./model/pool');
const util = require('./model/util');
const exceptionUtil = require('./model/exception');
const standInvitationUtil = require("./model/standInvitation");
const personnelInvitationUtil = require("./model/personnelInvitation");
const stringUtil = require("./model/strings");
const permissionUtil = require("./model/permissions");
const confirmationUtil = require("./model/confirmation");
const companyUtil = require("./model/company");

function validateParams(params) {
  return (!params['userId'] || validator.isNumber(params['userId'])) &&
      !!params['language'] && validator.isValidLanguage(params['language']);
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaUserGetInvitations');

  let client = util.emptyClient;
  try {
    if (!validateParams(data)) {
      throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
    }

    client = await poolUtil.initPoolClientByOrigin(data['origin'], context);

    const user = await personUtil.getPersonFromDbOrThrowException(client, data['context']['email']);
    let email = user['email'];

    if (data['userId']) { //user override
      await permissionUtil.assertCanManageUserData(client, user['id']); //throws
      const user2 = await personUtil.getPersonById(client, data['userId']);
      if (!user2) {
        throw new exceptionUtil.ApiException(405, 'Invalid override id');
      }
      email = user2['email'];
    }

    const standinv = await standInvitationUtil.getInvitationsForUser(client, email);
    // const meetinginv = await confirmationUtil.getInvitationsForUser(client, email);
    const personnelInv = await personnelInvitationUtil.getInvitationsForEmail(client, email);

    const persCompany = [];
    const persEvent = [];
    const persStand = [];
    for (let persInv of personnelInv) {
      persInv['confirmations'] = {};
      persInv.strings = [];
      delete persInv.role;
      delete persInv.email_to;
      delete persInv.person_from;

      if (persInv['stand']) persStand.push(persInv);
      if (persInv['event']) persEvent.push(persInv);
      if (persInv['company']) {
        const company = await companyUtil.getCompanyById(client, persInv['company']);
        if (company) {
          persInv.name = company.name;
        }
        persCompany.push(persInv);
      }
    }

    //processing personnel invitation centrally
    const confirmations = await confirmationUtil.getConfirmationsForMultipleEntities(client, stringUtil.TYPE_PERSONNEL_INVITATION, personnelInv.map(x => x.id));
    for (let conf of confirmations) {
      delete conf.ref;
      delete conf.should_login;
      delete conf.action_link;
      delete conf.redirect_link;
      delete conf.expiration;
      personnelInv.find(x => x.id === conf['ref_id'])['confirmations'][conf.action] = conf;
    }

    if (standinv.length > 0) {
      for (let stand of standinv) {
        delete stand.email_to;
        delete stand.stand_owner_ok;
        delete stand.event_organiser_ok;
        delete stand.event_organiser;
        stand.strings = [];
      }
      const strings = await stringUtil.getStringsForMultipleEntities(client, stringUtil.TYPE_EVENT, standinv.map(x => x.event), data['language']);
      for (let str of strings) {
        if (str.category !== 'description_long') {
          standinv.find(x => x.event === str['ref_id'])['strings'].push(str);
        }
      }
    }
    if (persStand.length > 0) {
      const strings = await stringUtil.getStringsForMultipleEntities(client, stringUtil.TYPE_STAND, persStand.map(x => x.stand), data['language']);
      for (let str of strings) {
        if (str.category !== 'description_long') {
          persStand.find(x => x.stand === str['ref_id'])['strings'].push(str);
        }
      }
    }
    if (persEvent.length > 0) {
      const strings = await stringUtil.getStringsForMultipleEntities(client, stringUtil.TYPE_EVENT, persEvent.map(x => x.event), data['language']);
      for (let str of strings) {
        if (str.category !== 'description_long') {
          persEvent.find(x => x.event === str['ref_id'])['strings'].push(str);
        }
      }
    }
    if (persCompany.length > 0) {
      const strings = await stringUtil.getStringsForMultipleEntities(client, stringUtil.TYPE_COMPANY, persCompany.map(x => x.company), data['language']);
      for (let str of strings) {
        if (str.category !== 'description_long') {
          persCompany.find(x => x.company === str['ref_id'])['strings'].push(str);
        }
      }
    }

    let res = {
      stand_create: standinv,
      stand_personnel: persStand,
      event_personnel: persEvent,
      company_personnel: persCompany,
      event_visitor: []
    };

    return util.handle200(data, res);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
