import {mapActions, mapGetters} from 'vuex';
import func from '../others/functions.js';
import {Auth} from 'aws-amplify'

export default {
  data() {
    return {

      standObj: {

        name: '',
        company: null,
        description_short: '',
        description_long: '',
        color: '#E5843D',
        colorSelected: false,
        about: '',
        description: '',
        language: '',
        ownerId: null,
        event: 24,
        tags: [],
        tag: '',
        status: 'draft',
        featured: false,
        tagList: [],
        show_empty: false,
        chat_enable: true
      },

      standStringsExist: {},

      standDownloadables: {
        exist: [],
        new: []
      },
      standBranding: {
        templateCover: {
          new: [],
          url: '',
          cropped: false,
        },
        logo: {
          new: [],
          url: '',
          cropped: false,
        },
        templateBanner: {
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
        new: [],
        maps: {},
        carouselArr: [],
        fullCarouselArr: [],
      },

      standAgenda: {
        sessions: [],
        toDelete: {}
      },

    }
  },
  methods: {
    ...mapActions([
      'updateStand',
      'findUser',
      'apiGetStand',
      'apiGetUStand',
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
    ]),

    dayListToDatestring(date, time) {

      let year = date.getFullYear();
      let month = date.getMonth() + 1;
      if (month < 10) {
        month = '0' + month;
      }
      let day = date.getDate();
      if (day < 10) {
        day = '0' + day;
      }

      date.setUTCHours(time.split(":")[0]);
      date.setMinutes(time.split(":")[1]);

      return date.toISOString()

    },

    dateStringToAgendaList(item) {
      let dateFrom = new Date(item.start);
      let dateTo = new Date(item.end);

      let fromH = dateFrom.getUTCHours() < 10 ? '0' + dateFrom.getUTCHours() : dateFrom.getUTCHours();
      let toH = dateTo.getUTCHours() < 10 ? '0' + dateTo.getUTCHours() : dateTo.getUTCHours();
      let fromM = dateFrom.getMinutes() < 10 ? '0' + dateFrom.getMinutes() : dateFrom.getMinutes();
      let toM = dateTo.getMinutes() < 10 ? '0' + dateTo.getMinutes() : dateTo.getMinutes();

      let labelFrom = fromH + ':' + fromM + ' am';
      if (dateFrom.getUTCHours() > 11) {
        let nhour = (fromH - 12) < 10 ? '0' + (fromH - 12) : fromH;
        if (nhour === '00') nhour = 12;
        labelFrom = nhour + ':' + fromM + ' pm';
      }

      let labelTo = toH + ':' + toM + ' am';
      if (dateTo.getUTCHours() > 11) {
        let nhour = (dateTo.getUTCHours() - 12) < 10 ? '0' + (dateTo.getUTCHours() - 12) : dateTo.getUTCHours();
        if (nhour === '00') nhour = 12;
        labelTo = nhour + ':' + toM + ' pm';
      }

      let format = '';
      let description = '';
      let sessionTitle = '';
      let stringExist = {};
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
              presenter.logo = func.url_64x64('https://' + this.configs.binary + '/' + presenter.logo);
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
            presenter.logo = func.url_64x64('https://' + this.configs.binary + '/' + presenter.logo);
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
            value: fromH + ':' + fromM,
          },
          timeEnd: {
            label: labelTo,
            value: toH + ':' + toM,
          },
        },
        tags: item.tags,
        meeting: item.meeting,
        eventId: this.standObj.eventId,
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

    getFormattedStandCallback(response, callback) {

      if (response.data.statusCode == 404) {
        this.standObj.notFound = true;
        if (callback) {
          callback()
        }
        ;
        return false;
      }

      if (response.data.statusCode == 200) {
        this.standObj = response.data.body;
        this.standObj.status = response.data.body.status;

        if (!this.standObj.contacts) {
          this.standObj.contacts = {}
        }
        if (!this.standObj.contacts.email) {
          this.standObj.contacts.email = ''
        }

        for (var i = 0; i < this.standObj.strings.length; i++) {
          let str = this.standObj.strings[i];
          this.standObj[str.category] = str.value;

          this.standStringsExist[str.category] = str.id;
        }

        if (!this.standObj.name) {
          this.standObj.name = ''
        }

        if (!this.standObj.show_empty) {
          this.standObj.show_empty = false;
        }
        if (!this.standObj.chat_enable) {
          this.standObj.chat_enable = false;
        }
        this.standObj.colorSelected = false;

        if (!this.standObj.description_short) {
          this.standObj.description_short = ''
        }
        if (!this.standObj.description_long) {
          this.standObj.description_long = ''
        }

        this.standObj.featured = false;
        for (var i = 0; i < this.standObj.tags.length; i++) {
          let tag = this.standObj.tags[i].split(':');

          if (this.standObj.tags[i] == 'is:featured') {
            this.standObj.featured = true;
          }
          if (tag[0] == 'color') {
            this.standObj.color = tag[1];
            this.standObj.colorSelected = true;
          }
          if (tag[0] == 'tag') {
            if (!this.standObj.tagsList) {
              this.standObj.tagsList = [];
            }
            this.standObj.tagsList.push({text: tag[1]});
          }
        }

        if (!this.standObj.colorSelected) {
          this.standObj.color = '#E5843D';
        }

        this.standObj.tags = this.standObj.tags.filter(tag => {
          return tag.split(':')[0] != 'tag';
        })

        this.getStandBranding();

        if (Auth.user || this.isLinkedinSignin) {
          this.getStandDownloadables();
        }

        this.getUActivity({
          postType: 'stand',
          id: response.data.body.id,
          type: 'agenda',
          user: Auth.user || this.isLinkedinSignin,
          callback: (resp) => {
            if (resp.data.statusCode == '200') {
              resp.data.body.forEach(item => {
                this.standAgenda.sessions.unshift(this.dateStringToAgendaList(item));
                this.standAgenda.sessions = this.standAgenda.sessions.sort((a, b) => (a.dateStart > b.dateStart) ? 1 : ((b.dateStart > a.dateStart) ? -1 : 0));
              });
            }

            if (callback) {
              callback(response);
            }

          }
        });

        this.standObj.event = this.standObj.eventId;

      }

    },

    getFormattedStand(id, callback) {

      if (Auth.user || this.isLinkedinSignin) {
        this.apiGetStand({
          id: id,
          callback: (response) => {
            this.getFormattedStandCallback(response, callback);
          }
        });
      } else {
        this.apiGetUStand({
          id: id,
          callback: (response) => {
            this.getFormattedStandCallback(response, callback);
          }
        });
      }
    },

    getStandBranding() {

      if (this.standObj.branding && this.standObj.branding.length) {
        this.standObj.branding.forEach(item => {
          let baseUrl = this.configs.binary ? this.configs.binary : 'binary-dev.openexpo.com';
          let itemUrl = func.url_560x315('https://' + this.configs.binary + '/' + item.url);
          let itemUrl368x208 = func.url_368x208('https://' + this.configs.binary + '/' + item.url);
          let itemFullUrl = 'https://' + this.configs.binary + '/' + item.url;
          this.standBranding.exist.push(itemUrl);
          item.strings?.forEach(str => {

            if (str.category == 'description_long') {

              if (str.value == 'main_image') {
                this.standBranding.templateCover.url = itemUrl;
                this.standBranding.templateCover.url_368x208 = itemUrl368x208;
                this.standBranding.maps.templateCover = item.id;
              }
              if (str.value == 'd-logo_image') {
                this.eventBranding.logo.url = itemUrl;
                this.eventBranding.maps.logo = item.id;
              }
              if (str.value == 'banner_image') {
                this.standBranding.templateBanner.url = itemUrl;
                this.standBranding.maps.templateBanner = item.id;
              }
              if (str.value == 'content_main_image') {
                this.standBranding.mainContent.url = itemUrl;
                this.standBranding.maps.mainContent = item.id;
              }

              if (str.value == 'content_carousel') {
                this.standBranding.mainCarousel.exist[item.id] = itemUrl368x208;
                this.standBranding.maps[item.id] = item.id;
                this.standBranding.carouselArr.push(itemUrl368x208);
                this.standBranding.fullCarouselArr.push(itemFullUrl);
                if (this.standBranding.mainCarousel.new.length > 1) {
                  this.standBranding.mainCarousel.new.pop();
                }

              }

            }
          });

          if (item?.url.indexOf('d-logo_image') > -1) {
            this.standBranding.logo.url = itemUrl;
            this.standBranding.logo.url_368x208 = itemUrl;
            this.standBranding.maps.logo = item.id;
          }
          if (item?.url.indexOf('main_image') > -1) {
            this.standBranding.templateCover.url = itemUrl;
            this.standBranding.templateCover.url_368x208 = itemUrl368x208;
            this.standBranding.maps.templateCover = item.id;
          }
          if (item?.url.indexOf('banner_image') > -1) {
            this.standBranding.templateBanner.url = itemUrl;
            this.standBranding.maps.templateBanner = item.id;
          }
          if (item?.url.indexOf('content_main_image') > -1) {
            this.standBranding.mainContent.url = itemUrl;
            this.standBranding.maps.mainContent = item.id;
          }

          if (item?.url.indexOf('content_carousel') > -1) {
            this.standBranding.mainCarousel.exist[item.id] = itemUrl368x208;
            this.standBranding.maps[item.id] = item.id;
            this.standBranding.carouselArr.push(itemUrl368x208);
            this.standBranding.fullCarouselArr.push(itemFullUrl);
            if (this.standBranding.mainCarousel.new.length > 1) {
              this.standBranding.mainCarousel.new.pop();
            }
          }
        });

      }
    },

    getStandDownloadables() {
      this.standDownloadables.exist = {};
      this.standDownloadables.maps = {};

      let exist = {};
      let maps = {};
      let index = 0;

      this.standObj.standMaterials.forEach(item => {

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

              exist[item.id].size = Math.round(item.size / 1024);
              exist[item.id].fileType = item.filetype
              maps[item.id] = true;
              exist[item.id].tags = item.tags;
              exist[item.id] = {
                ...exist[item.id],
                strings: item.strings,
                ...func.parseFilmStrings(item.strings)
              }

              if ((this.standObj.standMaterials.length - 1) == index) {
                this.standDownloadables.exist = exist;
                this.standDownloadables.maps = maps;
              }
              if (item.branding?.length) {
                const thumbnail = item.branding.find(brand => brand.url.indexOf('upload_thumb') > -1);
                if (thumbnail) {
                  exist[item.id].thumbnail = func.url_302x211('https://' + this.configs.binary + '/' + thumbnail.url);
                }
              }

              index++;
            }

          }
        });

      });
    },
  },
  computed: {
    ...mapGetters([
      'configs',
      'isLinkedinSignin'
    ]),
  },
  watch: {
    standBranding: {
      handler: function (newVal) {
        this.$store.commit('changeLogoStand', newVal.logo.url_368x208)
      },
      deep: true
    }
  },
}
