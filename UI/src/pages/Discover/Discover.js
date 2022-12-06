import VueSlickCarousel from 'vue-slick-carousel'
import 'vue-slick-carousel/dist/vue-slick-carousel.css'
import 'vue-slick-carousel/dist/vue-slick-carousel-theme.css'
// import { Auth } from 'aws-amplify'
// import { components } from 'aws-amplify-vue'
import func from '@/others/functions.js';
import datepicker_lang from '@/others/datepicker_lang.js';
import { mapActions, mapGetters } from 'vuex'
import { Auth } from 'aws-amplify';

import keenui from '@/plugins/keenUi';

export default {
  name: 'Discover',
  components: {
    VueSlickCarousel,
    // Auth,
    // ...components
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('discover') : 'Discover',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('discover') : 'Discover' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('discover') : 'Discover' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('discover') : 'Discover' },
      ],
    }
  },
  created() {
    console.log(this.$route.query);
    if (this.$route.query.s) {
      this.searchVal = this.$route.query.s;
    }
    console.log(encodeURIComponent(this.$route.query.s));
    let cat_answ = [{
        label: 'All',
        value: ''
      }
    ];
    // let catEventList = {};

    this.getCategories()
    .then(response => {
      if ( response.data && response.data.body && response.data.body.length ) {
        for ( var i = 0; i < response.data.body.length; i++ ) {
          cat_answ[i+1] = {
            label: response.data.body[i].value,
            value: response.data.body[i].id
          };
          if (this.$route.query.cat && this.$route.query.cat == cat_answ[i].value) {
            this.searchCatVal = cat_answ[i];
          }
        }
        this.categoriesList = cat_answ;

        let catQuery = false;
        let searchQuery = false;
        if (this.$route.query.s) {
          searchQuery = encodeURIComponent(this.$route.query.s);
        }
        if (this.$route.query.cat) {
          catQuery = this.$route.query.cat;
        }

        this.getEvents(this.eventsReqData('featured', searchQuery, catQuery));
        this.getEvents(this.eventsReqData('regular', searchQuery, catQuery));




      }
    })
    .catch(error => console.log(error));

  },
  data: function () {
    return {
      date_val: new Date(),
      categoriesList: [],
      featuredEventList: null,
      othersEventList: null,
      datepicker_lang: datepicker_lang,
      searchVal: '',
      searchCatVal: '',
      isLoggedInG: true,
      events_list: ['ev', 'ev', 'ev', 'ev', 'ev', 'ev'],
      globalPreload: true,
      fload: false,
      oload: false,
      featured_carousel_settings: {
        arrows: false,
        dots: false,
        slidesToShow: 3,
        infinite: true,
        centerMode: true,
        centerPadding: '136px',
        variableWidth: true,
        customPaging: '20px',
        cssEase: 'ease-in-out',
        focusOnSelect: true,
      },
      clientXonMouseDown: 0,
      clientYonMouseDown: 0,
      clientXonClick: 0,
      clientYonClick: 0,
    }
  },
  beforeRouteLeave (to, from, next) {
    // вызывается перед переходом от пути, соответствующего текущему компоненту;
    // имеет доступ к контексту экземпляра компонента `this`.
    if (this.clientXonMouseDown != this.clientXonClick || this.clientYonMouseDown != this.clientYonClick) {
      console.log('FALSE', this.clientXonMouseDown, this.clientXonClick, this.clientYonMouseDown, this.clientYonClick);
      next(false);
    } else {
      next();
    }

  },
  methods: {
    ...mapActions([
      'getCategories',
      'getFuturedEventsByCat',
      'getEvents',
      'getEventsSearch',
      'putVocabularies',
      'putVocabulariesForLanguage',
      'setLocale',
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
    ]),
    mouseDownEvt(e) {
      this.clientXonMouseDown = e.clientX;
      this.clientYonMouseDown = e.clientY;
    },
    mouseUpEvt(e) {
      this.clientXonClick = e.clientX;
      this.clientYonClick = e.clientY;
      setTimeout(() => {
        this.clientXonMouseDown = this.clientYonMouseDown = this.clientXonClick = this.clientYonClick = 0;
      }, 100);
        // if ( ! window.confirm('Are you sure?')) {
        //   e.preventDefault();
        //   // this.$router.next(false);
        // }
        // else continue to route
    },
    searchAction() {
      const s = this.searchVal;
      const cat = this.searchCatVal ? this.searchCatVal.value : false;
      const query = {};
      if (s) {
        query.s = s;
      }
      if (cat) {
        query.cat = cat;
      }
      this.fload = false;
      this.oload = false;
      this.globalPreload = true;
      this.getEvents(this.eventsReqData('featured', s, cat));
      this.getEvents(this.eventsReqData('regular', s, cat));

      // this.$router.push({ path: `${this.$route.path}`, query: query });
      // window.location.reload();
    },
    showNext() {
      this.$refs.featured_carousel.next()
    },
    showPrev() {
      this.$refs.featured_carousel.prev()
    },
    startPricing(event) {
      return func.startPricing(event);
    },
    parseBrandings(event, callback) {
      console.log('parseBrandings', event);
      if ( event && event.branding && event.branding.length ) {
// console.log(12);
        event.branding.forEach(item => {
          let itemFullUrl = func.url_368x208('https://'+this.configs.binary+'/'+item.url);

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

          callback();
        });

      } else {
        callback();
      }

    },
    eventsReqData(type, search, category) {
      let events = [];
      return {
        type: type ? type : false,
        search: search ? search : false,
        category: category ? category : false,
        callback: (response) => {
          if ( response.data && response.data.statusCode == '200' && response.data.body && response.data.body.length ) {

            events = response.data.body;

            func.addDataToEventList(events);

            let e_i = 0;
            events.forEach(event => {

              this.getUActivity({
                 postType: 'event',
                 id: event.id,
                 type: 'working_schedule',
                 user: Auth.user || this.isLinkedinSignin,
                 callback: (resp) => {
                   if (resp.data.statusCode == '200') {

                    const firstDay = resp.data.body.length ? resp.data.body[0].start : event.dateStart;
                    const lastDay = resp.data.body.length ? resp.data.body[resp.data.body.length - 1].end : event.dateEnd;
                    event.evtItemDate = func.calcDisplayDate(firstDay, lastDay, event.timezone);

                    this.parseBrandings(event, () => {
                      this.$forceUpdate();
                    });

                   }

                 }
              });

              e_i++;

            });

          }

          if (type == 'featured') {
            this.featuredEventList = events;
            console.log('featured',this.featuredEventList);
            this.fload = true;
          } else {
            this.othersEventList = events;
            this.oload = true;
            console.log('others',this.othersEventList);
          }

          if (this.fload && this.oload) {
            setTimeout(() => {
              this.globalPreload = false;
            }, 300);
          }


        }
      }
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs',
      'isLinkedinSignin',
    ]),
    featuredNoActiveClass () {
      return this.featuredEventList.length < 4
    }
  }
}
