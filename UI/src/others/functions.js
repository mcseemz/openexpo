import store from '@/store'

import { mapActions, mapGetters } from 'vuex';
import { I18n } from 'aws-amplify';
import datepicker_lang from './datepicker_lang.js';
import configs from '@/../configs';

import TextRenderer from 'mobiledoc-dom-renderer';

export default {
  ...mapActions([
    'getDownloadFileUrl',
    'getUApi',
  ]),
  deleteСookie(name) {
    let origin = window.location.hostname.replace('www.', '');

    if (origin != 'localhost') {
      let originArray = origin.split('.');
      if (originArray[0] == 'openexpo') {
        origin = '.'+origin;
      } else {
        originArray.shift();
        origin = '.'+originArray.join('.');
      }
    }

    document.cookie = name +'=; Path=/; domain='+origin+'; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  },
  getTimezoneList() {

    return [
       { value: -12, label: "GMT -12:00", name: "Etc/GMT+12", abbr: "BIT" },
       { value: -11, label: "GMT -11:00", name: "Etc/GMT+11", abbr: "NUT" },
       { value: -10, label: "GMT -10:00", name: "Pacific/Honolulu", abbr: "HST" },
       { value: -9, label: "GMT -9:00", name: "Pacific/Gambier", abbr: "GIT" },
       { value: -8, label: "GMT -8:00", name: "Etc/GMT+8", abbr: "PST" },
       { value: -7, label: "GMT -7:00", name: "America/Dawson", abbr: "PDT" },
       { value: -6, label: "GMT -6:00", name: "America/Belize", abbr: "CST" },
       { value: -5, label: "GMT -5:00", name: "America/Bogota", abbr: "CDT" },
       { value: -4, label: "GMT -4:00", name: "America/Antigua", abbr: "EDT" },
       { value: -3.5, label: "GMT -3:30", name: "America/St_Johns", abbr: "NT" },
       { value: -3, label: "GMT -3:00", name: "America/Argentina/Buenos_Aires", abbr: "ADT" },
       { value: -2, label: "GMT -2:00", name: "America/Noronha", abbr: "BRST" },
       { value: -1, label: "GMT -1:00", name: "Atlantic/Cape_Verde", abbr: "EGT" },
       { value: 0, label: "GMT +0:00", name: "Africa/Abidjan", abbr: "GMT" },
       { value: 1, label: "GMT +1:00", name: "Africa/Algiers", abbr: "CET" },
       { value: 2, label: "GMT +2:00", name: "Africa/Cairo", abbr: "EET" },
       { value: 3, label: "GMT +3:00", name: "Europe/Moscow", abbr: "MSK" },
       { value: 3.5, label: "GMT +3:30", name: "Asia/Tehran", abbr: "IRST" },
       { value: 4, label: "GMT +4:00", name: "Asia/Yerevan", abbr: "GET" },
       { value: 4.5, label: "GMT +4:30", name: "Asia/Kabul", abbr: "AFT" },
       { value: 5, label: "GMT +5:00", name: "Asia/Aqtobe", abbr: "PKT" },
       { value: 5.5, label: "GMT +5:30", name: "Asia/Colombo", abbr: "SLST" },
       { value: 5.75, label: "GMT +5:45", name: "Asia/Kathmandu", abbr: "NPT" },
       { value: 6, label: "GMT +6:00", name: "Asia/Almaty", abbr: "OMST" },
       { value: 7, label: "GMT +7:00", name: "Asia/Bangkok", abbr: "THA" },
       { value: 8, label: "GMT +8:00", name: "Asia/Irkutsk", abbr: "IRKT" },
       { value: 9, label: "GMT +9:00", name: "Asia/Chita", abbr: "KST" },
       { value: 9.5, label: "GMT +9:30", name: "Australia/Darwin", abbr: "ACST" },
       { value: 10, label: "GMT +10:00", name: "Australia/Brisbane", abbr: "AEST" },
       { value: 11, label: "GMT +11:00", name: "Asia/Magadan", abbr: "AEDT" },
       { value: 12, label: "GMT +12:00", name: "Asia/Anadyr", abbr: "FJT" }
    ]
  },
  dateToDatestring(date, time) {

    let hrs = 0;
    let mins = 0;
    if ( time ) {
      hrs = time.split(":")[0];
      mins = time.split(":")[1];
    }
    date.setUTCHours(hrs);
    date.setUTCMinutes(mins);

    return date.toISOString()
  },

  dayListToDatestring(date, time) {

    let year = date.getFullYear();
    let month = date.getMonth()+1;
    if (month < 10) {
      month = '0'+month;
    }
    let day = date.getDate();
    if (day < 10) {
      day = '0'+day;
    }

    if (time) {
      date.setUTCHours(time.split(":")[0]);
      date.setMinutes(time.split(":")[1]);
    }


    return date.toISOString()

  },

  addDataToEventList(eventList) {
    eventList.forEach((item, index) => {
      item.name = '';
      item.description_short = '';
      item.description_long = '';
      item.strings.forEach(str => {
        item[str.category] = str.value;
      });
      item.templateCoverUrl = '';
      item.logoUrl = '';
      item.mainContentUrl = '';
      item.carouselArr = [];

      item.languages = [];
      item.langList = [];
      item.tags.forEach(tag => {
        let tagArr = tag.split(':');
        if (tagArr[0] == 'lang') {
          item.languages.push(tagArr[1]);
          item.langList.push(tagArr[1]);
        }
      });
      item.langList = item.langList.join(', ');
      if (item.langList.length > 37) {
        item.langList = item.langList.substring(0, 37) + '...';
      }

    });

  },
  displaySingleData(date) {
    if (!date) { return false; }

    const month = datepicker_lang.months.full[date.getMonth()];
    const day = datepicker_lang.days.abbreviated[date.getDay()];
    const hours = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
    const minutes = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes();

    const shortString = `${day}, ${date.getDate()} ${month} ${date.getFullYear()}`;
    const longString = `${shortString} ${hours}:${minutes}`;

    return {
      short: shortString,
      long: longString
    }
  },
  calcDisplayDate(start, end, timezone, noUTC, tzName) {
    if (!start || !end) {
      return false;
    }
    let dateStart = new Date(start);
    let dateEnd = new Date(end);

    dateStart = noUTC ? new Date(dateStart.toLocaleString('en-US', { timeZone: tzName })) : dateStart;
    dateEnd = noUTC ? new Date(dateEnd.toLocaleString('en-US', { timeZone: tzName })) : dateEnd;

    const getMonth = noUTC ? 'getMonth' : 'getUTCMonth';
    const getDay = noUTC ? 'getDay' : 'getUTCDay';
    const getHours = noUTC ? 'getHours' : 'getUTCHours';
    const getMinutes = noUTC ? 'getMinutes' : 'getUTCMinutes';
    const getDate = noUTC ? 'getDate' : 'getUTCDate';
    const getFullYear = noUTC ? 'getFullYear' : 'getUTCFullYear';


    const startMonth = datepicker_lang.months.abbreviated[dateStart[getMonth]()];
    const startMonthFull = datepicker_lang.months.full[dateStart[getMonth]()];
    const endMonth = datepicker_lang.months.abbreviated[dateEnd[getMonth]()];
    const endMonthFull = datepicker_lang.months.full[dateEnd[getMonth]()];

    const startDay = datepicker_lang.days.abbreviated[dateStart[getDay]()];
    const endDay = datepicker_lang.days.abbreviated[dateEnd[getDay]()];

    const startHours = dateStart[getHours]() < 10 ? '0'+dateStart[getHours]() : dateStart[getHours]();
    const endHours = dateEnd[getHours]() < 10 ? '0'+dateEnd[getHours]() : dateEnd[getHours]();

    const startMinutes = dateStart[getMinutes]() < 10 ? '0'+dateStart[getMinutes]() : dateStart[getMinutes]();
    const endMinutes = dateEnd[getMinutes]() < 10 ? '0'+dateEnd[getMinutes]() : dateEnd[getMinutes]();

    let longString = `${startDay}, ${dateStart[getDate]()} ${startMonth} ${dateStart[getFullYear]()} ${startHours}:${startMinutes} - ${endDay}, ${dateEnd[getDate]()} ${endMonth} ${dateEnd[getFullYear]()} ${endHours}:${endMinutes} UTC ${timezone < 0 ? timezone : '+'+timezone}`;
    let mString = '';
    let dString = dateStart[getDate]();
    let startString = `${startDay}, ${dateStart[getDate]()} ${startMonth} ${dateStart[getFullYear]()}`;
    let endString = `${endDay}, ${dateEnd[getDate]()} ${endMonth} ${dateEnd[getFullYear]()}`;
    let agendaString = `${startDay}, ${dateStart[getDate]()} ${startMonthFull} ${dateStart[getFullYear]()} ${startHours}:${startMinutes} - `;
    const eventString = sameDay ? startString : `${startString} - ${endString}`;

    const sameDay = startMonth === endMonth && startDay === endDay;
    agendaString += sameDay ? `${endHours}:${endMinutes}` : `${endDay}, ${dateEnd[getDate]()} ${endMonthFull} ${dateEnd[getFullYear]()} ${endHours}:${endMinutes}`;

    if (dateStart[getMonth]() !== dateEnd[getMonth]()) {
      mString = datepicker_lang.months.abbreviated[dateStart[getMonth]()] + ' / ' + datepicker_lang.months.abbreviated[dateEnd[getMonth]()];
    } else {
      mString = datepicker_lang.months.abbreviated[dateStart[getMonth]()];
    }

    if (dateStart[getDate]() !== dateEnd[getDate]() || dateStart[getMonth]() !== dateEnd[getMonth]()) {
      const sdate = dateStart[getDate]() < 10 ? '0'+dateStart[getDate]() : dateStart[getDate]();
      const edate = dateEnd[getDate]() < 10 ? '0'+dateEnd[getDate]() : dateEnd[getDate]();
      dString = sdate+'-'+edate;
    } else {
      dString = dateStart[getDate]() < 10 ? '0'+dateStart[getDate]() : dateStart[getDate]();
    }

    return {
      longFormat: longString,
      startString: startString,
      agendaFormat: agendaString,
      month: mString,
      date: dString,
      eventString,
    }

  },

  url_560x315(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);
// return url;
    return p1+'.560x315'+p2;
  },
  url_538x315(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);

    return p1+'.538x315'+p2;
  },
  url_64x64(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);
// return url;
    return p1+'.64x64'+p2;
  },
  url_130x130(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);
return url;
    // return p1+'.64x64'+p2;
  },
  url_180x140(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);

    return p1+'.302x211'+p2;
  },
  url_368x208(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);
// return url;
    return p1+'.368x208'+p2;
  },
  url_302x211(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);

    return p1+'.302x211'+p2;
  },
  url_315x674(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);

    return p1+'.315x674'+p2;
  },

  url_40x40(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);
// return url;
    return p1+'.40x40'+p2;
  },

  url_212x180(url) {
    let strIndex = url.lastIndexOf('.');
    let p1 = url.slice(0, strIndex);
    let p2 = url.slice(strIndex);
// return url;
    return p1+'.212x180'+p2;
  },

  startPricing(event) {
    const currs = {
      'EUR': '€',
      'USD': '$'
    }

    if (event.pricing && event.pricing.access_price ) {

      if (currs[event.pricing.access_currency]) {
        return currs[event.pricing.access_currency]+event.pricing.access_price;
      } else {
        return '';
      }


    } else {
      return 'Free';
    }

  },
  dateLeft(event) {
    const start = new Date(event.dateStart);
    const end = new Date(event.dateEnd);
    const now = new Date();
    if (now > end) {
      return 'Past';
    } else if (now > start) {
      return 'Live';
    } else {
      const daysLeft = Math.trunc((start.getTime() - now.getTime())/1000/60/60/24);
      if (daysLeft !== 0) {
        return daysLeft !== 1 ? daysLeft+' days left' : daysLeft+' day left';
      } else {
        return 'Live'
      }

    }
    // return '2 days left';
    // return 'Past';
  },
  price(price, currency) {
    const currs = {
      'EUR': '€',
      'USD': '$'
    }
          console.log('!!!!!! CUR', currency);

    if (currency) {
      var symbol = currs[currency] ? currs[currency] : '€'
    } else {
      var symbol = configs && configs.currencySign ? configs.currencySign : '€'
    }

    return symbol + (+price).toFixed(2);
  },

  validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  },

  formatUserData(user) {
    let userObj = user;
    let userBranding = {
      logo: {
        new: [],
        url: '',
      },
      logo_preview_url: false,
      exist: [],
      new:[],
      maps: {},
    };

    if ( userObj.branding && userObj.branding.length ) {
      userObj.branding.forEach(item => {
        let baseUrl = configs.binary ? configs.binary : 'binary-dev.openexpo.com';
        let itemFullUrl = this.url_64x64('https://'+configs.binary+'/'+item.url);
        let itemBigUrl = this.url_130x130('https://'+configs.binary+'/'+item.url);
        userBranding.exist.push(itemFullUrl);
        item.strings?.forEach(str => {
          if (str.category == 'description_long' && str.value == 'logo_image') {
              userBranding.logo.url = itemFullUrl;
              userBranding.logo.big_url = 'https://'+configs.binary+'/'+item.url;
              userBranding.maps.logo = item.id;
          }
        });
        if (item.url.indexOf('logo_image') > -1) {
          userBranding.logo.url = itemFullUrl;
          userBranding.logo.big_url = 'https://'+configs.binary+'/'+item.url;
          userBranding.maps.logo = item.id;
        }
      });

    }
    return {
      userObj: userObj,
      userBranding: userBranding
    }
  },
  getArticlesData(item) {
    let art = item;
    if (item.strings && item.strings.length) {
      item.strings.forEach(str => {
        if (str.category == 'name') {
          art.articleTitle = str.value;
        }
        if (str.category == 'description_long') {
          art.mobileDocContent = str.value;
          var renderer = new TextRenderer({cards: []});
          var rendered = renderer.render(JSON.parse(str.value));
          const div = document.createElement('div');
          div.appendChild(rendered.result);
          art.articleContent = div.innerHTML;
        }
        if (str.category == 'description_short') {
          art.articleDescription = str.value;
        }
      });
    }
    art.articleBranding = this.getArticleBrandings(art);
    if (art.published) {
      const pDate = new Date(art.published);
      art.publishDate = pDate;
      const hours = pDate.getUTCHours() < 10 ? '0'+pDate.getUTCHours() : pDate.getUTCHours();
      const minutes = pDate.getUTCMinutes() < 10 ? '0'+pDate.getUTCMinutes() : pDate.getUTCMinutes();
      art.publishTime = hours+':'+minutes;


    } else {
      art.publishDate = null;
      art.publishTime = '';
    }
    return art;
  },
  getArticleBrandings(article) {
    let articleBranding = {
      articleCover: {
        new: [],
        url: '',
      },
      articleBanner: {
        new: [],
        url: '',
      },
      maps: {},
      exist: [],
    };
      if ( article.branding && article.branding.length ) {

        article.branding.forEach(item => {
          let itemUrl = this.url_560x315('https://'+configs.binary+'/'+item.url);

          articleBranding.exist.push(itemUrl);

          if (item.strings?.length) {
            item.strings.forEach(str => {

              if (str.category == 'description_long') {
                if (str.value == 'article_thumb') {
                  articleBranding.articleBanner.url = itemUrl;
                  articleBranding.maps.articleBanner = item.id;
                }

                if (str.value == 'article_banner') {
                  articleBranding.articleCover.url = itemUrl;
                  articleBranding.maps.articleCover = item.id;
                }
              }
            });
          }
          else if (item.url.indexOf('article_thumb')>=0) {
            articleBranding.articleBanner.url = itemUrl;
            articleBranding.maps.articleBanner = item.id;
          } else if (item.url.indexOf('article_banner')>=0) {
            articleBranding.articleCover.url = itemUrl;
            articleBranding.maps.articleCover = item.id;
          }
        });

      }

      return articleBranding;
  },

  getLocalUTCDate(date) {
    const myOffset = new Date().getTimezoneOffset();
    const myOffsetMS = myOffset*60000;

    let now = new Date(date);
    return new Date(now.getTime() + (myOffsetMS))
  },
  getTimezoneUTCDate(date, timezone) {
    const myOffset = new Date().getTimezoneOffset();
    const myOffsetMS = myOffset*60000;
    const timezoneOffset = timezone*60000*60;

    let resultDate = new Date(date);
    resultDate = new Date(resultDate.getTime() + (myOffsetMS));
    resultDate = new Date(resultDate.getTime() - timezoneOffset);
    return resultDate;
  },
  parseBrandings(event) {
    if ( event && event.branding && event.branding.length ) {

      event.branding.forEach(item => {
        let itemFullUrl = this.url_302x211('https://'+configs.binary+'/'+item.url);
        if (item.strings && item.strings.length) {
          item.strings.forEach(str => {
            if (str.category == 'description_long') {
              if (str.value == 'main_image') {
                event.templateCoverUrl = itemFullUrl;
              }
              if (str.value == 'logo_image') {
                event.logoUrl = itemFullUrl;
              }
              if (str.value == 'content_main_image') {
                event.mainContentUrl = itemFullUrl;
              }
              if (str.value == 'content_carousel') {
                event.carouselArr.push(itemFullUrl);
              }
            }
          });
        } else if (item.url.indexOf('main_image')>-1) {
          event.templateCoverUrl = itemFullUrl;
        } else if (item.url.indexOf('logo_image')>-1) {
          event.logoUrl = itemFullUrl;
        } else if (item.url.indexOf('content_main_image')>-1) {
          event.mainContentUrl = itemFullUrl;
        } else if (item.url.indexOf('content_carousel')>-1) {
          event.carouselArr.push(itemFullUrl);
        }

      });

    }

  },

  setDictionary(dict, callback) {
    if (configs.features.localization_placeholder) {
      dict['importLang']('en_GB').then((resp) => {
        const dicts = {};
        dicts[store.getters.getLocale] = resp.default;

        if (store.getters.getLocale == 'en_GB') {
          I18n.putVocabularies(dicts);
          callback();
        } else {
          dict['importLang'](store.getters.getLocale).then((resp) => {
            Object.assign(dicts[store.getters.getLocale], resp.default);
            I18n.putVocabularies(dicts);
            callback();
          });
        }
      });
    } else {
      dict['importLang'](store.getters.getLocale).then((resp) => {
        const dicts = {};
        dicts[store.getters.getLocale] = resp.default;
        I18n.putVocabularies(dicts);
        callback();
      });
    }

  },

  makeIdString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },
  arrayShuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  getUTCDateInCurrentTimezone(date) {
    const myOffset = new Date().getTimezoneOffset();
    const myOffsetMS = myOffset*60000;

    let now = new Date(date);
    return new Date(now.getTime() - (myOffsetMS))
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() < 9 ? `0${date.getMonth()+1}` : date.getMonth()+1;
    const day = date.getDate() < 10 ? '0'+date.getDate() : date.getDate();
    const hours = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
    const minutes = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes();

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  parseEventData(event) {
    const parsedData = {
      id: event.id
    };

    return {
      ...parsedData
    }
  },
  parseStandData(stand) {
    const  parsedData = {
      id: stand.id,
      title: '',
      cover:''
    };
    
    // getting name and description from localization
    const parsedStrings = this.parseStrings(stand.strings);
    if (parsedStrings.name) {
      parsedData.title = parsedStrings.name;  
    }
    // getting images from branding
     const content_main_image = stand.branding.find(el=> el.url && el.url.includes('main_image'));
    if (content_main_image) {
      parsedData.cover = this.url_368x208('https://'+configs.binary+'/'+content_main_image.url); 
    }
    return {
      ...parsedData,
      ...parsedStrings
    }
  },
  parseCollectionItem(item) {
    const parsedData = {
      id: item.id
    };

    // getting name and description from localization
    const parsedStrings = this.parseStrings(item.strings);

    // getting images from branding
    const parsedBranding = this.parseBranding(item.branding);

    return {
      ...parsedData,
      ...parsedStrings,
      ...parsedBranding,
    }
  },
  parseStrings(strings) {
    const result = {};
    strings?.forEach(string => {
      if (string.category === 'name') {
        result.name = string.value;
      }

      if (string.category === 'description_short') {
        result.descriptionShort = string.value;
      }

      if (string.category === 'description_long') {
        result.description = string.value;
      }
    });

    return result;
  },
  parseFilmStrings(strings) {
    const result = {};
    strings?.forEach(string => {
      if (string.category === 'description_short') {
        result.filmCast = string.value;
      }

      if (string.category === 'email_content') {
        result.filmLink = string.value;
      }

      if (string.category === 'about') {
        result.about = string.value;
      }

      if (string.category === 'date') {
        result.releaseDate = string.value;
      }
    });

    return result;
  },
  parseBranding(branding) {
    const result = {};
    branding?.forEach(brand => {
      // logo
      if (brand.description === 'logo_image') {
        result.logo = this.url_302x211('https://'+configs.binary+'/'+brand.url);
      }

      // cover
      if (['main_image', 'article_thumb'].includes(brand.description)) {
        result.cover = this.url_368x208('https://'+configs.binary+'/'+brand.url);
      }

      // banner
      if (['banner_image', 'article_banner'].includes(brand.description)) {
        result.banner = this.url_560x315('https://'+configs.binary+'/'+brand.url);
      }

      // thumbnail
      if (brand.url.indexOf('activity_thumb')>-1 || brand.url.indexOf('collection_thumb')>-1 || brand.url.indexOf('upload_thumb')>-1) {
        result.thumbnail = this.url_368x208('https://'+configs.binary+'/'+brand.url);
      }

      // hero
      if (brand.url.indexOf('collection_hero')>-1) {
        result.hero = this.url_560x315('https://'+configs.binary+'/'+brand.url);
      }
    });

    return result;
  },
}
