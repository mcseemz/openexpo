import { mapActions, mapGetters } from 'vuex'
import datepicker_lang from '../../../others/datepicker_lang.js';
import func from '../../../others/functions.js';
import { Auth } from 'aws-amplify';

export default {
  name: 'StandOwner',
  components: {


  },
  created() {
    this.getAcceptedStands();
  },
  data: function () {
    return {
      slq: false,
      eventsList: {},
      chatList: [],
      pendingChatList: [],
      standList: [],
      date_val: null,
      expand_filter: false,
      datepicker_lang: datepicker_lang,
      searchString: '',
      filteredEvent_stands:{}
    }
  },

  methods: {
    ...mapActions([
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
      'getUserEvents',
      'eventGetStands',
      'apiGetEvent',
      'userGetStands',
      'getChats',
      'chatAction'
    ]),
    assignChat(chat) {
      this.slq = false;
      this.chatAction({
        sid: chat.sid,
        action: 'assign',
        callback: (resp) => {
          window.location.reload();
        }
      });
    },
    triggerFilter() {
      this.expand_filter = !this.expand_filter;
    },
    getAcceptedStands() {
      this.userGetStands({
      callback: (response) => {
        if (response.data.statusCode == '200' && response.data.body && response.data.body.length) {
          let ugs_i = 0;
          let s_i = 0;

          response.data.body.forEach((item, index, array) => {
            s_i++;
            if (item.eventId) {

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
              this.parseBrandings(item);

              this.apiGetEvent({
                id: item.eventId,
                callback: (response) => {
                  this.$forceUpdate();
                  if (response.data.statusCode == '200' && response.data.body) {
                    const id = response.data.body.id;
                    let tmpStands = [];
                    if (this.eventsList[id] && this.eventsList[id]['stands']) {
                      tmpStands = this.eventsList[id]['stands'];  
                    }
                   
                    this.eventsList[id] = response.data.body;
                    this.eventsList[id]['stands'] = tmpStands;
                    this.eventsList[id]['stands'].push({id:item.id, name: item.name});
                    this.eventsList[id].name = '';
                    this.eventsList[id].description_short = '';
                    this.eventsList[id].description_long = '';
                    this.eventsList[id].templateCoverUrl = '';
                    this.eventsList[id].logoUrl = '';
                    this.eventsList[id].mainContentUrl = '';
                    this.eventsList[id].carouselArr = [];

                    this.eventsList[id].langList = [];
                    this.eventsList[id].tags.forEach(tag => {
                      let tagArr = tag.split(':');
                      if (tagArr[0] == 'lang') {
                        this.eventsList[id].langList.push(tagArr[1]);
                      }
                    });
                    this.eventsList[id].langList = this.eventsList[id].langList.join(', ');
                    if (this.eventsList[id].langList.length > 37) {
                      this.eventsList[id].langList = this.eventsList[id].langList.substring(0, 37) + '...';
                    }
                    const firstDay = response.data.body.dateStart;
                    const lastDay = response.data.body.dateEnd;
                    this.eventsList[id].evtItemDate = func.calcDisplayDate(firstDay, lastDay, this.eventsList[id].timezone);

                    this.getChats({
                      type: 'event',
                      id,
                      queryType: 'visitor',
                      callback: (resp) => {
                        if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
                          this.eventsList[id].chats = resp.data.body
                          this.$forceUpdate();
                        }

                      }
                    });

                    this.getUActivity({
                       postType: 'event',
                       id,
                       type: 'working_schedule',
                       user: Auth.user || this.isLinkedinSignin,
                       callback: (resp) => {
                         if (resp.data.statusCode) {

                          this.parseBrandings(this.eventsList[id], () => {
                            this.standList = array;

                            this.getChats({
                              type: 'stand',
                              id: item.id,
                              queryType: 'owner',
                              callback: (resp) => {
                                if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {

                                  let chats = [];
                                  resp.data.body.forEach(chat => {
                                    chats.push(chat);
                                  });
                                  if (chats.length) {
                                    this.chatList.push({
                                      stand: item,
                                      event: response.data.body,
                                      chats: chats
                                    });
                                  }

                                  this.$forceUpdate();
                                }

                                this.getChats({
                                  type: 'stand',
                                  id: item.id,
                                  queryType: 'pending',
                                  callback: (resp) => {
                                    if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
                                      this.pendingChatList.push({
                                        stand: item,
                                        event: response.data.body,
                                        chats: resp.data.body,
                                      });
                                      this.$forceUpdate();
                                    }

                                    if (s_i == this.standList.length ) {
                                      this.slq = true;
                                    }
                                  }
                                });
                              }
                            });
                            ugs_i++
                          });
                         }
                       }
                    });

                    response.data.body.strings.forEach(str => {
                      this.eventsList[id][str.category] = str.value;
                    });
                  }
                }
              });
            }
          });
        } else {
          this.slq = true;
        }
      }
    });
    },
    parseBrandings(event, callback) {
      if ( event && event.branding && event.branding.length ) {

        let b_i = 0;
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

          if ( b_i == (event.branding.length - 1) && callback ) {
            callback();
          }
          b_i++;
        });

      } else {
        if (callback) {
          callback();
        }
      }

    },
    startPricing(event) {
      return func.startPricing(event);
    },
    dateLeft(event) {
      return func.dateLeft(event);
    },
    eventStatus(event) {
      switch (event.status) {
        case 'draft':
          return 'Draft';
        case 'cancelled':
          return 'Cancelled';
        case 'moderation':
          return 'Moderation';
        case 'inactive':
          return 'Inactive';
        case 'active':
          if (event.pricing && event.pricing.access_price) {
            return 'On sale';
          } else {
            return 'Not for sale yet';
          }
          return 'Active';
      }

    },

    eventUnreadMessages(eventId) {
      let unread = 0;
      if (this.eventsList[eventId].chats && this.eventsList[eventId].chats.length) {
        this.eventsList[eventId].chats.forEach(chat => {
          unread += +chat.unreadCount;
        })
      }

      if (unread) {
        return unread == 1 ? `1 new message` : `${unread} new messages`;
      }
      return false;
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
    },
  },

  computed: {
    ...mapGetters([
      'getLocaleName',
      'tr',
      'routes',
      'configs',
      'isLinkedinSignin',
    ]),
    notFound() {
      return !this.standList.length && !this.chatList.length;
    },
    preload() {
      return !this.slq;
    },
    filteredChatList() {
      let result = this.chatList;

      if (this.searchString) {
        result = this.chatList.filter((item) => {
          return item.stand.name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }

      if (this.date_val) {
        result = result.filter((item) => {
          return (new Date(this.date_val) > new Date(item.event.dateStart) && new Date(this.date_val) < new Date(item.event.dateEnd));
        });
      }

      return result;
    },
    filteredPendingChatList() {
      let result = this.pendingChatList;

      if (this.searchString) {
        result = this.pendingChatList.filter((item) => {
          return item.stand.name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }

      if (this.date_val) {
        result = result.filter((item) => {
          return (new Date(this.date_val) > new Date(item.event.dateStart) && new Date(this.date_val) < new Date(item.event.dateEnd));
        });
      }

      return result;
    },
        
    filteredEventsList(){
      let result = this.eventsList;
      const newList = {};
      if (this.searchString) {
        result = Object.keys(result).forEach((item) => {
          name = result[item].name;
          if (name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1) {
            newList[item] = result[item];
          }
        });
        result = newList;
      }
      if (this.date_val) {
        const newList = {};
        result = Object.keys(result).forEach((item) => {
          name = result[item].name;
          if (new Date(this.date_val) > new Date(result[item].dateStart) && new Date(this.date_val) < new Date(result[item].dateEnd)) {
            newList[item] = result[item];
          }
        });
        result = newList ;
      }

      Object.keys(result).forEach(key => {
        let standFrom = { value: "", label: "" };
        if (result[key]["stands"].length === 1) {
          standFrom = {
            value: result[key]["stands"][0]["id"],
            label: result[key]["stands"][0]["name"]
          };
        }
        result[key]["standFrom"] = standFrom;
        console.log('set stand from to', key, standFrom);
        this.$set(this.filteredEvent_stands, result[key]["id"], {
          options: result[key]["stands"].map(el => {
            return {
              label: el.name,
              value: el.id
            };
          })
        });
      });

      

      console.log('filteredEvents', result);

      return result;
    },

  }
}
