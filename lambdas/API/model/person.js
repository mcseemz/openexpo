const exceptionUtil = require('./exception');
const util = require('./util');
const AWS = require('aws-sdk');
const poolUtil = require('./pool');

const defaultPageSize = 10;

const MESSENGER_TWITTER = 'twitter';
const MESSENGER_TELEGRAM = 'telegram';
const MESSENGER_WHATSAPP = 'whatsapp';

const PERSON_FIELDS =
   `p.id,
    p.name,
    p.surname,
    p.timezone,
    p.email,
    p.status,
    p.last_active,
    p.language,
    p.address`;

const PERSON_FIELDS_EXTENDED =
  `${PERSON_FIELDS},
    p.fields,
    p.tags,
    p.email_alias,
    pp.company,
    pp.role,
    pp.position`;

const SELECT_BASIC =
  `SELECT ${PERSON_FIELDS}
   FROM person p`;

const SELECT_EXTENDED =
  `SELECT ${PERSON_FIELDS_EXTENDED}
   FROM Person p
        LEFT JOIN personnel pp ON p.id = pp.person
        LEFT JOIN "role" r ON pp.role = r.id AND r.name IN ('company-owner', 'company-helper', 'company-staff')`;

const SELECT_EXTENDED_OWNER =
  `SELECT ${PERSON_FIELDS_EXTENDED}
   FROM Person p
        LEFT JOIN personnel pp ON p.id = pp.person
        LEFT JOIN "role" r ON pp.role = r.id AND r.name IN ('company-owner')`;


/**
 *
 * @param {Object} client
 * @param {string} userEmail. Expected to be trimmed
 * @param {boolean} isMe - if not checking for myself, remove personal data from response
 * @returns {Promise<null|Person>} null or data
 */
async function getPersonFromDB(client, userEmail, isMe) {
  const llog = client.log || util.log;

  if (!userEmail || userEmail.trim() === "") return null; //we have fake user with missing email, he cannot login

  let query = {
    text: `${SELECT_EXTENDED}
           WHERE LOWER(p.email) = LOWER($1) OR p.email_alias ? LOWER($1)`,
    values: [userEmail.toLowerCase().trim()]
  };

  llog.debug("REQUEST getPersonFromDB:", query);
  const userRes = await client.query(query);
  llog.debug("selected:", userRes.rows);
  if (userRes.rows.length === 0 || !userRes.rows[0]) {
    return null;
  } else {
    if (!isMe) {
      delete userRes.rows[0]['fields'];
      delete userRes.rows[0]['tags'];
    }
    delete userRes.rows[0]['email_alias'];

    client.userId = userRes.rows[0]['id'];
    return userRes.rows[0];
  }
}

async function getPersonFromDbOrThrowException(client, userEmail) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_BASIC}
           where LOWER(p.email) = LOWER($1) OR p.email_alias ? LOWER($1)`,
    values: [userEmail]
  };

  llog.debug('REQUEST getPersonFromDbOrThrowException: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);

  if (userRes.rows.length > 0) {
    client.userId = userRes.rows[0]['id'];
    return userRes.rows[0];
  }
  throw new exceptionUtil.ApiException(405, 'User not registered');
}

async function getPersonId(client, userEmail) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT id
           FROM Person
           where LOWER(email) = LOWER($1) OR email_alias ? LOWER($1)`,
    values: [userEmail]
  };

  llog.debug('REQUEST getPersonId: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);

  if (userRes.rows.length === 0 || !userRes.rows[0]) {
    return -1;
  } else {
    return userRes.rows[0]['id'];
  }
}

/**
 * Get person information for all the company owners
 * @param client - PG client
 * @param companyId - id of the company
 * @returns - array with person information or throws the exception if nothing had been found.
 */
async function getCompanyOwnersOrThrowException(client, companyId) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_EXTENDED_OWNER}
           WHERE pp.company = $1`,
    values: [Number(companyId)]
  };

  llog.debug('REQUEST getCompanyOwnersOrThrowException: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);
  if (userRes.rows.length === 0) {
    throw new exceptionUtil.ApiException(404, 'Company owners not found');
  } else {
    return userRes.rows;
  }
}

async function getPersonById(client, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_EXTENDED}
           WHERE p.id = $1`,
    values: [Number(userId)]
  };

  llog.debug('REQUEST getPersonById: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);
  if (userRes.rows.length === 0) {
    return null;
  } else {
    return userRes.rows[0];
  }
}

async function getPersonByIdOrThrowException(client, userId) {
  const llog = client.log || util.log;

  let query = {
    text: `${SELECT_EXTENDED}
           WHERE p.id = $1`,
    values: [Number(userId)]
  };

  llog.debug('REQUEST getPersonByIdOrThrowException: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);
  if (userRes.rows.length === 0) {
    throw new exceptionUtil.ApiException(405, 'User not registered');
  } else {
    return userRes.rows[0];
  }
}

async function updateUserInDbNoAddress(client, params) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE person SET name = $1, surname = $2, timezone = $3, language = $4, fields = $5, tags = $6::jsonb WHERE id = $7 RETURNING *',
    values: [params['name'] || '', params['surname'] || '', params['timezone'] ? Number(params['timezone']) : 0, params['language'] || '',
      params['fields'] || {}, JSON.stringify(params['tags']) || '[]', params['id']]
  };

  llog.debug('REQUEST updateUserInDb: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * update only address
 * @param client
 * @param personid
 * @param {Object} address json with address
 * @returns {Promise<*|null>}
 */
async function updateUserAddressInDb(client, personid, address) {
  const llog = client.log || util.log;

  const query = {
    text: 'UPDATE person SET address = $1 WHERE id = $2 RETURNING *',
    values: [address || {}, personid]
  };

  llog.debug('REQUEST updateUserAddressInDb: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows[0] : null;
}

async function createUserInDb(client, params) {
  const llog = client.log || util.log;

  const query = {
    text: `INSERT INTO person (email, name, surname, status) VALUES ( LOWER($1), $2, $3, $4 ) RETURNING *`,
    values: [params['email'], params['name'] || '---', params['surname'] || '---', 'incomplete']
  };

  llog.debug('REQUEST createUserInDb: ', query);
  let res = await client.query(query);
  llog.debug('created: ', res.rows[0]);

  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * update email_alias field with new alias to event
 * @param {Object} client
 * @param {number} userId
 * @param {string} emailAlias
 * @param {number} eventId
 * @returns {Promise<null|Person>}
 */
async function addUserEmailAlias(client, userId, emailAlias, eventId) {
  const llog = client.log || util.log;

  const query = {
    text: `UPDATE person set email_alias = email_alias || CONCAT('{"', $2::text, '": ', $3::int,' }')::JSONB
           WHERE id = $1 RETURNING *`,
    values: [Number(userId), emailAlias, Number(eventId)]
  };

  llog.debug('REQUEST addUserEmailAlias: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * update email_alias field by removing alias to event
 * @param {Object} client
 * @param {number} userId
 * @param {string} emailAlias
 * @returns {Promise<null|Person>}
 */
async function deleteUserEmailAlias(client, userId, emailAlias) {
  const llog = client.log || util.log;

  const query = {
    text: `UPDATE person set email_alias = email_alias - $2
           WHERE id = $1 RETURNING *`,
    values: [Number(userId), emailAlias]
  };

  llog.debug('REQUEST deleteUserEmailAlias: ', query);
  let res = await client.query(query);
  llog.debug(`updated: ${res.rows.length}`);

  return res.rows.length > 0 ? res.rows[0] : null;
}

function calculateOffset(recordsPerPage, pageNum) {
  return Number(recordsPerPage || defaultPageSize) * Number(pageNum || 0);
}

/**
 * Returns an array of persons who are participants in the event and correspond to the specified parameters
 * @param client - PG client
 * @param eventId - id of the event
 * @param pageNum - number of the current page
 * @param recordsPerPage - number of records per page
 * @param nameOrEmail - substring to search for a persons by first name, last name or email
 * @param status - array of suitable payment status
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function getEventAttendees(client, eventId, pageNum, recordsPerPage, nameOrEmail, status = []) {
  const llog = client.log || util.log;
  const offset = calculateOffset(recordsPerPage, pageNum);

  let query = {
    text: `SELECT p.email, p.name, p.surname, p.company, p.fields,
                  pr.access_price, pr.access_currency, ticket.payment_status, ticket.date_action, ticket.id as id, p.id as userid,
                  coalesce ((pr.parameter->>'manual_approval')::boolean, false) as manual_approval
           FROM ticket
                    left join person p on ticket.buyer = p.id
                    left join event_pricing pr on ticket.pricing = pr.id
           WHERE ticket.event = $1
             and (p.email ilike $2 or p.name ilike $2 or p.surname ilike $2)
             and ticket.payment_status = ANY ($3)
           ORDER BY ticket.date_action DESC
           OFFSET $4 LIMIT $5`,

    values: [Number(eventId), "%" + (nameOrEmail ? nameOrEmail.trim() : "") + "%", status, offset, Number(recordsPerPage || defaultPageSize)]
  };

  llog.debug('REQUEST getEventAttendees: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);

  return userRes.rows;
}

async function getEventAttendeesNumber(client, eventId) {
  const llog = client.log || util.log;

  let query = {
    text: `SELECT count(*) as num
           FROM Person p
                    left join ticket t on p.id = t.buyer
           where t.event = $1`,
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getEventAttendeesNumber: ', query);
  const userRes = await client.query(query);
  llog.debug(`fetched: ${userRes.rows.length}`);

  return userRes.rows.length ? userRes.rows[0]['num'] : 0;
}

/**
 * select id's of customers for mass mailing
 * will not work with very big audiences
 * @param {Object} client
 * @param {Number} eventId
 * @param {String[]} status
 * @returns {Promise<*>}
 */
async function getEventAttendeesChannelIds(client, eventId, status = []) {
  let query = {
    text: `SELECT p.address ->> 'telegram_id' as telegram_id, p.address ->> 'whatsapp_id' as whatsapp_id
           FROM ticket
                    left join person p on ticket.buyer = p.id
                    left join event_pricing pr on ticket.pricing = pr.id
           WHERE ticket.event = $1
             AND ticket.payment_status = ANY ($2)
             AND ((p.address -> 'telegram_id') IS NOT NULL OR (p.address -> 'whatsapp_id') IS NOT NULL)
           ORDER BY ticket.date_action DESC`,

    values: [Number(eventId), status]
  };

  client.log.debug('REQUEST getEventAttendeesChannelIds: ', query);
  const userRes = await client.query(query);
  client.log.debug(`fetched: ${userRes.rows.length}`);

  return userRes.rows;
}

/**
 * complex automation that<ul>
 * <li>registers email in Cognito</li>
 * <li>registers user in database</li>
 * <li>generates alias for transparent login</li>
 * <li>registers alias in Cognito</li>
 * <li>generates link for direct login</li>
 * </ul>
 * @param client
 * @param domain
 * @param eventId
 * @param email
 * @param name
 * @param surname
 * @returns {Promise<Person>} user record from db
 */
async function registerPersonForEvent(client, domain, eventId, email, name, surname) {
  const llog = client.log || util.log;
  email = email.toLowerCase().trim();

  //получить userpool
  const userPool = await poolUtil.getUserPoolFromEnvironment(process.env.Environment);
  llog.debug(`email: ${email}`);
  llog.debug(`userPool: ${userPool}`);

  let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
  let params = {
    UserPoolId: userPool, /* required */
    Username: email /* required */
  };

  //проверить email в cognito
  let response;
  try {
    response  = await cognitoidentityserviceprovider.adminGetUser(params).promise();
  } catch (err) {
    if (err.code === 'UserNotFoundException') {
      llog.debug(`user ${email} not found`);
    } else {
      throw err;
    }
  }

  llog.debug("response 1", response);

  if (!response) {
    //создать пользователя в когнито
    llog.debug(`creating user ${email}`);
    params = {
      UserPoolId: userPool, /* required */
      Username: email, /* required */
      DesiredDeliveryMediums: [ ],
      ForceAliasCreation: false,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'custom:domain', Value: domain },
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' }
      ],
      /*
    ,ValidationData: [
      {
        Name: 'STRING_VALUE', // required
        Value: 'STRING_VALUE'
      },
    ] */
    };

    response  = await cognitoidentityserviceprovider.adminCreateUser(params).promise();
    llog.debug("response 2", JSON.stringify(response));

    if (response && response.User && response.User.UserStatus === 'FORCE_CHANGE_PASSWORD') {
      llog.debug(`user ${email} created`);
    } else {
      throw `problem creating user ${email}`;
    }
  }

  //проверить email в базе
  let user2 = await getPersonFromDB(client, email, false);
  if (!user2) {
    //создать пользователя в базе
    user2 = await createUserInDb(client,
      {
        email:  email,
        name:   name,
        surname:surname
      });
  }
  //создать альяс email
  let emailAlias = calculateEmailAlias(eventId, email);
  llog.debug(`emailAlias: ${emailAlias}`);

  //проверить альяс в базе
  let userAlias = await getPersonFromDB(client, emailAlias, false);
  if (userAlias && userAlias.email !== email) { //конфликт альясов
    llog.error(`alias conflict happened on ${emailAlias}`);
  }
  else if (!userAlias) {  //еще нет в базе
    //добавить альяс в пользователя
    llog.debug(`adding alias to user ${user2['id']}, event ${eventId}`);

    userAlias = await addUserEmailAlias(client, user2['id'], emailAlias, eventId);
  }
  //проверить альяс в когнито
  params = {
    UserPoolId: userPool, /* required */
    Username: emailAlias /* required */
  };

  //проверить email в cognito
  response = null;
  try {
    response  = await cognitoidentityserviceprovider.adminGetUser(params).promise();
  } catch (err) {
    if (err.code === 'UserNotFoundException') {
      llog.debug(`cognito user with alias ${emailAlias} not found`);
    } else {
      throw err;
    }
  }

  //добавить альяс в когнито
  if (!response) {
    //создать пользователя в когнито
    llog.debug(`creating cognito user for alias ${emailAlias}`);
    params = {
      UserPoolId: userPool, /* required */
      Username: emailAlias, /* required */
      DesiredDeliveryMediums: [ ],
      ForceAliasCreation: false,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'custom:domain', Value: domain },
        { Name: 'custom:baseEmail', Value: email },
        { Name: 'email', Value: emailAlias },
        { Name: 'email_verified', Value: 'true' }
      ],
      /*
    ,ValidationData: [
      {
        Name: 'STRING_VALUE', // required
        Value: 'STRING_VALUE'
      },
    ] */
    };

    response  = await cognitoidentityserviceprovider.adminCreateUser(params).promise();
    llog.debug("response 4", JSON.stringify(response));

    if (response && response.User && response.User.UserStatus === 'FORCE_CHANGE_PASSWORD') {
      llog.debug(`user ${emailAlias} created`);
    } else {
      throw `problem creating user ${emailAlias}`;
    }
    //подтверждать не надо, он уже подтвержден
  }

  return userAlias;
}

/**
 * remove user email alias information cognito and database
 * @param client
 * @param eventId
 * @param email
 * @returns {Promise<void>}
 */
async function unregisterPersonForEvent(client, eventId, email) {
  const llog = client.log || util.log;
  email = email.toLowerCase().trim();

  //получить userpool
  const userPool = await poolUtil.getUserPoolFromEnvironment(process.env.Environment);
  llog.debug(`email: ${email}`);
  llog.debug(`userPool: ${userPool}`);

  //создать альяс email
  let emailAlias = calculateEmailAlias(eventId, email);
  llog.debug(`emailAlias: ${emailAlias}`);

  let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

  //удалить альяс из в cognito
  let response;
  try {
    response  = await cognitoidentityserviceprovider.adminDeleteUser({
      UserPoolId: userPool, /* required */
      Username: emailAlias /* required */
    }).promise();
  } catch (err) {
    if (err.code === 'UserNotFoundException') {
      llog.error(`user ${emailAlias} not found in cognito`);
    } else {
      throw err;
    }
  }

  //проверить альяс в базе
  let user3 = await getPersonFromDB(client, emailAlias, false);
  if (user3 && user3.email !== email) { //конфликт альясов
    llog.error(`alias conflict happened on ${emailAlias}`);
  }
  else if (user3) {  //user found
    //удалить альяс из базы
    llog.debug(`deleteing alias to user ${user3['id']}, event ${eventId}`);
    await deleteUserEmailAlias(client, user3['id'], emailAlias);
  }
}

/**
 * generate alias for email
 * @param {Number} eventId - event id
 * @param {String} email - user email
 */
function calculateEmailAlias(eventId, email) {
  //создать альяс email, версия 'a'
  let emailAlias = 'a-'+eventId+'-';
  emailAlias += util.hashCode(emailAlias+email);
  emailAlias += '-' + util.hashCode(email)+"@enter_your.domain";
  return emailAlias;
}

/**
 * add standardized link to transparent login for event or stand personnel
 * @param {Object} personnel object
 * @param {string} domain
 * @param {string|number} event identifier
 * @param {string} emailAlias
 * @returns {string}
 */
function generateDirectLinks(personnel, domain, event, emailAlias) {
  personnel['directLinkVisit'] = `https://${domain}/event/${event}/agenda?auth=challenge&email=${emailAlias}`;
  if (personnel['stand']) {
    personnel['directLinkManage'] = `https://${domain}/edit-stand/${personnel['stand']}?auth=challenge&email=${emailAlias}`;
  } else {
    personnel['directLinkManage'] = `https://${domain}/edit-event/${personnel['event']}?auth=challenge&email=${emailAlias}`;
  }
}

/**
 * check if user has email_alias for this event
 * @param client
 * @param {number} userId
 * @param {number} eventId
 * @returns {Promise<string|null>} email asial for current event, null otherwise
 */
async function getEmailAliasForEvent(client, userId, eventId) {
  const user = await getPersonByIdOrThrowException(client, userId);
  for (const property in user['email_alias']) {
    if (user['email_alias'][property] === eventId) {
      return property;
    }
  }
  return null;
}

/**
 * search by messenger name and username
 * @param client
 * @param messenger
 * @param username
 * @returns {Promise<*>}
 */
async function getPersonByMessengerUsername(client, messenger, username) {
  let query = {
    text: `${SELECT_BASIC}
           WHERE address->>'${messenger}' = $1`,
    values: [username]
  };

  client.log.debug('REQUEST getPersonByMessengerUsername: ', query);
  let res = await client.query(query);
  client.log.debug(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * postprocess pricing for a frontend. We protecting some fields
 * @param {Object} pricing object from DB
 */
function preparePersonForOutput(person) {
  person.address.telegram_id = !!person.address.telegram_id;
  person.address.whatsapp_id = !!person.address.whatsapp_id;
  person.address.twitter_id = !!person.address.twitter_id;

  delete person.email_alias;
  delete person.last_active;
}

exports.getPersonFromDB = getPersonFromDB;
exports.getPersonId = getPersonId;
exports.getPersonById = getPersonById;
exports.updateUserInDbNoAddress = updateUserInDbNoAddress;
exports.updateUserAddressInDb = updateUserAddressInDb;
exports.createUserInDb = createUserInDb;
exports.addUserEmailAlias = addUserEmailAlias;
exports.getPersonFromDbOrThrowException = getPersonFromDbOrThrowException;
exports.getPersonByIdOrThrowException = getPersonByIdOrThrowException;
exports.getCompanyOwnersOrThrowException = getCompanyOwnersOrThrowException;
exports.getEventAttendees = getEventAttendees;
exports.getEventAttendeesNumber = getEventAttendeesNumber;
exports.getEventAttendeesChannelIds = getEventAttendeesChannelIds;
exports.registerPersonForEvent = registerPersonForEvent;
exports.unregisterPersonForEvent = unregisterPersonForEvent;
exports.calculateEmailAlias = calculateEmailAlias;
exports.generateDirectLinks = generateDirectLinks;
exports.getEmailAliasForEvent = getEmailAliasForEvent;
exports.getPersonByMessengerUsername = getPersonByMessengerUsername;
exports.preparePersonForOutput = preparePersonForOutput;


exports.MESSENGER_TWITTER = MESSENGER_TWITTER;
exports.MESSENGER_TELEGRAM = MESSENGER_TELEGRAM;
exports.MESSENGER_WHATSAPP = MESSENGER_WHATSAPP;
