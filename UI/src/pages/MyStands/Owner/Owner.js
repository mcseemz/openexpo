import { mapActions, mapGetters } from 'vuex'
import func from '../../../others/functions.js';

export default {
  name: 'Owner',
  created() {
    this.getAcceptedStands();

    this.userGetInvitations({
      callback: (response) => {
        if (response.data.statusCode == '200' && response.data.body && response.data.body.length) {
          response.data.body.forEach((item, index, array) => {
            if (item.event) {
              this.apiGetEvent({
                id: item.event,
                callback: (response) => {
                  if (response.data.statusCode == '200' && response.data.body) {
                    this.eventsList[response.data.body.id] = response.data.body;
                    this.eventsList[response.data.body.id].name = '';
                    this.eventsList[response.data.body.id].description_short = '';
                    this.eventsList[response.data.body.id].description_long = '';
                    this.eventsList[response.data.body.id].templateCoverUrl = '';
                    this.eventsList[response.data.body.id].logoUrl = '';
                    this.eventsList[response.data.body.id].mainContentUrl = '';
                    this.eventsList[response.data.body.id].carouselArr = [];
                    this.eventsList[response.data.body.id].evtItemDate = this.calcDisplayDate(response.data.body.dateStart, response.data.body.dateEnd, response.data.body.timezone);

                    this.parseBrandings(this.eventsList[response.data.body.id]);

                    response.data.body.strings.forEach(str => {
                      this.eventsList[response.data.body.id][str.category] = str.value;
                    });

                    if (index == (array.length - 1) ) {
                      setTimeout(()=> {
                        this.invitationsList = array;
                        this.ilq = true;
                      }, 500);

                    }
                  }
                }
              })
            }
          });
        } else {
          this.ilq = true;
        }
      }
    });
  },
  data: function () {
    return {
      tmpstatus: 'tmp',
      slq: false,
      ilq: false,
      standList: [],
      invitationsList: [],
      eventsList: {},
      events_list: [

        {
          name: 'Event',
          status: 'pending'
        },
        {
          name: 'Event',
          status: 'active'
        },
        {
          name: 'Event',
          status: 'past'
        }

      ],
      date_val: null,
      searchString: '',
      datepicker_lang: {
        months: {
          full: ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },
        days: {
          full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          initials: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        }
      },
      expand_filter: false,
    }
  },

  methods: {
     ...mapActions([
      'acceptStandInvitation',
      'rejectStandInvitation',
      'getOwnerStands',
      'userGetStands',
      'userGetInvitations',
      'apiGetEvent',
      'getDownloadFileUrl'
    ]),
    triggerFilter() {
      this.expand_filter = !this.expand_filter;
    },

    refuse(id) {
      this.rejectStandInvitation({
        invitation_id: id,
        callback: (response) => {
          if (response.data.statusCode == "200") {
            this.invitationsList.forEach((item, index, array) => {
              if (id == item.id) {
                array.splice(index, 1);
              }
            })
          }
        }
      })
    },

    accept(id) {
      const that = this;
      this.acceptStandInvitation({
        invitation_id: id,
        callback: (response) => {
          if (response.data.statusCode == "200") {
            that.invitationsList.forEach((item, index, array) => {
              if (id == item.id) {
                array.splice(index, 1);
              }
            })
            this.slq = false;
            this.standList = [];
            this.getAcceptedStands();
          }
        }
      })
    },

    getAcceptedStands() {
      this.userGetStands({
      callback: (response) => {
        if (response.data.statusCode == '200' && response.data.body && response.data.body.length) {
          response.data.body.forEach((item, index, array) => {
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

                  if (response.data.statusCode == '200' && response.data.body && response.data.body.id) {
                    this.eventsList[response.data.body.id] = response.data.body;
                    this.eventsList[response.data.body.id].name = '';
                    this.eventsList[response.data.body.id].description_short = '';
                    this.eventsList[response.data.body.id].description_long = '';
                    this.eventsList[response.data.body.id].templateCoverUrl = '';
                    this.eventsList[response.data.body.id].logoUrl = '';
                    this.eventsList[response.data.body.id].mainContentUrl = '';
                    this.eventsList[response.data.body.id].carouselArr = [];
                    this.parseBrandings(this.eventsList[response.data.body.id], false, 'event');
                    this.eventsList[response.data.body.id].evtItemDate = this.calcDisplayDate(response.data.body.dateStart, response.data.body.dateEnd, response.data.body.timezone);

                    response.data.body.strings.forEach(str => {
                      this.eventsList[response.data.body.id][str.category] = str.value;
                    });

                    if (index == (array.length - 1) ) {
                      setTimeout(()=> {
                        this.slq = true;
                        this.standList = array;
                      }, 500);
                    }
                  }
                }

              })
            }
          });
        } else {
          this.slq = true;
        }
      }
    });
    },
    parseBrandings(event, callback, type) {
      if ( event && event.branding && event.branding.length ) {

        event.branding.forEach(item => {
          let itemFullUrl = func.url_368x208('https://'+this.configs.binary+'/'+item.url);

          if (item.strings && item.strings.length) {
            item.strings.forEach(str => {
              if (str.category == 'description_long') {
                if (str.value == 'main_image') {
                  if (type == 'event') {
                    event.templateCoverUrl = func.url_560x315('https://'+this.configs.binary+'/'+item.url);
                  } else {
                    event.templateCoverUrl = itemFullUrl;
                  }
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
            if (type == 'event') {
              event.templateCoverUrl = func.url_560x315('https://'+this.configs.binary+'/'+item.url);
            } else {
              event.templateCoverUrl = itemFullUrl;
            }
          } else if (item.url.indexOf('logo_image')>-1) {
            event.logoUrl = itemFullUrl;
          } else if (item.url.indexOf('content_main_image')>-1) {
            event.mainContentUrl = itemFullUrl;
          } else if (item.url.indexOf('content_carousel')>-1) {
            event.carouselArr.push(itemFullUrl);
          }

          if (callback) {
            callback();
          }
        });

      } else {
        if (callback) {
          callback();
        }
      }

    },
    calcDisplayDate(start, end, timezone) {
      return func.calcDisplayDate(start, end, timezone);
    },
    dateLeft(event) {
      return func.dateLeft(event);
    },
  },

  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs'
    ]),
    notFound() {
      return !(this.invitationsList.length + this.standList.length);
    },
    preload() {
      return !(this.slq && this.ilq);
    },
    filteredStandsList() {
      let result = this.standList
      if (this.searchString) {
        result = result.filter((item) => {
          name = item.name ? item.name : this.tr('mystands_default_stand');
          return name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }
      if (this.date_val) {
        result = result.filter((item) => {
          return new Date(this.date_val) > new Date(this.eventsList[item.eventId].dateStart) && new Date(this.date_val) < new Date(this.eventsList[item.eventId].dateEnd)
        });
      }

      return result;
    },
    filteredInvitationsList() {
      if (!this.invitationsList.length) { return [] }
      let result = this.invitationsList;
      if (this.searchString) {
        result = result.filter((item) => {
          return this.tr('mystands_default_stand').toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }
      if (this.date_val) {
        result = result.filter((item) => {
          return new Date(this.date_val) > new Date(this.eventsList[item.event].dateStart) && new Date(this.date_val) < new Date(this.eventsList[item.event].dateEnd)
        });
      }

      return result;
    }
  }
}
