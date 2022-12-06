import { mapActions, mapGetters } from 'vuex'
import datepicker_lang from '../../../others/datepicker_lang.js';
import func from '../../../others/functions.js';
import { Auth } from 'aws-amplify';

export default {
  name: 'MyEventsStandOwner',
  components: {


  },
  created() {
    this.getAcceptedStands();
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
      datepicker_lang: datepicker_lang,
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
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
    ]),
    triggerFilter() {
      this.expand_filter = !this.expand_filter;
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

                  if (response.data.statusCode == '200' && response.data.body) {
                    this.eventsList[response.data.body.id] = response.data.body;
                    this.eventsList[response.data.body.id].name = '';
                    this.eventsList[response.data.body.id].description_short = '';
                    this.eventsList[response.data.body.id].description_long = '';
                    this.eventsList[response.data.body.id].templateCoverUrl = '';
                    this.eventsList[response.data.body.id].logoUrl = '';
                    this.eventsList[response.data.body.id].mainContentUrl = '';
                    this.eventsList[response.data.body.id].carouselArr = [];

                    this.eventsList[response.data.body.id].langList = [];
                    this.eventsList[response.data.body.id].tags.forEach(tag => {
                      let tagArr = tag.split(':');
                      if (tagArr[0] == 'lang') {
                        this.eventsList[response.data.body.id].langList.push(tagArr[1].substring(0, 2));
                      }
                    });
                    this.eventsList[response.data.body.id].langList = this.eventsList[response.data.body.id].langList.join(', ');

                    const firstDay = response.data.body.dateStart;
                    const lastDay = response.data.body.dateEnd;
                    this.eventsList[response.data.body.id].evtItemDate = func.calcDisplayDate(firstDay, lastDay,  response.data.body.timezone);

                    this.getUActivity({
                       postType: 'event',
                       id: response.data.body.id,
                       type: 'working_schedule',
                       user: Auth.user || this.isLinkedinSignin,
                       callback: (resp) => {

                         if (resp.data.statusCode == '200') {

                          this.parseBrandings(this.eventsList[response.data.body.id], () => {
                            if (index == (array.length - 1) ) {

                              setTimeout(()=> {
                                this.slq = true;
                                this.standList = array;
                              }, 500);

                            }
                          });

                         }

                       }
                    });



                    response.data.body.strings.forEach(str => {
                      this.eventsList[response.data.body.id][str.category] = str.value;
                    });


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
    parseBrandings(event, callback) {
      if ( event && event.branding && event.branding.length ) {

        event.branding.forEach(item => {
          let itemFullUrl = func.url_302x211('https://'+this.configs.binary+'/'+item.url);

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
    startPricing(event) {
      return func.startPricing(event);
    },
    dateLeft(event) {
      return func.dateLeft(event);
    }
  },

  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'features',
      'configs',
      'isLinkedinSignin',
    ]),
    notFound() {
      return !(this.invitationsList.length + this.standList.length);
    },
    preload() {
      return !(this.slq);
    },
    filteredEventsList() {
      let result = this.eventsList
      if (this.searchString) {
        let newResult = {};
        Object.keys(result).forEach(item => {
          if (this.eventsList[item].name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1) {
            newResult[item] = this.eventsList[item];
          }
        });
        result = newResult;
      }
      if (this.date_val) {
        let newResult = {};
        Object.keys(result).forEach(item => {
          if (new Date(this.date_val) > new Date(this.eventsList[item].dateStart) && new Date(this.date_val) < new Date(this.eventsList[item].dateEnd)) {
            newResult[item] = this.eventsList[item];
          }
        });
        result = newResult;
      }

      return result;
    }
  }
}
