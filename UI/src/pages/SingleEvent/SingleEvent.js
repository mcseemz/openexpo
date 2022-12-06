import EmptyTabContent from '../../components/EmptyTabContent/EmptyTabContent.vue';

import MainTab from '@/components/MainTab/MainTab.vue';
import ArticlesTab from './ArticlesTab/ArticlesTab.vue';
import TicketsTab from './TicketsTab/TicketsTab.vue';
import DownloadTab from '@/components/DownloadTab/DownloadTab.vue';
import StandsTab from './StandsTab/StandsTab.vue';
import AgendaTab from '@/components/AgendaTab/AgendaTab.vue';
import SponsorsTab from './SponsorsTab/SponsorsTab.vue';
import RecommendedTab from './RecommendedTab/RecommendedTab.vue';
import CollectionsTab from './CollectionsTab/CollectionsTab.vue';
import NotPermitted from '@/components/NotPermitted/NotPermitted.vue';

import NotFound from '@/components/NotFound/NotFound.vue';
import RegistrationForm from '@/components/RegistrationForm/RegistrationForm.vue';

import VueSlickCarousel from 'vue-slick-carousel';
import 'vue-slick-carousel/dist/vue-slick-carousel.css';
import 'vue-slick-carousel/dist/vue-slick-carousel-theme.css';

import eventMixin from '../../mixins/event/event.js';
import { Auth } from 'aws-amplify';
import func from '@/others/functions.js';

import keenui from '@/plugins/keenUi';

import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "singleevent" */ '@/../locales/singleevent/'+lang+'.json'),
};

const tabsDict = {
  importLang: (lang) => import( /* webpackChunkName: "default" */ '@/../locales/tabs/'+lang+'.json')
};

import { mapActions, mapGetters, mapState } from 'vuex';

export default {
  name: 'SingleEvent',
  mixins: [eventMixin],
  metaInfo() {
    return {
      title: this.eventObj.name,
      meta: [
        { vmid: 'description', property: 'description', content: this.eventObj.description_short },
        { vmid: 'og:title', property: 'og:title', content: this.eventObj.name },
        { vmid: 'og:description', property: 'og:description', content: this.eventObj.description_short },
      ],
    }
  },
  components: {
    VueSlickCarousel,
    MainTab,
    ArticlesTab,
    TicketsTab,
    DownloadTab,
    StandsTab,
    AgendaTab,
    SponsorsTab,
    EmptyTabContent,
    NotFound,
    RegistrationForm,
    RecommendedTab,
    CollectionsTab,
    NotPermitted,
  },
  beforeRouteLeave (to, from, next) {
    if (to.matched[0].path != '/'+this.routes.event+'/:id/:tabName' && to.matched[0].path != '/'+this.routes.event+'/:id') {
      this.$emit('change-logo', null);
      this.$emit('set-event-visitor-ui', false);
      this.$emit('set-page-type', {
        type: false,
        id: false,
        name: false,
      });
      if (this.$refs.agendaTab && this.$refs.agendaTab.$refs.videoMeeting) {
        this.$refs.agendaTab.$refs.videoMeeting.stopStreams();
      }
    }
    next()
  },

  created(){
    const zoomElem = document.getElementById('zmmtg-root');
    if (zoomElem) {
      zoomElem.classList.remove('opened');
    }
    if(this.$route.query.guestPreview) {
      this.pageGuestStyle = true;
    }
    if(this.$route.query.preview) {
      this.preview = true;
    }

    window.addEventListener('scroll', (evt) => {
      if (window.scrollY > 200) {
        this.isScrolled = true;
      } else {
        this.isScrolled = false;
      }
    });

    if (this.$route.params.tabName) {
      this.tabNameExist = true;
      switch(this.$route.params.tabName) {
        case 'activity':
          break;
        case 'main':
          this.selectTab('dt1');
          break;
        case 'articles':
          this.selectTab('dt5');
          break;
        case 'tickets':
          this.selectTab('dt2');
          break;
        case 'downloadables':
          this.selectTab('dt2');
          break;
        case 'stands':
          this.selectTab('dt3');
          break;
        case 'agenda':
          this.selectTab('dt4');
          break;
        case 'sponsorship':
          this.selectTab('dt7');
          break;
        case 'recommended':
          this.selectTab('dt8');
          break;
        case 'collections':
          this.selectTab('dt9');
          break;
      }
    }
    func.setDictionary(dict, () => {
      func.setDictionary(tabsDict, () => {
        this.localesLoaded = true;
        this.$forceUpdate();
      });
    });

    this.getFormattedEvent(this.$route.params.id, () => {
      this.globalPreload = false;

      if (this.eventObj.notFound || this.eventObj.notPermitted) { return false; }

      this.$emit('set-page-type', {
        type: 'event',
        id: this.eventObj.id,
        name: this.eventObj.name,
      });

      this.checkIsUserVisitor();

      this.videoLink = this.eventObj.video ? this.eventObj.video : '';

      if (this.videoLink.includes('youtu.be')) {
        this.videoLink = this.videoLink.replace('youtu.be/', 'www.youtube.com/watch?v=');
      }

      if (this.eventBranding.logo.url) {
        this.$emit('change-logo', this.eventBranding.logo.url);
      }

      if (this.eventObj.userfields.length) {
        this.getCustomUsersField({
          callback: (response) => {
            if (response.data && response.data.statusCode == '200') {
              const result = [];
              if (response.data.body && response.data.body.length) {
                response.data.body.forEach(field => {
                  if (this.eventObj.userfields.includes(field.fieldname)) {
                    result.push(field);
                  }
                });
              }

              this.customFields = result;
            }

            this.customFieldsReady = true;
            this.$forceUpdate();
          }
        })
      } else {
        this.customFieldsReady = true;
      }

      if (this.showSponsors && !this.pageGuestStyle && !this.preview && this.eventObj.status == 'published') {

        this.apiGetTiersForVisitors({
          eventId: this.eventObj.id,
          callback: (response) => {
            let tiers = response.data.body;
            if (!tiers.length) {
              // this.preload = false;
              this.tiersLoaded = true;
              this.$forceUpdate();
            }
            tiers.forEach((item, index) => {
              if (!item.is_enabled) { return false; }
              item.price = {
                ticket_name: '',
                ticket_price: '',
                ticket_qty: '',
                ticket_descr: '',
              };

              if (item.strings.length) {
                item.strings.forEach(str => {
                  if (str.category == 'name') {
                    item.title = str.value;
                  }
                })
              }

              if (item.pricing && this.userData) {
                this.getTierPricing({
                  id: item.id,
                  callback: (resp) => {
                    if (resp.data.statusCode == '200' && resp.data.body) {
                      item.price.exist = true;
                      item.price.ticket_price = resp.data.body.access_price;
                      item.price.ticket_qty = resp.data.body.quantity;
                      item.price.currency = resp.data.body.access_currency;


                      if (resp.data.body.strings && resp.data.body.strings.length) {
                        resp.data.body.strings.forEach(string => {
                          if (string.category == 'name') {
                            item.price.ticket_name = string.value;
                          }
                          if (string.category == 'description_long') {
                            item.price.ticket_descr = string.value;
                          }
                        })
                      }

                      item.showSwitches = [];
                      Object.keys(item.switches).forEach(key => {
                        if (item.switches[key]) {
                          if (key == 'logo') { item.showSwitches.push(this.tr('se_tiers_logo')) }
                          if (key == 'pics') { item.showSwitches.push(this.tr('se_tiers_pdfimages')) }
                          if (key == 'video') { item.showSwitches.push(this.tr('se_tiers_video')) }
                          if (key == 'banner') { item.showSwitches.push(this.tr('se_tiers_banner')) }
                          if (key == 'lottery') { item.showSwitches.push(this.tr('se_tiers_lottery')) }
                        }
                      });

                      this.tiersList.push(item);
                    }
                    this.$forceUpdate();

                    if (index == (tiers.length - 1)) {
                      this.tiersLoaded = true;
                      this.$forceUpdate();
                    }
                  }
                })
              } else {
                if (index == (tiers.length - 1)) {
                  this.tiersLoaded = true;
                  this.$forceUpdate();
                }
              }
            });


          }
        });
      } else {
        this.tiersLoaded = true;
        this.$forceUpdate();
      }

      this.apiGetOpenArticles({
        type: 'event',
        typeId: this.eventObj.id,
        status: 'published',
        callback: (response)=>{
          if (response.data.body && response.data.body.length) {
            response.data.body.forEach(item => {
              if (!this.usersIdList.includes(item.editor)) {
                this.usersIdList.push(item.editor);

                this.apiGetUser({
                  id: item.editor,
                  callback: (response) => {
                    if (response.data.statusCode == 200) {
                      this.usersList[item.editor] = func.formatUserData(response.data.body);
                    }
                    this.$forceUpdate();
                    this.key++;
                  }
                })

              }

              this.articlesList.push(item);

            })

            this.$forceUpdate();
          }
        }
      });

      this.eventGetStands({
        id: this.eventObj.id,
        search: this.$route.query.s ? this.$route.query.s : false,
        type: 'all',
        callback: (res) => {

          if ( res.status == '200' && res.data.statusCode == '200' && res.data.body ) {

            res.data.body.forEach((item, index) => {

              item.name = '';
              item.description_short = '';
              item.description_long = '';
              item.strings.forEach(str => {
                item[str.category] = str.value;
              });
              item.templateCoverUrl = '';
              item.templateCoverBigUrl = '';
              item.logoUrl = '';
              item.mainContentUrl = '';
              item.carouselArr = [];
              this.parseBrandings(item);

              if ( index == (res.data.body.length - 1) ) {
                this.featuredStandsList = res.data.body;
                this.fsq = true;
              }

            });

            if (!res.data.body.length) {
              this.fsq = true;
            }
          }
        }
      });

      this.apiGetCollections({
        eventId: this.eventObj.id,
        user: Auth.user || this.isLinkedinSignin,
        callback: (res) => {
          if (res.status === 200 && res.data.statusCode === 200 && res.data.body) {
            this.collections = res.data.body;
          }
        },
      });

      if ( (this.isUserAuth && (this.eventObj.company == this.userData.company) && !this.pageGuestStyle) || (this.eventObj.letmein && !this.pageGuestStyle) ) {
          this.isUserOwner = true;
          this.setVisitorUI();
      }
    });

    if (this.$route.query.s) {
      this.selectTab('dt3');
    }

  },
  data: function () {
    return {
      tiersLoaded: false,
      pageGuestStyle: false,
      preview: false,
      isLoggedInG: true,
      activeTab : 'dt8',
      localesLoaded: false,
      isUserOwner: false,
      alreadyVisitor: false,
      isUserSponsor: false,
      globalPreload: true,
      articlesList: [],
      usersIdList: [],
      key: 0,
      showBanner: false,
      showBannerClose: false,
      fsq: false,
      usersList: {},
      tabNameExist: false,
      standsList: [],
      collections: [],
      featuredStandsList: [],
      customFields: [],
      customFieldsReady: false,
      tiersList: [],
      currentSponsorId: null,
      currentSponsorBanner: '',
      currentSponsorBannerUrl: '',
      currentSponsorVideoId: null,
      currentSponsorVideo: '',
      currentSponsorVideoUrl: '',
      videoLink: '',
      videoOpened: false,
      isScrolled: false,
      sponsorsList: [],
      agendaPreload: true,
      agendaOpened: false,
      currentActivity: null,
      registerModalOpened: false,
    }
  },
  methods: {
    ...mapActions([
      'eventGetStands',
      'getUserEvents',
      'apiGetOpenArticles',
      'apiGetUser',
      'getEventPromos',
      'apiPromoShowed',
      'apiWatchPromo',
      'apiGetTiersForVisitors',
      'getTierPricing',
      'apiGetTiers',
      'getCustomUsersField',
      'apiGetEventAvaliablePersonnel',
      'apiGetCollections',
    ]),
    buyTicket() {
      if (this.eventObj.externalTicketUrl) {
        let routeData = this.eventObj.externalTicketUrl
        let newUrl;
        if(routeData.includes("https://")) {
          newUrl = routeData
        } else newUrl = "https://" + routeData
        window.open(newUrl, '_blank').focus();
        return;
      }
      this.jointTheEvent(this.eventObj.pricing.id);
      this.tabClick('dt2');
    },
    closeRegisterModal() {
      this.$refs.registerModal.close();
    },
    jointTheEvent(id) {
      this.registerModalOpened = true;
      this.$forceUpdate();
      this.$refs.registerModal.open()
    },
    customFieldsUpdatedAction(data) {
      this.$refs.ticketsTab.buyTicketAction(this.eventObj.pricing.id);
      this.closeRegisterModal();
    },
    agendaOpenedAction(item) {
      this.currentActivity = item;
      this.agendaOpened = true;
    },
    checkIsUserVisitor() {
      if (this.isUserAuth && !this.pageGuestStyle && this.eventObj.letmein) {
        this.alreadyVisitor = true;
        this.$forceUpdate();
        if (this.showSponsors && !this.preview) {
          this.getEventPromos({
            eventId: this.eventObj.id,
            pagesQuery: ['banner', 'video'],
            callback: (response) => {
              if (response.data.statusCode == '200') {
                if (response.data.body['banner']) {
                  this.currentSponsorId = response.data.body['banner'].id;
                  this.currentSponsorBanner = response.data.body['banner'].banner;
                  this.currentSponsorBannerUrl = response.data.body['banner'].bannerUrl;
                  if (this.currentSponsorId && this.currentSponsorBanner) {
                    this.showBanner = true;
                    setTimeout(() => {
                      this.showBannerClose = true;
                    }, 5000);
                  }
                }

                if (response.data.body['video']) {
                  this.eventObj.currentSponsorVideoId = response.data.body['video'].id;
                  this.eventObj.videoLogo = response.data.body['video'].video;
                  this.eventObj.videoUrl = response.data.body['video'].videoUrl;
                }
              }
            }
          })
        }
        this.$forceUpdate();
        this.setVisitorUI();
      }
    },
    agendaLoadedTrigger(agenda) {
      this.$emit('single-event-agenda-loaded', {
        agenda: agenda,
        eventObj: this.eventObj,
        promoLink: this.videoIframeLink
      });
    },
    setVisitorUI() {
      this.$emit('set-event-visitor-ui', this.eventObj);
      if (this.$route.params.tabName == 'tickets') {
        this.tabClick('dt6');
      }
    },
    tabClick(id) {
      if (this.$refs.agendaTab) {
        this.agendaOpened = false;
        this.$refs.agendaTab.closeVideo();
      }
      if (this.activeTab == id) { return false; }
      let newPath = '';

      let tabSlug = '';
      switch(id) {
        case 'dt1':
          tabSlug = 'main';
          break;
        case 'dt5':
          tabSlug = 'articles';
          break;
        case 'dt2':
          if (this.showTickets) {
            tabSlug = 'downloadables';
          } else {
            tabSlug = 'tickets';
          }
          break;
        case 'dt3':
          tabSlug = 'stands';
          break;
        case 'dt4':
          tabSlug = 'agenda';
          break;
        case 'dt7':
          tabSlug = 'sponsorship';
          break;
        case 'dt8':
          tabSlug = 'recommended';
          break;
        case 'dt9':
          tabSlug = 'collections';
          break;
      }

      if (!tabSlug) { return false; }

      let splittedRoute = this.$route.path.split('/');

      newPath = '/'+splittedRoute[1]+'/'+splittedRoute[2]+'/'+tabSlug;

      this.tabNameExist = true;

      if (this.currentActivity && this.agendaOpened && tabSlug == 'agenda') {
        window.history.pushState('', '', '/'+this.routes.mymeetings+'/'+this.routes.mymeetings_video+'/'+this.currentActivity.id);
      } else {
        this.$router.replace(newPath).catch(err => {});
      }

      this.selectTab(id);
    },
    showNext() {
      this.$refs.event_carousel.next();
    },
    showPrev() {
      this.$refs.event_carousel.prev();
    },
    parseBrandings(event, callback) {
      if (event?.branding?.length) {
        event.branding.forEach(item => {
          let itemFullUrl = func.url_302x211('https://'+this.configs.binary+'/'+item.url);
          let itemBigUrl = func.url_538x315('https://'+this.configs.binary+'/'+item.url);

          if (item.strings && item.strings.length) {
            item.strings.forEach(str => {
              if (str.category == 'description_long') {
                if (str.value == 'main_image') {
                  event.templateCoverUrl = itemFullUrl;
                  event.templateCoverBigUrl = itemBigUrl;
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
          } else if (item.url.indexOf('/d-main_image')>-1) {
            event.templateCoverUrl = itemFullUrl;
            event.templateCoverBigUrl = itemBigUrl;
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
    selectTab(id) {
      if (this.$refs.single_tabs) {
        this.$refs.single_tabs.setActiveTab(id);
      }
      this.activeTab = id;
    },
    bannerClick() {
      if (this.currentSponsorBannerUrl) {
        this.apiWatchPromo({
          url: this.currentSponsorBannerUrl,
          callback: (response) => {
            if (response.data.statusCode == '301' && response.data.headers && response.data.headers.Location) {
              window.open(response.data.headers.Location);
            }
          }
        });
      }
     },
     closeBanner() {
       if (this.currentSponsorId) {
         this.apiPromoShowed({
           eventId: this.eventObj.id,
           relationId: this.currentSponsorId,
           placeId: 'banner'
         });
       }
       this.showBanner = false;
     },
     ticketBought() {
       this.alreadyVisitor = true;
       this.eventObj.letmein = true;
       this.setVisitorUI();
       this.$forceUpdate();
     },
  },
  computed: {
    ...mapGetters([
      'tr',
      'getAuthUser',
      'getSignedIn',
      'routes',
      'getLocale',
      'features',
      'isLinkedinSignin',
    ]),
    ...mapState([
      'userData',
    ]),
    eventTotalDays() {
      const date1 = new Date(this.eventObj.dateStart);
      const date2 = new Date(this.eventObj.dateEnd);
      const one_day = 1000*60*60*24;

      return Math.ceil( (date2.getTime() - date1.getTime() ) / one_day);
    },
    eventCurrentDay() {
      const date1 = new Date(this.eventObj.dateStart);
      const now = new Date();
      let difference = now - date1;
      return Math.trunc(difference /(1000*60*60*24)) + 1;
    },
    showSponsors() {
      return this.features.sponsors;
    },
    isUserAuth() {
      return ( this.userData || (this.getAuthUser && this.getSignedIn) || this.$store.getters.getUser || Auth.user ) && !this.pageGuestStyle;
    },
    isLive() {
      const start = new Date(this.eventObj.dateStart);
      const end = new Date(this.eventObj.dateEnd);
      const now = new Date();

      return now < end && now > start;
    },
    startPricing() {
      const currs = {
        'EUR': '€',
        'USD': '$'
      };
      if (this.eventObj.pricing && this.eventObj.pricing.access_price && currs[this.eventObj.pricing.access_currency]) {

        if (this.eventObj.pricing.access_price == '0') {
          return 'Free';
        }
        return currs[this.eventObj.pricing.access_currency]+this.eventObj.pricing.access_price;

      } else {
        return '';
      }

    },
    customEventColorStyle() {
      return this.eventObj.color ? 'background-color: '+this.eventObj.color: '';
    },
    customEventBorderStyle() {
      return this.eventObj.color ? 'border-color: '+this.eventObj.color: '';
    },
    eventBannerStyle() {
      return this.eventBranding.templateBanner ? 'background-image: url('+this.eventBranding.templateBanner.url+')' : '';
    },
    showTickets() {
      return (this.isUserOwner || this.alreadyVisitor || this.isUserSponsor) && !this.pageGuestStyle;
    },
    downloadablesLength() {
      return Object.keys(this.evtDownloadables.exist).length;
    },
    standsLoaded() {
      return this.fsq;
    },
    videoIframeLink() {
      if (this.videoLink.includes('youtube.com')) {
        return 'https://www.youtube.com/embed/'+this.videoLink.split('?v=')[1];
      }
      if (this.videoLink.includes('vimeo.com')) {
        return 'https://player.vimeo.com/video/'+this.videoLink.split('com/')[1];
      }
      return false;
    },
  }
}
