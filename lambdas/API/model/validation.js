const customNameutil = require('./customname');
const exceptionUtil = require('./exception');
const slugify = require('slugify');

function isValidLanguage(lang) {
  let languageValidator = new RegExp("^[a-z]{2}_[A-Z]{2}$");

  return languageValidator.test(lang) && [
    'af_za', 'sq_al', 'ar_dz', 'ar_bh', 'ar_eg', 'ar_iq', 'ar_jo', 'ar_kw', 'ar_lb', 'ar_ly', 'ar_ma', 'ar_om', 'ar_qa', 'ar_sa', 'ar_sy', 'ar_tn', 'ar_ae', 'ar_ye',
    'hy_am', 'cy_az_az', 'lt_az_az', 'eu_es', 'be_by', 'bg_bg', 'ca_es', 'zh_cn', 'zh_hk', 'zh_mo', 'zh_sg', 'zh_tw', 'zh_chs', 'zh_cht', 'hr_hr', 'cs_cz', 'da_dk',
    'div_mv', 'nl_be', 'nl_nl', 'en_au', 'en_bz', 'en_ca', 'en_cb', 'en_ie', 'en_jm', 'en_nz', 'en_ph', 'en_za', 'en_tt', 'en_gb', 'en_us', 'en_zw', 'et_ee', 'fo_fo',
    'fa_ir', 'fi_fi', 'fr_be', 'fr_ca', 'fr_fr', 'fr_lu', 'fr_mc', 'fr_ch', 'gl_es', 'ka_ge', 'de_at', 'de_de', 'de_li', 'de_lu', 'de_ch', 'el_gr', 'gu_in', 'he_il',
    'hi_in', 'hu_hu', 'is_is', 'id_id', 'it_it', 'it_ch', 'ja_jp', 'kn_in', 'kk_kz', 'kok_in', 'ko_kr', 'ky_kz', 'lv_lv', 'lt_lt', 'mk_mk', 'ms_bn', 'ms_my', 'mr_in',
    'mn_mn', 'nb_no', 'nn_no', 'pl_pl', 'pt_br', 'pt_pt', 'pa_in', 'ro_ro', 'ru_ru', 'sa_in', 'cy_sr_sp', 'lt_sr_sp', 'sk_sk', 'sl_si', 'es_ar', 'es_bo', 'es_cl',
    'es_co', 'es_cr', 'es_do', 'es_ec', 'es_sv', 'es_gt', 'es_hn', 'es_mx', 'es_ni', 'es_pa', 'es_py', 'es_pe', 'es_pr', 'es_es', 'es_uy', 'es_ve', 'sw_ke', 'sv_fi',
    'sv_se', 'syr_sy', 'ta_in', 'tt_ru', 'te_in', 'th_th', 'tr_tr', 'uk_ua', 'ur_pk', 'cy_uz_uz', 'lt_uz_uz', 'vi_vn'
  ].includes(lang.toLowerCase());
}

function isValidUrl(url) {
  let urlValidator = new RegExp("^(ftp|http|https):\\/\\/[^ \"]+$");
  return urlValidator.test(url);
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function isPositive(n) {
  return Number(n) > 0;
}

function isValidUploadCategory(cat) {
  return ['branding', 'binary', 'video', 'news', 'sponsor'].includes(cat);
}

/**
 * list of secondary entities that can have references in uploads
 * @param ref
 * @returns {boolean}
 */
function isValidUploadReference(ref) {
  return ['collection', 'upload', 'activity', 'news', 'sponsor','personnel'].includes(ref);
}


function isValidStandManagementOperation(cat) {
  return ['ban', 'unban', 'unpublish', 'archive', 'publish'].includes(cat);
}

function isValidNewsType(type) {
  return ['stand', 'event', 'company'].includes(type);
}

function isValidActivityStreamEntityType(type) {
  return ['stand', 'event'].includes(type);
}

function isValidNewsStatus(status) {
  return ['draft', 'published', 'deleted'].includes(status);
}

function isValidDateTime(date) {
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date);
}

function isValidDate(date) {
  return /\d{4}-\d{2}-\d{2}/.test(date);
}

function isDateInRange(toCheckStr, fromStr, toStr) {
  const d1 = new Date(Date.parse(toCheckStr));
  const from = new Date(Date.parse(fromStr));
  const to = new Date(Date.parse(toStr));

  d1.setMilliseconds(0);
  d1.setSeconds(0);
  d1.setMinutes(0);
  d1.setHours(0);

  to.setMilliseconds(0);
  to.setSeconds(0);
  to.setMinutes(0);
  to.setHours(0);

  from.setMilliseconds(0);
  from.setSeconds(0);
  from.setMinutes(0);
  from.setHours(0);

  return d1 >= from && d1 <= to;
}

function isInFuture(date) {
  const dateParsed = new Date(Date.parse(date));
  return dateParsed > Date.now();
}

function isTodayOrInFuture(date) {
  const dateParsed = new Date(Date.parse(date));
  return dateParsed >= Date.now();
}

function isTodayOrInPast(date) {
  const dateParsed = new Date(Date.parse(date));
  return dateParsed <= Date.now();
}

function isWithinThreeYears(date) {
  const years = 3;
  const dateParsed = new Date(Date.parse(date));
  const futureLimit = new Date(new Date().setFullYear(new Date().getFullYear() + years));
  return dateParsed <= futureLimit;
}

function isInCorrectOrder(firstDate, secondDate) {
  const firstDateParsed = new Date(Date.parse(firstDate))
  const secondDateParsed = new Date(Date.parse(secondDate))
  return firstDateParsed < secondDateParsed;
}

function isValidEmail(email) {
  const emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

  if (!email) return false;

  if (email.length > 256) return false;

  if (!emailRegex.test(email)) return false;

  const [account, address] = email.split('@');
  if (account.length > 64) return false;

  const domainParts = address.split('.');
  return !domainParts.some(function (part) {
    return part.length > 63;
  });
}

function isValidStatus(status) {
  return ['draft', 'active', 'inactive', 'cancelled', 'moderation', 'demo'].includes(status);
}

function isValidStandStatus(status) {
  return ['draft', 'published', 'inactive', 'cancelled', 'template'].includes(status);
}

function isValidType(type) {
  return ['category', 'timezone', 'language', 'country', 'industry'].includes(type);
}

function isValidRefType(type) {
  return ['stand', 'event', 'company', 'user', 'role', 'activity', 'dictionary', 'upload', 'pricing', 'collection', 'news'].includes(type);
}

function isValidStringCategory(category) {
  return ['description_short', 'description_long', 'about', 'name', 'date'].includes(category);
}

function isValidUserStatusType(type) {
  return ['incomplete', 'active', 'blocked', 'cancelled', 'anonymized'].includes(type);
}

function isValidRoleEntity(type) {
  return ['event', 'stand', 'company'].includes(type);
}

function isValidSponsorType(type) {
  return ['user', 'company'].includes(type);
}

function isValidNonEmptyString(str, sizelimit = 4000) {
  return !!str && str.trim().length > 0 && str.trim().length <= sizelimit;
}

function isValidNonEmptyLongString(str) {
  return !!str && str.trim().length > 0;
}

function isValidTimeZone(tz) {
  return !!tz && isNumber(tz) && Number(tz) > -15 && Number(tz) < 15;
}

function isValidTicketPaymentStatus(status) {
  return ['payed', 'not_payed', 'cancelled', 'refunded', 'archived', 'banned', 'archived'].includes(status);
}

function isValidPricingPlan(plan) {
  return ['split_stand_price', 'split_ticket_price', 'upfront_cost', 'free', 'sponsorship_price'].includes(plan);
}

function isValidUserEventType(type) {
  return ['visitor', 'organizer'].includes(type);
}

function isValidMeetingType(type) {
  return ['all', 'past', 'coming'].includes(type);
}

function isValidMessagingChannel(type) {
  return ['all', 'telegram', 'whatsapp'].includes(type);
}

function isValidChannelSelectorType(type) {
  return ['active', 'pending', 'closed', 'visitor', 'owner'].includes(type);
}

function isValidEventFilterType(type) {
  return ['featured', 'regular', 'all'].includes(type);
}

function isValidStandFilterStatus(type) {
  return ['draft', 'published', 'inactive', 'cancelled', 'all'].includes(type);
}

function isValidModerationResolution(type) {
  return ['accept', 'reject'].includes(type);
}

function isValidActivityVisibility(visibility) {
  return ['stand_internal', 'stand_public', 'stand_proposed', 'stand_promoted', 'stand_rejected', 'event_internal', 'event_published', 'cancelled', 'event_timeframe', 'private_meeting'].includes(visibility);
}

function isValidCustomField(value, fieldType, validation, allowedValues, length) {
  switch (fieldType) {
    case "String": {
      return value.length <= length && (!validation || validation.test(value));
    }
    case "Id": {
      return allowedValues.includes(value);
    }
    case "ListOfIds": {
      return value.every(v => allowedValues.includes(v));
    }
  }
}

/**
 * check for proper expiration value.
 * @param expiration format NN[m|d], like 30d or 1m
 * @returns {boolean} string is formatted properly
 */
function isValidPricingExpiration(expiration) {
  if (expiration.trim().isEmpty) return false;
  if (!expiration.endsWith("m") && !expiration.endsWith("d")) return false;
  if (!isNumber(expiration.substring(0,expiration.length-1))) return false;

  return true;
}

/**
 * Performs a name validation check. 
 * If a check is performed for an existing object then its type and id must be added to the exclude
 * @param client - PG client
 * @param customName - string to check as a custom name for the activity
 * @param {String} excludeType - name of the table to request check
 * @param {Number} excludeId  - id of the table to request check
 * @returns new default name or validated given name othervise throws exception
 */
async function getValidCustomNameOrThrowException(client, customName, excludeType, excludeId) {
  if (!!customName && customName.length > 0) {
    const clearName = slugify(customName, { remove: /[:]/g, trim: true });
    if (!isValidNonEmptyLongString(clearName) || !(await customNameutil.customNameIsAvailable(client, clearName, excludeType, excludeId))) {
      throw new exceptionUtil.ApiException(405, 'Custom name not available');
    }
    return clearName;
  } else {
    return customNameutil.getSubstituteName();
  }
}

exports.isValidLanguage = isValidLanguage;
exports.isNumber = isNumber;
exports.isValidUploadCategory = isValidUploadCategory;
exports.isValidUploadReference = isValidUploadReference;
exports.isValidStandManagementOperation = isValidStandManagementOperation;
exports.isValidDateTime = isValidDateTime;
exports.isValidDate = isValidDate;
exports.isDateInRange = isDateInRange;
exports.isInFuture = isInFuture;
exports.isWithinThreeYears = isWithinThreeYears;
exports.isInCorrectOrder = isInCorrectOrder;
exports.isValidEmail = isValidEmail;
exports.isValidStatus = isValidStatus;
exports.isValidType = isValidType;
exports.isValidRefType = isValidRefType;
exports.isValidStringCategory = isValidStringCategory;
exports.isValidNonEmptyString = isValidNonEmptyString;
exports.isValidStandStatus = isValidStandStatus;
exports.isValidTimeZone = isValidTimeZone;
exports.isValidTicketPaymentStatus = isValidTicketPaymentStatus;
exports.isValidPricingPlan = isValidPricingPlan;
exports.isPositive = isPositive;
exports.isValidUrl = isValidUrl;
exports.isValidUserEventType = isValidUserEventType;
exports.isValidChannelSelectorType = isValidChannelSelectorType;
exports.isValidEventFilterType = isValidEventFilterType;
exports.isValidStandFilterStatus = isValidStandFilterStatus;
exports.isValidModerationResolution = isValidModerationResolution;
exports.isValidUserStatusType = isValidUserStatusType;
exports.isValidRoleEntity = isValidRoleEntity;
exports.isValidMeetingType = isValidMeetingType;
exports.isValidMessagingChannel = isValidMessagingChannel;
exports.isValidNewsType = isValidNewsType;
exports.isValidNewsStatus = isValidNewsStatus;
exports.isTodayOrInFuture = isTodayOrInFuture;
exports.isValidNonEmptyLongString = isValidNonEmptyLongString;
exports.isTodayOrInPast = isTodayOrInPast;
exports.isValidActivityStreamEntityType = isValidActivityStreamEntityType;
exports.isValidSponsorType = isValidSponsorType;
exports.isValidActivityVisibility = isValidActivityVisibility;
exports.isValidCustomField = isValidCustomField;
exports.isValidPricingExpiration = isValidPricingExpiration;
exports.getValidCustomNameOrThrowException = getValidCustomNameOrThrowException;
