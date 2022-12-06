/**
 *  @description Date module
 *  @class dateUtil
 */

 const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * slough off hours, minutes, seconds and milliseconds from date object
 * @param {Date} date  - date
 * @returns {Date} date
 */
function purifyDate(date) {
  let resultDate = new Date(date);

  resultDate.setHours(0);
  resultDate.setMinutes(0);
  resultDate.setSeconds(0);
  resultDate.setMilliseconds(0);

  return resultDate;
}

/**
 * slough off hours, minutes, seconds and milliseconds from date object
 * @param {Date} date  - date
 * @returns {Date} date
 */
function purifyDateSeconds(date) {
  let resultDate = new Date(date);

  resultDate.setSeconds(0);
  resultDate.setMilliseconds(0);

  return resultDate;
}

/**
 * slight hack for hours calculation on a date
 * @param {number} h hours to add
 * @returns {Date}
 */
Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
}

/**
 * add specified number of days to specified date
 * @param {Date} date - date
 * @param {Number} days - number of days
 * @returns {Object} date
 */
function addDays(date, days) {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 *
 * @param {Date} date
 * @param {Number} months
 * @returns {*}
 */
function addMonths(date, months) {
  var d = date.getDate();
  date.setMonth(date.getMonth() + +months);
  if (date.getDate() != d) {
    date.setDate(0);
  }
  return date;
}

/**
 * calculates the number of days between two dates
 * for correct calculation, the first parameter is an earlier date
 * @param {Date} firstDate - date
 * @param {Date} secondDate - date
 * @returns {Number} days
 */
function diffDays(firstDate, secondDate) {
  let start = new Date(firstDate);
  let end = new Date(secondDate);
  
  return Math.round(Math.abs((purifyDate(end) - purifyDate(start)) / ONE_DAY));
}

/**
 * check that the start date is earlier than the end date  
 * @param {Date} startDate - start date
 * @param {Date} endDate - end date
 * @returns {Boolean} true if start date NOT after end date
 */
function dateIsNotAfter(startDate, endDate) {
  let start = new Date(startDate);
  let end = new Date(endDate);

  return purifyDate(start) <= purifyDate(end);
}

/**
 * compare first and second dates and return 'True' if they are equal
 * comparison is limited to the day of the month (i.e. hours, minutes, etc. are not counted) 
 * @param {Date} firstDate 
 * @param {Date} secondDate 
 * @returns {Boolean} true if dates are equal
 */
function datesAreEqual(firstDate, secondDate) {
  let start = new Date(firstDate);
  let end = new Date(secondDate);

  return purifyDate(start).getTime() === purifyDate(end).getTime();
}

exports.addDays = addDays;
exports.addMonths = addMonths;
exports.diffDays = diffDays;
exports.dateIsNotAfter = dateIsNotAfter;
exports.datesAreEqual = datesAreEqual;
exports.purifyDate = purifyDate;
exports.purifyDateSeconds = purifyDateSeconds;
