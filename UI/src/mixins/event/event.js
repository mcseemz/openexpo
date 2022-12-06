import { mapActions, mapGetters } from 'vuex';
import func from '../../others/functions.js';
import { Auth } from 'aws-amplify';
import store from '@/store';

import {expirationOptions} from '@/store/modules/enum';

let User = null;

export default {
  data() {
    return {

      eventObj: {
        id: '',
        name: '',
        customName: '',
        description_short: '',
        description_long: '',
        color: '#E5843D',
        colorSelected: false,
        company: 0,
        dateEnd: '',
        dateStart: '',
        category: '',
        video: '',
        tag: '',
        tags: [],
        langs: [],
        offline: false,
        online: true,
        address: '',
        timezone: '',
        status: '',
        featured: false,
        tagsList: [],
        userfields: [],
        translations: {},
        theme: 'default',
        hidden: [],
        showVisitorsCounter: false,
        externalTicketUrl: '',
        customNameWanted: false,
      },

      evtStringsExist: {},

      evtDownloadables: {
        exist: {},
        new: [],
        maps: {},
      },
      downloadablesLoaded: false,

      eventBranding: {
        templateCover: {
          new: [],
          url: '',
          cropped: false,
        },
        templateBanner: {
          new: [],
          url: '',
        },
        logo: {
          new: [],
          url: '',
        },
        mainContent: {
          new: [],
          url: '',
        },
        mainCarousel: {
          new: [
            {
              image: [],
              preview_url: false,
              index: 0,
            },
            {
              image: [],
              preview_url: false,
              index: 1,
            },
            {
              image: [],
              preview_url: false,
              index: 2,
            }
          ],
          exist: {},
          todelete: [],
        },
        exist: [],
        new:[],
        maps: {},
        carouselArr: [],
        fullCarouselArr: [],
      },

      evtDayList: [],
      evtItemDate: null,
      agenda: {
        sessions: [],
        toDelete: {}
      },
      tickets: {
        list: [],
        exist: null,
        toDelete: [],
      }


    }
  },
  beforeRouteEnter (to, from, next) {
    if (store.getters.isLinkedinSignin) {
      next();
    } else {
      Auth.currentAuthenticatedUser().then((data) => {
        if (data && data.signInUserSession) {
          User = data;
          next()
        } else {
          next();
        }
      }).catch((e) => {
        next();
      });
    }

  },
  methods: {
    ...mapActions([
      'updateEvent',
      'findUser',
      'apiGetEvent',
      'apiGetUEvent',
      'getCategories',
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
      'getPricing',
    ]),

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

      date.setUTCHours(time.split(":")[0]);
      date.setMinutes(time.split(":")[1]);

      return date.toISOString()

    },

    dateStringToDayList(item) {
      let dateFrom = new Date(item.start);
      let dateTo = new Date(item.end);

      const timezone = typeof this.eventObj.timezone !== 'string' ? parseFloat(this.eventObj.timezone.value) : parseFloat(this.eventObj.timezone);
      dateFrom.setHours(dateFrom.getHours() + timezone);
      dateTo.setHours(dateTo.getHours() + timezone);

      let fromH = dateFrom.getUTCHours() < 10 ? '0'+dateFrom.getUTCHours() : dateFrom.getUTCHours();
      let toH = dateTo.getUTCHours() < 10 ? '0'+dateTo.getUTCHours() : dateTo.getUTCHours();
      let fromM = dateFrom.getMinutes() < 10 ? '0'+dateFrom.getMinutes() : dateFrom.getMinutes();
      let toM = dateTo.getMinutes() < 10 ? '0'+dateTo.getMinutes() : dateTo.getMinutes();
      if (toH === '00') toH = 12;
      if (fromH === '00') fromH = 12;

      let labelFrom = fromH+':'+fromM+' am' ;
      if (dateFrom.getUTCHours() > 11) {
        let nhour = (fromH - 12) < 10 ? '0'+(fromH-12) : (fromH - 12);
        labelFrom = nhour+':'+fromM+' pm' ;
      }

      let labelTo = toH+':'+toM+' am' ;
      if (dateTo.getUTCHours() > 11) {
        let nhour = (dateTo.getUTCHours() - 12) < 10 ? '0'+(dateTo.getUTCHours()-12) : (dateTo.getUTCHours() - 12);
        labelTo = nhour+':'+toM+' pm' ;
      }

      return {
        edtDateVal: dateFrom,
        timeFrom: {
          label: labelFrom,
          value: fromH +':'+fromM,
        },
        timeTo: {
          label: labelTo,
          value: toH+':'+toM,
        },
        dateStart: '',
        dateEnd: '',
        oldvalStart: item.start,
        oldvalEnd: item.end,
        id: item.id
      }
    },



    dateStringToAgendaList(item) {
      let dateFrom = new Date(item.start);
      let dateTo = new Date(item.end);
      const timezoneName = this.eventObj.timezoneObj ? this.eventObj.timezoneObj.name : 'Africa/Cairo';
      dateFrom = new Date(dateFrom.toLocaleString('en-US', { timeZone: timezoneName }));
      dateTo = new Date(dateTo.toLocaleString('en-US', { timeZone: timezoneName }));

      let fromH = dateFrom.getHours() < 10 ? '0'+dateFrom.getHours() : dateFrom.getHours();
      let toH = dateTo.getHours() < 10 ? '0'+dateTo.getHours() : dateTo.getHours();
      let fromM = dateFrom.getMinutes() < 10 ? '0'+dateFrom.getMinutes() : dateFrom.getMinutes();
      let toM = dateTo.getMinutes() < 10 ? '0'+dateTo.getMinutes() : dateTo.getMinutes();
      if (toH === '00') toH = 12;
      if (fromH === '00') fromH = 12;

      let labelFrom = fromH+':'+fromM+' am' ;
      if (dateFrom.getHours() > 11) {
        let nhour = (fromH - 12) < 10 ? '0'+(fromH-12) : fromH;
        if (nhour === '00') nhour = 12;
        labelFrom = nhour+':'+fromM+' pm' ;
      }

      let labelTo = toH+':'+toM+' am' ;
      if (dateTo.getHours() > 11) {
        let nhour = (dateTo.getHours() - 12) < 10 ? '0'+(dateTo.getHours()-12) : dateTo.getHours();
        if (nhour === '00') nhour = 12;
        labelTo = nhour+':'+toM+' pm' ;
      }

      let format = '';
      let description = '';
      let sessionTitle = '';
      let stringExist = {

      };
      item.strings.forEach(str => {
        if (str.category == 'name') {
          sessionTitle = str.value;
          stringExist.name = str.id;
        }
        if (str.category == 'description_short') {
          format = str.value;
          stringExist.description_short = str.id;
        }
        if (str.category == 'description_long') {
          description = str.value;
          stringExist.description_long = str.id;
        }
      });



      let zoomPassword = '';
      let zoomMeeting = '';
      let twitchPassword = '';
      let twitchMeeting = '';
      let youtubeMeeting = '';
      let vimeoMeeting = '';
      let vimeoChat = '';
      let enableVimeoChat = false;
      let meetingUrl = '';
      let presenter = '';
      let attendees = [];
      let enableChat = false;
      let enableQA = false;
      let meetingType = {
        label: 'no_video',
        value: 'no_video'
      };
      if (item.value) {

        if (typeof item.value === 'string') {
          if (item.value.indexOf('presenter') != -1) {
            let jsonData = JSON.parse(item.value);
            meetingUrl = jsonData.meetingUrl;
            meetingType = jsonData.meetingType;
            enableChat = jsonData.enableChat;
            presenter = jsonData.presenter;
            if (presenter.logo) {
              presenter.logo = func.url_64x64('https://'+this.configs.binary+'/'+presenter.logo);
            }
          } else {
            meetingUrl = item.value;
          }
        } else {
          meetingUrl = item.value.meetingUrl;
          meetingType = item.value.meetingType;
          enableChat = item.value.enableChat;
          enableQA = item.value.enableQA;
          vimeoChat = item.value.vimeoChat;
          enableVimeoChat = item.value.enableVimeoChat;
          presenter = Object.assign({}, item.value.presenter);
          if (presenter.logo) {
            presenter.logo = func.url_64x64('https://'+this.configs.binary+'/'+presenter.logo);
          }
          attendees = item.value.attendees;
        }

        if (meetingType == 'youtube') {
          youtubeMeeting = meetingUrl;
        }
        if (meetingType == 'vimeo') {
          vimeoMeeting = meetingUrl;
        }

        if (meetingUrl && meetingUrl.indexOf('zoom.us') != -1) {
          let pass = meetingUrl.split('&pwd=')[1];
          let zoomIdPart = meetingUrl.split('zoom.us/wc/join/')[1];
          let zoomId = false;
          if (zoomIdPart) {
            zoomId = zoomIdPart.split('?prefer=0')[0];
          }

          if (zoomId) {
            zoomMeeting = zoomId;
          }
          if (pass) {
            zoomPassword = pass;
          }
        }

        if (meetingUrl && meetingUrl.indexOf('twitch.tv/?') != -1) {
          let twitchId = meetingUrl.split('twitch.tv/?channel=')[1];

          if (twitchId) {
            twitchMeeting = twitchId;
          }

        }

      }

      return {
        format: format,
        sessionTitle: sessionTitle,
        zoom: meetingUrl,
        zoomMeeting: zoomMeeting,
        zoomPassword: zoomPassword,
        twitchMeeting: twitchMeeting,
        twitchPassword: twitchPassword,
        meetingType: meetingType,
        meetingUrl: meetingUrl,
        glMeetingUrl: item.meetingUrl,
        youtubeMeeting: youtubeMeeting,
        vimeoMeeting: vimeoMeeting,
        vimeoChat: vimeoChat,
        enableVimeoChat: enableVimeoChat,
        enableChat: enableChat,
        enableQA: enableQA,
        presenter: presenter,
        attendees: attendees,
        prevPresenter: Object.assign({}, presenter),
        persons: [],
        date: {
          dateStart: dateFrom,
          dateEnd: dateTo,
          timeStart: {
            label: labelFrom,
            value: fromH +':'+fromM,
          },
          timeEnd: {
            label: labelTo,
            value: toH+':'+toM,
          },
        },
        tags: item.tags,
        meeting: item.meeting,
        dateStart: item.start,
        dateEnd: item.end,
        description: description,
        id: item.id,
        stringExist: stringExist,
        newStrings: [],
        oldStrings: [],
        customName: item.customName,
        profile: item.profile || '',
        playback: item.playback,
        records: item.records,
        sameStreamAs: item.sameStreamAs,
        branding: item.branding,
        thumbnailPlaceholder: '',
        pricingTags: item.tags.filter(tag => typeof tag === 'string' && tag.indexOf('pricing:') > -1),
        allowed: item.allowed,
        customNameWanted: item.customName?.indexOf('-gen') < 0,
      }
    },

    getFormattedEventCallback( response, callback ) {
      if ([404, 403].includes(response.data.statusCode)) {
        const errorType = response.data.statusCode === 404 ? 'notFound' : 'notPermitted'
        this.eventObj[errorType] = true;
        if (callback) {
          callback()
        };
        return false;
      }
      if ( response.data.statusCode == 200 ) {
        this.eventObj = response.data.body;
        this.eventObj.status = response.data.body.status;
        if (!this.eventObj.userfields) {
          this.eventObj.userfields = [];
        }
        if (!this.eventObj.theme) {
          this.eventObj.theme = 'default';
        }
        if (!this.eventObj.hidden) {
          this.eventObj.hidden = [];
        }
        this.eventObj.translations = {};

        for (var i = 0; i < this.eventObj.strings.length; i++) {
          let str = this.eventObj.strings[i];

          this.eventObj[str.category] = str.value;
          this.evtStringsExist[str.category] = str.id;
        }

        if (!this.eventObj.name) {
          this.eventObj.name = ''
        }
        this.eventObj.colorSelected = false;

        if (!this.eventObj.description_short) {
          this.eventObj.description_short = ''
        }

        if (!this.eventObj.description_long) {
          this.eventObj.description_long = ''
        }

        if (this.eventObj.customName.indexOf('-gen') < 0) {
          this.eventObj.customNameWanted = true;
        }

        this.eventObj.featured = false;
        this.eventObj.langs = [];
        for (var i = 0; i < this.eventObj.tags.length; i++) {
          let tag = this.eventObj.tags[i].split(':');
          if ( tag[0] == 'category' ) {
            this.eventObj.category = tag[1];
          }
          if ( tag[0] == 'color' ) {
            this.eventObj.color = tag[1];
            this.eventObj.colorSelected = true;
          }
          if ( tag[0] == 'show_visitors' ) {
            this.eventObj.showVisitorsCounter = tag[1] ? true : false;
          }
          if (this.eventObj.tags[i] == 'is:featured') {
            this.eventObj.featured = true;
          }
          if ( tag[0] == 'lang' ) {
            this.eventObj.langs.push(tag[1]);
          }
          if (tag[0] == 'tag') {
            if (!this.eventObj.tagsList) {
              this.eventObj.tagsList = [];
            }
            this.eventObj.tagsList.push({text: tag[1]});
          }
        }
        if (!this.eventObj.colorSelected) {
          this.eventObj.color = '#E5843D';
        }
        this.eventObj.tags = this.eventObj.tags.filter(tag => {
          return tag.split(':')[0] != 'tag';
        })

        if (this.eventObj.pricing.strings && this.eventObj.pricing.strings.length) {
          this.eventObj.pricing.strings.forEach(str => {

            this.eventObj.pricing[str['category']] = str['value'];

          });
        }

        this.eventObj.timezoneObj = this.eventTimezoneObj;

        this.getEventBranding();

        this.getEventDownloadables();

        const firstDay = response.data.body.dateStart;
        const lastDay = response.data.body.dateEnd;
        this.evtItemDate = func.calcDisplayDate(firstDay, lastDay, null, true, this.eventTimezoneObj.name);

        if (Auth.user || this.isLinkedinSignin) {
          this.getActivity({
             postType: 'event',
             id: response.data.body.id,
             type: 'working_schedule',
             callback: (resp) => {
               if (resp.data.statusCode == '200') {
                 resp.data.body.reverse().forEach(item => {
                   this.evtDayList.unshift(this.dateStringToDayList(item));
                 });
               }
             }
          });
        } else {
          this.getUActivity({
             postType: 'event',
             id: response.data.body.id,
             type: 'working_schedule',
             user: false,
             callback: (resp) => {               c
               if (resp.data.statusCode == '200') {
                 resp.data.body.reverse().forEach(item => {
                   this.evtDayList.unshift(this.dateStringToDayList(item));
                 });
               }
             }
          });
        }

        this.getUActivity({
           postType: 'event',
           id: response.data.body.id,
           type: 'agenda',
           user: Auth.user || this.isLinkedinSignin,
           callback: (resp) => {
              if (resp.data.statusCode == '200') {
                resp.data.body.reverse().forEach(item => {

                  this.agenda.sessions.unshift(this.dateStringToAgendaList(item));
                  this.agenda.sessions = this.agenda.sessions.sort((a,b) => (a.dateStart > b.dateStart) ? 1 : ((b.dateStart > a.dateStart) ? -1 : 0));
                });
              }

              if (callback) {
                callback();
              }

           }
        });

        if (Auth.user || this.isLinkedinSignin) {
          if(this.$route.name !== "editstand"){
            this.getPricing({
              id: response.data.body.id,
              callback: (response) => {
                if ( response.data.statusCode == 200 && response.data.body.length ) {
                  this.tickets.exist = response.data.body.sort((a,b) => (a.id < b.id) ? 1 : ((b.id < a.id) ? -1 : 0));
                  this.tickets.exist.forEach(item => {

                    const expiration = item['expiration'] || '';
                    const [duration=0, type=expirationOptions.NONE] = expiration.replace(/\'/g, '').split(/(\d+)/).filter(Boolean);
                    item['expirationDuration'] = duration; 
                    item['expirationType'] = this.expirationOptions.find(el=>el.value.startsWith(type.toUpperCase())); 

                    item.stringExist = {};

                    if ( item.strings && item.strings.length ) {
                      for (var i = 0; i < item.strings.length; i++) {
                        let str = item.strings[i];
                        item[str.category] = str.value;

                        item.stringExist[str.category] = str.id;
                      }

                      if (!item.name) {
                        item.name = '';
                      }

                      if (!item.description_short) {
                        item.description_short = '';
                      }

                      if (!item.description_long) {
                        item.description_long = '';
                      }
                    }

                    item.tagsList = item.tags.map(tag => {
                      return {
                        text: tag.replace('pricing:', '')
                      };
                    });

                    if (!item.hasOwnProperty('manualApproval')) {
                      item.manualApproval = false;
                    }
                  });
                }
              }
            });
          }
        }
        this.downloadablesLoaded = true;
      }
    },
    getFormattedEvent(id, callback) {
      if (Auth.user || this.isLinkedinSignin) {
        this.apiGetEvent({
          id: id,
          callback: (response) => {
            this.getFormattedEventCallback(response, callback)
          }
        });
      } else {
        this.apiGetUEvent({
          id: id,
          callback: (response) => {
            this.getFormattedEventCallback(response, callback)
          }
        });
      }


    },
    getEventBranding() {
      if ( this.eventObj.branding && this.eventObj.branding.length ) {

        this.eventObj.branding.forEach(item => {
          let baseUrl = this.configs.binary ? this.configs.binary : 'binary-dev.openexpo.com';

          let itemUrl = func.url_560x315('https://'+this.configs.binary+'/'+item.url);
          let itemUrl368x208 = func.url_368x208('https://'+this.configs.binary+'/'+item.url);
          let itemUrl302x211 = func.url_302x211('https://'+this.configs.binary+'/'+item.url);
          let itemFullUrl = func.url_560x315('https://'+this.configs.binary+'/'+item.url);

          this.eventBranding.exist.push(itemUrl);

          item.strings?.forEach(str => {

            if (str.category == 'description_long') {

              if (str.value == 'main_image') {
                this.eventBranding.templateCover.url = itemUrl;
                this.eventBranding.templateCover.url_368x208 = itemUrl368x208;
                this.eventBranding.templateCover.url_302x211 = itemUrl302x211;
                this.eventBranding.maps.templateCover = item.id;
              }
              if (str.value == 'banner_image') {
                this.eventBranding.templateBanner.url = itemUrl;
                this.eventBranding.maps.templateBanner = item.id;
              }
              if (str.value == 'logo_image') {
                this.eventBranding.logo.url = itemUrl368x208;
                this.eventBranding.maps.logo = item.id;
              }

              if (str.value == 'content_main_image') {
                this.eventBranding.mainContent.url = itemUrl;
                this.eventBranding.maps.mainContent = item.id;
              }

              if (str.value == 'content_carousel') {
                this.eventBranding.mainCarousel.exist[item.id] = itemUrl368x208;
                this.eventBranding.maps[item.id] = item.id;
                this.eventBranding.carouselArr.push(itemUrl368x208);
                this.eventBranding.fullCarouselArr.push(itemFullUrl);
                if (this.eventBranding.mainCarousel.new.length > 1) {
                  this.eventBranding.mainCarousel.new.pop();
                }
              }
            }
          });

          if (item?.url?.indexOf('/d-main_image') > -1) {
            this.eventBranding.templateCover.url = itemUrl;
            this.eventBranding.templateCover.url_368x208 = itemUrl368x208;
            this.eventBranding.templateCover.url_302x211 = itemUrl302x211;
            this.eventBranding.maps.templateCover = item.id;
          }
          if (item?.url?.indexOf('banner_image') > -1) {
            this.eventBranding.templateBanner.url = itemUrl;
            this.eventBranding.maps.templateBanner = item.id;
          }
          if (item?.url?.indexOf('logo_image') > -1) {
            this.eventBranding.logo.url = itemUrl368x208;
            this.eventBranding.maps.logo = item.id;
          }

          if (item?.url?.indexOf('content_main_image') > -1) {
            this.eventBranding.mainContent.url = itemUrl;
            this.eventBranding.maps.mainContent = item.id;
          }

          if (item?.url?.indexOf('content_carousel') > -1) {
            this.eventBranding.mainCarousel.exist[item.id] = itemUrl368x208;
            this.eventBranding.maps[item.id] = item.id;
            this.eventBranding.carouselArr.push(itemUrl368x208);
            this.eventBranding.fullCarouselArr.push(itemFullUrl);
            if (this.eventBranding.mainCarousel.new.length > 1) {
              this.eventBranding.mainCarousel.new.pop();
            }
          }
        });

      }
    },

    getEventDownloadables() {
      this.evtDownloadables.exist = {};
      this.evtDownloadables.maps = {};

      let exist = {};
      let maps = {};
      let index = 0;
      if (this.eventObj.standMaterials) {
        this.eventObj.standMaterials.forEach((item, i) => {

          this.getDownloadFileUrl({
            id: item.id,

            callback: (response) => {
              if (response.data.body.url) {

                exist[item.id] = {
                  url: response.data.body.url,
                };

                item.strings.forEach(str => {
                  if (str.category == 'description_long') {
                    exist[item.id].description = str.value;
                  }
                  if (str.category == 'name') {
                    exist[item.id].name = str.value;
                  }
                });

                if (!exist[item.id].name) {
                  exist[item.id].name = 'Noname';
                }
                exist[item.id].id = item.id;

                exist[item.id].size = Math.round(item.size/1024);
                exist[item.id].fileType = item.filetype
                maps[item.id] = true;
                exist[item.id].tags = item.tags.filter(tag => typeof tag === 'string' && tag.indexOf('pricing:') < 0);
                exist[item.id].pricingTags = item.tags.filter(tag => typeof tag === 'string' && tag.indexOf('pricing:') > -1);
                exist[item.id] = {
                  ...exist[item.id],
                  strings: item.strings,
                  ...func.parseFilmStrings(item.strings)
                }

                if ( (this.eventObj.standMaterials.length - 1) == index ) {
                  this.evtDownloadables.exist = exist;
                  this.evtDownloadables.maps = maps;
                }

                if (item.branding?.length) {
                  const thumbnail = item.branding.find(brand => brand.url.indexOf('upload_thumb') > -1);
                  if (thumbnail) {
                    exist[item.id].thumbnail = func.url_302x211('https://'+this.configs.binary+'/'+thumbnail.url);
                  }
                }

                index++;

                if (this.eventObj.standMaterials.length === index) {
                  this.downloadablesLoaded = true;
                }
              }
            }
          });
        });
      } else {
        this.downloadablesLoaded = true;
      }
    }
  },
  computed: {
    ...mapGetters([
      'getAuthUser',
      'getSignedIn',
      'getUser',
      'configs',
      'tr',
      'isLinkedinSignin'
    ]),
    isUserAuth() {
      let user = this.getUser;

      if (!user) {
        user = this.getAuthUser;
      }

      if (!user) {
         user = Auth.currentAuthenticatedUser();
      }

      return User || (this.getAuthUser && this.getSignedIn) || this.$store.getters.getUser || Auth.user || this.isLinkedinSignin;
    },
    eventTimezoneObj() {
      const timezone = this.eventObj.timezone;

      if (typeof timezone !== 'string') {
        return timezone.name;
      }

      const eventTimezone = func.getTimezoneList().find(item => item.value == timezone);
      return eventTimezone;
    },

    expirationOptions() {
      return Object.keys(expirationOptions).map(el=>({label:this.tr(`ticket_expiration_type_${el.toLowerCase()}`), value: expirationOptions[el]}));
    }
  }
}
