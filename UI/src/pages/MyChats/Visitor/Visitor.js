import { mapActions, mapGetters } from 'vuex'
import datepicker_lang from '../../../others/datepicker_lang.js';
import func from '../../../others/functions.js';

export default {
  name: 'Visitor',
  created() {
    this.getUserChats({
      type: 'user',
      queryType: 'visitor',
      callback: (resp) => {
        if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
          let index = 0;
          resp.data.body.forEach(chat => {
            if (chat.eventId) {
              this.apiGetEvent({
                id: chat.eventId,
                callback: (response) => {
                  if (response.data.statusCode == '200') {
                    let iEvent = response.data.body;
                    func.addDataToEventList([iEvent]);
                    this.parseBrandings(iEvent);
                    this.eventChatList.push({
                        event: iEvent,
                        chats: chat,
                      });
                      if ( index == (resp.data.body.length - 1) ) {
                        this.slq = true;
                      }
                      index++;
                      this.$forceUpdate();
                  }
                }
              });
            }
            if (chat.standId) {
              this.apiGetStand({
                id: chat.standId,
                callback: (response) => {
                  if (response.data.statusCode == '200') {
                    let iStand = response.data.body;
                    iStand.name = '';
                    iStand.description_short = '';
                    iStand.description_long = '';
                    iStand.strings.forEach(str => {
                      iStand[str.category] = str.value;
                    });
                    iStand.templateCoverUrl = '';
                    iStand.logoUrl = '';
                    iStand.mainContentUrl = '';
                    iStand.carouselArr = [];
                    this.parseBrandings(iStand);
                    this.standChatList.push({
                      stand: iStand,
                      chats: chat,
                    });
                    if ( index == (resp.data.body.length - 1) ) {
                      this.slq = true;
                    }
                    index++;
                    this.$forceUpdate();
                  }

                }
              });
            }
          });
          this.$forceUpdate();
        } else {
          this.slq = true;
        }
      }
    });
  },
  data: function () {
    return {
      slq: false,
      eventsList: [],
      date_val: null,
      searchString: '',
      expand_filter: false,
      datepicker_lang: datepicker_lang,
      chatList: [],
      eventChatList: [],
      standChatList: [],
    }
  },

  methods: {
    ...mapActions([
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
      'getUserEvents',
      'getUserChats',
      'apiGetEvent',
      'apiGetStand'
    ]),
    triggerFilter() {
      this.expand_filter = !this.expand_filter;
    },
    parseBrandings(event) {
      if (event && event.branding && event.branding.length) {
        event.branding.forEach(item => {
          let itemFullUrl = func.url_560x315('https://'+this.configs.binary+'/'+item.url);

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
    startPricing(event) {
      return func.startPricing(event);
    },
    dateLeft(event) {
      return func.dateLeft(event);
    },
    chatsUnreadCount(chats) {
      let unread = 0;
      chats.forEach(chat => {
        unread += +chat.unreadCount;
      })

      if (unread) {
        return unread == 1 ? `1 new message` : `${unread} new messages`;
      }
      return false;
    }
  },

  computed: {
    ...mapGetters([
      'getLocaleName',
      'tr',
      'routes',
      'configs'
    ]),
    notFound() {
      return !this.eventChatList.length && !this.standChatList.length;
    },
    preload() {
      return !this.slq;
    },
    filteredEventChatList() {
      let result = this.eventChatList;
      if (this.searchString) {
        result = result.filter((item) => {
          name = item.event.name;
          return name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }
      if (this.date_val) {
        result = result.filter((item) => {
          return new Date(this.date_val) > new Date(item.event.dateStart) && new Date(this.date_val) < new Date(item.event.dateEnd)
        });
      }

      return result;
    },
    filteredStandChatList() {
      let result = this.standChatList;
      if (this.searchString) {
        result = result.filter((item) => {
          name = item.stand.name;
          return name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }

      return result;
    }
  }
}
