import { mapActions, mapGetters } from 'vuex'
import datepicker_lang from '../../../others/datepicker_lang.js';
import func from '../../../others/functions.js';
import { Auth } from 'aws-amplify';

export default {
  name: 'MyEventsOrganizer',
  components: {


  },
  created() {
    this.getUserEvents({
      type: 'organizer',
      callback: (response) => {

        if ( response.data && response.data.statusCode == '200' && response.data.body && response.data.body.length ) {
          let tmpEventList = response.data.body;

          func.addDataToEventList(tmpEventList);

          let e_i = 0;
          tmpEventList.forEach(event => {

            const firstDay = event.dateStart;
            const lastDay = event.dateEnd;
            const timezone = this.eventTimezoneObj(event.timezone);
            event.evtItemDate = func.calcDisplayDate(firstDay, lastDay, null, true, timezone.name);

            this.getUActivity({
               postType: 'event',
               id: event.id,
               type: 'working_schedule',
               user: Auth.user || this.isLinkedinSignin,
               callback: (resp) => {

                 if (resp.data.statusCode == '200') {

                  this.parseBrandings(event, () => {

                    this.eventGetStands({
                      id: event.id,
                      callback: (resp) => {
                        if (resp.data.statusCode == '200' && resp.data.body) {
                          event.standsCount = resp.data.body.length;
                        } else {
                          event.standsCount = 0;
                        }

                        this.eventsList = tmpEventList;
                        this.slq = true;
                        this.$forceUpdate();
                      }
                    })

                  });

                 }

               }
            });

            e_i++;

          })
        } else {
          this.slq = true;
        }

      }
    })
  },
  data: function () {
    return {
      slq: false,
      eventsList: [],
      date_val: null,
      expand_filter: false,
      datepicker_lang: datepicker_lang,
      searchString: '',
    }
  },

  methods: {
    ...mapActions([
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
      'getUserEvents',
      'eventGetStands'
    ]),
    triggerFilter() {
      this.expand_filter = !this.expand_filter;
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
          } else if (item.url.indexOf('d-main_image')>-1) {
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
    eventTimezoneObj(timezone) {
      if (typeof timezone !== 'string') {
        return timezone.name;
      }

      const eventTimezone = func.getTimezoneList().find(item => item.value == timezone);
      return eventTimezone;
    },
  },

  computed: {
    ...mapGetters([
      'getLocaleName',
      'tr',
      'routes',
      'features',
      'configs',
      'isLinkedinSignin',
    ]),
    notFound() {
      return !this.eventsList.length;
    },
    preload() {
      return !this.slq;
    },
    filteredEventsList() {
      let result = this.eventsList
      if (this.searchString) {
        result = result.filter((item) => {
          return item.name.toLowerCase().indexOf(this.searchString.toLowerCase()) != -1;
        });
      }
      if (this.date_val) {
        result = result.filter((item) => {
          return new Date(this.date_val) > new Date(item.dateStart) && new Date(this.date_val) < new Date(item.dateEnd)
        });
      }

      return result;
    }

  }
}
