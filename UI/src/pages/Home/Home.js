import FeaturedCarousel from '../../components/FeaturedCarousel/FeaturedCarousel.vue'

import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';

import func from '../../others/functions.js';
import { mapActions, mapGetters, mapState } from 'vuex'

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "home" */ '@/../locales/home/'+lang+'.json')
};

const faq_dict = {
  importLang: (lang) => import( /* webpackChunkName: "homefaq" */ '@/../locales/home/faq/'+lang+'.json')
};

export default {
  name: 'Home',
  components: {
    FeaturedCarousel,

  },
  metaInfo() {
    return {
      title: this.tr('homepage_meta_title'),
      titleTemplate: null,
      meta: [
        { name: 'description', property: 'description', content: this.tr('homepage_meta_description') },
        { name: 'og:title', property: 'og:title', content: this.tr('homepage_meta_title') },
        { name: 'og:description', property: 'og:description', content: this.tr('homepage_meta_description') },
      ],
    }

  },
  created() {
    faq_dict['importLang'](this.getLocale).then((resp) => {
      this.faqList = {};
      this.faqList[this.getLocale] = resp.default
      this.$forceUpdate();
    });
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });

    let cat_answ = [
    ];

    this.getCategories()
    .then(response => {
      if ( response.data && response.data.body && response.data.body.length ) {
        for ( var i = 0; i < response.data.body.length; i++ ) {
          cat_answ[i] = {
            label: response.data.body[i].value,
            value: response.data.body[i].id
          };
        }
        this.categoriesList = cat_answ;
        this.$forceUpdate();
        this.searchCatList.push(...cat_answ);
        this.categoriesList.forEach(item => {
          this.preload[item.value] = false;
        });

        let index = 0;
        let eventLists = {};
        let lastCat = false;

      }
    })
    .catch(error => console.log(error));

  },
  data: function () {
    return {
      faqList: null,
      isLoggedInG: true,
      catEventList: [],
      categoriesList: [],
      preload: {},
      searchCatList: [
        {
          label: 'All',
          value: ''
        }
      ],
      tabsImages: {
        "Health": require('./img/business.svg'),
        "Technology": require('./img/heart.svg'),
        "FilmMedia": require('./img/media.svg'),
        "Business": require('./img/tech.svg'),
        "TravelOutdoor": require('./img/map.svg'),
      },
      searchCatVal: '',
      searchVal: '',
      globalPreload: true,
      localesLoaded: false,
      request:{
        name: '',
        email: '',
        tel: '',
        msg: ''
      },
      terms: false,
      reqNameTouched: false,
      reqMailTouched: false,
      reqTelTouched:false,
      modalMsg: '',
      modalTitle: '',
      statusModalSuccess: false
    }
  },

  methods: {
    ...mapActions([
      'getCategories',
      'getFuturedEventsByCat',
      'putVocabularies',
      'putVocabulariesForLanguage',
      'setLocale',
      'getDownloadFileUrl',
      'getActivity',
      'getUActivity',
      'getEvents',
      'apiRequestDemo'
    ]),

    startPricing(event) {
      const currs = {
        'EUR': '€',
        'USD': '$'
      };

      if (event.pricing && event.pricing.access_price && currs[event.pricing.access_currency]) {

        return currs[event.pricing.access_currency]+event.pricing.access_price;

      } else {
        return 'Free';
      }

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

      this.$router.push({ path: `/${this.routes.discover}`, query: query });
    },
    parseBrandings(event, callback) {
      console.log('parseBrandings', event);
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

          callback();

        });

      } else {
        callback();
      }

    },

    getEventByCat(cat) {
      console.log('GET EVENT BY CAT');
      let tempCat = false;
      this.preload[cat] = true;
      this.$forceUpdate();
      this.getEvents({
        category: cat,
        type: 'featured',
        callback: (response) => {

          if ( response.data && response.data.statusCode == '200' && response.data.body && response.data.body.length ) {

            tempCat = response.data.body;

            func.addDataToEventList(tempCat);

            let e_i = 0;
            tempCat.forEach(event => {
              event.evtItemDate = func.calcDisplayDate(event.dateStart, event.dateEnd, event.timezone);
              // this.getUActivity({
              //    postType: 'event',
              //    id: event.id,
              //    type: 'working_schedule',
              //    callback: (resp) => {
                   // console.log('home working_schedule', resp);
                   // if (resp.data.statusCode == '200') {

                    this.parseBrandings(event, () => {

                      if (e_i++ == (tempCat.length - 1)) {
                        this.catEventList[cat] = tempCat;
                        this.preload[cat] = false;
                        this.$forceUpdate();
                      }

                    });

                   // }

              //    }
              // });

            });

          } else {
            this.preload[cat] = false;
            this.$forceUpdate();
          }

        }
      })
    },
    changeTab(id) {
      console.log(id);
      if (!this.catEventList[id]) {
        this.getEventByCat(id);
      }
    },
    openRequestModal(msg) {
      this.$refs.requestDemoModal.open();
    },
    modalClose() {
      this.$refs.requestDemoModal.close();
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    sendRequest() {
      const errorsArr = [];
      if (!this.request.name) {
        errorsArr.push(this.tr('home_valid_name_req'));
      }
      if (!this.request.email) {
        errorsArr.push(this.tr('home_valid_email_req'));
      }

      if (this.request.email && !this.validateEmail(this.request.email)) {
        errorsArr.push(this.tr('home_valid_email_inv'));
      }

      if (!this.request.tel) {
        errorsArr.push(this.tr('home_valid_phone_req'));
      }
      if (this.request.tel && !/^[\d()\-#+\s]*$/.test(this.request.tel)) {
        errorsArr.push(this.tr('home_valid_phon_inv'));
      }
      if (!this.terms) {
        errorsArr.push(this.tr('home_valid_terms_req'));
      }

      if (errorsArr.length) {
        this.openModal(errorsArr, this.tr('validation_error'));
        return false;
      }

      this.apiRequestDemo({
        request: this.request,
        callback: (response) => {
          this.request = {
            name: '',
            email: '',
            tel: '',
            msg: ''
          };
          this.reqNameTouched = this.reqTelTouched = this.reqMailTouched = this.terms = false;
          console.log('REQUEST DEMO CALLBACK', response);
          this.modalClose();
          this.statusModalSuccess = true;
          this.openModal([this.tr('home_success_modal_message')], this.tr('home_success_modal_title'))
          this.$forceUpdate();
        }
      })
    },
    openModal(msg, title) {
      this.modalMsg = '';
      this.modalTitle = title;
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
      this.statusModalSuccess = false;
    }
  },
  computed: {
    ...mapGetters([
      'getAllLocales',
      'getLocale',
      'getLocaleName',
      'tr',
      'routes',
      'features',
      'configs'
    ]),
    ...mapState([
      'userData',
    ]),

    getFaq() {
      if (this.faqList && this.faqList[this.getLocale] && this.faqList[this.getLocale].tab_items) {
        return this.faqList[this.getLocale].tab_items;
      }
      return [];

    },
  }
}
