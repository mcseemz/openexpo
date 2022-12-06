const roleUtils = require('./role');
const exceptionUtil = require('./exception');
const ticketsUtil = require('./ticket');
/**
 * Fetches user rights and searches for any of allowedGrants. If not found, throws an exception.
 * @param {Object} client - PG client
 * @param {number} companyId - id of the company
 * @param {number} userId - id of the user
 * @param {string[]} allowedGrants - list of grants with are checking against (if any of this list is present)
 * @param {number} eventId - id of the event for which we are checking (if applicable)
 * @param {number} standId - id of the stand for which we are checking (if applicable)
 * @param {boolean} silentReturn - if true, then just return false if user doesn't have rights, if false (default) - throw the exception
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function checkUserHasRights(client, companyId, userId, allowedGrants, eventId, standId, silentReturn = false) {
  const userGrants = await roleUtils.getMyGrants(client, companyId, userId, eventId, standId);
  const canPerformOperation = userGrants.some(r => allowedGrants.includes(r));

  if (!canPerformOperation) {
    if (!silentReturn) {
      throw new exceptionUtil.ApiException(403, 'You are not authorized to perform that operation');
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Checks if user has rights to edit the company details.
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanEditCompany(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-edit", "platform-access-company"]);
}

/**
 * Checks if user has rights to delete the company.
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanDeleteCompany(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-delete", "platform-access-company"]);
}

/**
 * Checks if user has rights to manage company personnel.
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageCompanyPersonnel(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-manage-staff", "platform-access-company"]);
}

/**
 * Checks if user has rights to manage company personnel.
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the user
 * @returns true if user has enough rights and false otherwise
 */
async function assertCanManageCompanyPersonnelSilent(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-manage-staff", "platform-access-company"], null, null, true);
}

/**
 * Checks if user has rights to create an event.
 * @param client - PG client
 * @param companyId - id of the user company
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanCreateAnEvent(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-create-event", "platform-access-event"]);
}

/**
 * Checks if user has rights to assign personnel to the event.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @param silent - do not throw an exception, return false instead
 * @returns nothing if everything is fine and throws exception otherwise (or false in case of silent mode enabled)
 */
async function assertCanAssignPersonnelToTheEvent(client, userId, eventId, silent = false) {
  return await checkUserHasRights(client, null, userId, ["event-manage-staff", "platform-access-event"], eventId, null, silent);
}

/**
 * Checks if user has rights to assign personnel to the stand.
 * @param client - PG client
 * @param userId - id of the user
 * @param standId - id of the stand for which we are checking
 * @param silent - do not throw an exception, return false instead
 * @returns nothing if everything is fine and throws exception otherwise (or false in case of silent mode enabled)
 */
async function assertCanAssignPersonnelToTheStand(client, userId, standId, silent = false) {
  return await checkUserHasRights(client, null, userId, ["stand-manage-staff", "platform-access-stand"], null, standId, silent);
}

/**
 * Checks if user has rights to update event pricing.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageEventMoney(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-manage-money", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to invite users to create a stand for the event.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanInviteToCreateStandForEvent(client, userId, eventId, silentReturn) {
  return await checkUserHasRights(client, null, userId, ["event-invite-stand", "platform-access-event"],
    eventId, null, silentReturn);
}

/**
 * Checks if user has rights to update event.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanUpdateEvent(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-edit", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to update stand.
 * @param {Object} client - PG client
 * @param {number} userId - id of the user
 * @param {number} standId - id of the stand for which we are checking
 * @param {boolean} silentReturn - id of the stand for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanUpdateStand(client, userId, standId, silentReturn = false) {
  return await checkUserHasRights(client, null, userId, ["stand-edit", "platform-access-stand"],
    null, standId, silentReturn);
}

/**
 * Checks if user has rights to operate event chats.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanViewAndOperateEventChats(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-use-chat", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to operate archive event chats.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanArchiveEventChats(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-manage-chat", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to operate event chats.
 * @param client - PG client
 * @param userId - id of the user
 * @param standId - id of the stand for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanViewAndOperateStandChats(client, userId, standId) {
  return await checkUserHasRights(client, null, userId, ["stand-use-chat", "platform-access-stand"], null, standId);
}

/**
 * Checks if user has rights to be assigned to an event meeting as a presenter.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanBeMeetingPresenterForEvent(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-use-video", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to be assigned to a stand meeting as a presenter.
 * @param client - PG client
 * @param userId - id of the user
 * @param standId - id of the stand for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanBeMeetingPresenterForStand(client, userId, standId) {
  return await checkUserHasRights(client, null, userId, ["stand-use-video", "platform-access-event"], null, standId);
}

/**
 * Checks if user has rights to be manage company news.
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageCompanyNews(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-manage-news", "platform-access-company"]);
}

/**
 * Checks if user has rights to be manage event news.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageEventNews(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-manage-news", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to be manage stand news.
 * @param client - PG client
 * @param userId - id of the user
 * @param standId - id of the stand for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageStandNews(client, userId, standId) {
  return await checkUserHasRights(client, null, userId, ["stand-manage-news", "platform-access-stand"], null, standId);
}

/**
 * Checks if user has rights to be manage company sponsorship.
 * @param client - PG client
 * @param companyId - id of the company
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageCompanySponsorship(client, companyId, userId) {
  return await checkUserHasRights(client, companyId, userId, ["company-manage-sponsorship", "platform-access-company"]);
}

/**
 * Checks if user has rights to be manage event sponsorship.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageEventSponsorship(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-manage-sponsorship", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to be manage event sponsorship.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageEventTickets(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-manage-tickets", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to view event reports.
 * @param client - PG client
 * @param userId - id of the user
 * @param eventId - id of the event for which we are checking
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanViewEventReports(client, userId, eventId) {
  return await checkUserHasRights(client, null, userId, ["event-view-report", "platform-access-event"], eventId);
}

/**
 * Checks if user has rights to manage user data.
 * @param client - PG client
 * @param userId - id of the user
 * @returns nothing if everything is fine and throws exception otherwise
 */
async function assertCanManageUserData(client, userId) {
  return await checkUserHasRights(client, null, userId, ["platform-access-event"]);
}

/**
 * Checks if user has global event access rights
 * @param client - PG client
 * @param userId - id of the user
 * @returns Promise<Boolean>
 */
async function assertIsPlatformEventAccess(client, userId) {
  return await checkUserHasRights(client, null, userId, ["platform-access-event"], null, null, true);
}

/**
 * Checks if user has global stand access rights
 * @param client - PG client
 * @param userId - id of the user
 * @returns true/false
 */
async function assertIsPlatformStandAccess(client, userId) {
  return await checkUserHasRights(client, null, userId, ["platform-access-stand"], null, null, true);
}


/**
 * Сhecks if the user has a ticket with access to the current content.
 * Access is determined by the presence of special tags
 * access to the object is allowed, unless the object has a special "pricing" tag 
 * and the ticket has a special "pricing" tag and they do not overlap
 * @param {Object} client - PG client
 * @param {number} userId - id of the user
 * @param  {string[]} tags - an array of content related tags
 * @returns {Promise<*>}
 */
async function assertUserHasTicketWithAccessToContent(client, userId=-1, eventId, standId, tags) {

  const pricingTags = Array.isArray(tags) ? tags.filter(tag => { return tag && tag.startsWith('pricing:'); }) : []

  if (!pricingTags.length) {
    return true;
  }

  let activePricingTags = [];
  if (standId) {
    activePricingTags = await ticketsUtil.getActivePricingTagsForUserAndEvent(client, userId, standId);
  }else if (eventId) {
    activePricingTags = await ticketsUtil.getActivePricingTagsForUserAndStand(client, userId, eventId);
  }
  
  if (!activePricingTags.length) {
    return true;
  }

  return activePricingTags.some(activeTag => {
    return pricingTags.includes(activeTag);
  });
}

/**
 * Add to each entity proprety "Allowed".
 * "Allowed" is determined by the presence of special tags
 * access to the object is allowed, unless the object has a special "pricing" tag 
 * and the ticket has a special "pricing" tag and they do not overlap
 * @param {Object} client - PG client
 * @param {number} event - event ids (optional)
 * @param {number} stand - stand ids (optional)
 * @param {Object[]} entities - array of entities with event and tags properties (collection, articles, activities etc.)
 * @param {number} userId - id of the user
 * @returns {Promise<*>}
 */
async function populateMultipleEntitiesWithAllowedProperty(client, event, stand, entities, userId=-1) {

  //trying to get all tags from purchased tickets. If the user is not logged in, then there will be an empty array
  let allTags = [];
  if (event){
    allTags = await ticketsUtil.getActivePricingTagsForUserAndEvent(client, userId, event);
  }else if (stand){
    allTags = await ticketsUtil.getActivePricingTagsForUserAndStand(client, userId, stand); 
  }

  entities.forEach(c => {
    //if the entity has a special tag, then we check for the presence
    // of the corresponding tag in the purchased tickets; otherwise it is allowed
    let allowed = true;
    if (c['event']){
      allowed = c['tags'].some((t) => t && t.startsWith('pricing:')) ?
      allTags.filter((el) => { return el['event'] === c['event'] })
        .reduce((result, el) => { return result || el['tags'].some((t) => c['tags'].includes(t)) }, false) : true;
    }else if (c['stand']){
      allowed = c['tags'].some((t) => t && t.startsWith('pricing:')) ?
      allTags.filter((el) => { return el['stand'] === c['stand'] })
        .reduce((result, el) => { return result || el['tags'].some((t) => c['tags'].includes(t)) }, false) : true;
    };
    c['allowed'] = allowed;
  });
}


exports.assertCanEditCompany = assertCanEditCompany;
exports.assertCanDeleteCompany = assertCanDeleteCompany;
exports.assertCanCreateAnEvent = assertCanCreateAnEvent;
exports.assertCanAssignPersonnelToTheEvent = assertCanAssignPersonnelToTheEvent;
exports.assertCanAssignPersonnelToTheStand = assertCanAssignPersonnelToTheStand;
exports.assertCanManageEventMoney = assertCanManageEventMoney;
exports.assertCanInviteToCreateStandForEvent = assertCanInviteToCreateStandForEvent;
exports.assertCanUpdateEvent = assertCanUpdateEvent;
exports.assertCanUpdateStand = assertCanUpdateStand;
exports.assertCanViewAndOperateEventChats = assertCanViewAndOperateEventChats;
exports.assertCanViewAndOperateStandChats = assertCanViewAndOperateStandChats;
exports.assertCanManageCompanyPersonnel = assertCanManageCompanyPersonnel;
exports.assertCanManageCompanyPersonnelSilent = assertCanManageCompanyPersonnelSilent;
exports.assertCanArchiveEventChats = assertCanArchiveEventChats;
exports.assertCanBeMeetingPresenterForEvent = assertCanBeMeetingPresenterForEvent;
exports.assertCanBeMeetingPresenterForStand = assertCanBeMeetingPresenterForStand;
exports.assertCanManageCompanyNews = assertCanManageCompanyNews;
exports.assertCanManageEventNews = assertCanManageEventNews;
exports.assertCanManageStandNews = assertCanManageStandNews;
exports.assertCanManageEventSponsorship = assertCanManageEventSponsorship;
exports.assertCanManageEventTickets = assertCanManageEventTickets;
exports.assertCanManageCompanySponsorship = assertCanManageCompanySponsorship;
exports.assertCanViewEventReports = assertCanViewEventReports;
exports.assertCanManageUserData = assertCanManageUserData;
exports.assertIsPlatformEventAccess = assertIsPlatformEventAccess;
exports.assertIsPlatformStandAccess = assertIsPlatformStandAccess;
exports.assertUserHasTicketWithAccessToContent = assertUserHasTicketWithAccessToContent;
exports.populateMultipleEntitiesWithAllowedProperty = populateMultipleEntitiesWithAllowedProperty;
