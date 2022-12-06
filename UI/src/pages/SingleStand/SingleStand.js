import EmptyTabContent from '../../components/EmptyTabContent/EmptyTabContent.vue'

import MainTab from '@/components/MainTab/MainTab.vue'
import DownloadTab from '@/components/DownloadTab/DownloadTab.vue'
import StaffTab from './StaffTab/StaffTab.vue'
import AgendaTab from '@/components/AgendaTab/AgendaTab.vue'
import CollectionsTab from '../SingleEvent/CollectionsTab/CollectionsTab.vue';

import NotFound from '@/components/NotFound/NotFound.vue';

import VueSlickCarousel from 'vue-slick-carousel'
import 'vue-slick-carousel/dist/vue-slick-carousel.css'
// optional style for arrows & dots
import 'vue-slick-carousel/dist/vue-slick-carousel-theme.css'

import standMixin from '../../mixins/stand.js';
import eventMixin from '../../mixins/event/event.js';

import { mapActions, mapGetters, mapState } from 'vuex';
import func from '@/others/functions.js';
import keenui from '@/plugins/keenUi';

import { I18n, Auth } from 'aws-amplify';


const dict = {
  importLang: (lang) => import( /* webpackChunkName: "singlestand" */ '@/../locales/singlestand/'+lang+'.json')
};

const tabsDict = {
  importLang: (lang) => import( /* webpackChunkName: "default" */ '@/../locales/tabs/'+lang+'.json')
};

export default {
  name: 'SingleStand',
  mixins: [standMixin, eventMixin],
  metaInfo() {
    return {
      title: this.standObj.name,
      meta: [
        { vmid: 'description', property: 'description', content: this.standObj.description_short },
        { vmid: 'og:title', property: 'og:title', content: this.standObj.name },
        { vmid: 'og:description', property: 'og:description', content: this.standObj.description_short },
      ],
    }
  },
  components: {
    VueSlickCarousel,
    MainTab,
    DownloadTab,
    AgendaTab,
    StaffTab,
    EmptyTabContent,
    NotFound,
    CollectionsTab,
  },
  beforeRouteLeave (to, from, next) {
    this.$emit('set-page-type', {
      type: false,
      id: false,
      name: false,
    });
    if (this.$refs.agendaTab && this.$refs.agendaTab.$refs.videoMeeting) {
      this.$refs.agendaTab.$refs.videoMeeting.stopStreams();
    }
    next()
  },
  created(){
    if(this.$route.query.preview) {
      this.preview = true;
    }

    func.setDictionary(dict, () => {
      func.setDictionary(tabsDict, () => {
        this.localesLoaded = true;
        this.$forceUpdate();
      });
    });

    this.getFormattedStand(this.$route.params.id, (response) => {

      if (!this.userData && this.standObj.status == 'draft') { this.$router.push('/') }

      if (this.standObj.notFound) { this.globalPreload = false; return false; }
      // this.$emit('set-page-type', {
      //   type: 'stand',
      //   id: this.standObj.id,
      //   name: this.standObj.name,
      // });

      this.getFormattedEvent(this.standObj.eventId, (response) => {
        this.globalPreload = false;
        this.checkIsUserVisitor();

        if (this.eventObj.letmein) {
          this.alreadyVisitor = true;
        }

        this.$emit('set-page-type', {
          type: 'event',
          id: this.eventObj.id,
          name: this.eventObj.name,
        });

        this.$store.commit('setLogo',this.eventBranding.logo.url)
        if (this.standBranding.templateCover.url) {
          // this.$emit('change-logo', this.standBranding.templateCover.url, 'stand', this.eventObj.id);
        } else if (this.eventBranding.logo.url) {
          this.$emit('change-logo', this.eventBranding.logo.url, 'stand', this.eventObj.id);
        }

        if (this.eventObj.letmein) {
          this.$emit('set-event-visitor-ui', this.eventObj);
        }

         this.apiGetCollections({
          eventId: this.eventObj.id,
          standId: this.standObj.id,
          user: Auth.user || this.isLinkedinSignin,
          callback: (res) => {
            if (res.status === 200 && res.data.statusCode === 200 && res.data.body) {
              this.collections = res.data.body;
            }
          },
        });
      });

    });

  },
  data: function () {
    return {
      localesLoaded: false,
      isLoggedInG: true,
      categoriesList: ['All', 'Business', 'Health', 'Film & Media', 'Technology', 'Travel & Outdoor'],
      activeTab : 'dt1',
      globalPreload: true,
      alreadyVisitor: false,
      preview: false,

      standsList: [],
      collections: [],
    }
  },

  methods: {

    ...mapActions([
      'eventGetStands',
      'getUserEvents',
      'apiGetCollections'
    ]),
    checkIsUserVisitor() {
      if (this.userData) {
        this.getUserEvents({
          type: 'visitor',
          callback: (response) => {

            if ( response.data && response.data.statusCode == '200' && response.data.body && response.data.body.length ) {

              response.data.body.forEach(event => {
                if (event.id == this.eventObj.id) {
                  this.alreadyVisitor = true;
                  this.$forceUpdate();
                }
              });
            }
          }
        });

      }
    },
     showNext() {
        this.$refs.event_carousel.next()
     },
     showPrev() {
        this.$refs.event_carousel.prev()
     },

     parseBrandings(event) {
      if ( event && event.branding && event.branding.length ) {
        event.branding.forEach(item => {
          if (!item.strings && !item.strings.length) {
            return false;
          }
          this.getDownloadFileUrl({
            id : item.id,
            callback : (response) => {
              if (response.data.body.url) {
                if (item.strings && item.strings.length) {
                  item.strings.forEach(str => {
                    if (str.category == 'description_long') {
                      if (str.value == 'main_image') {
                        event.templateCoverUrl = response.data.body.url;
                      }
                      if (str.value == 'logo_image') {
                        event.logoUrl = response.data.body.url;
                      }
                      if (str.value == 'content_main_image') {
                        event.mainContentUrl = response.data.body.url;
                      }
                      if (str.value == 'content_carousel') {
                        event.carouselArr.push(response.data.body.url);
                      }
                    }
                  });
                } else if (item.url.indexOf('/d-main_image')>-1) {
                  event.templateCoverUrl = response.data.body.url;
                } else if (item.url.indexOf('logo_image')>-1) {
                  event.logoUrl = response.data.body.url;
                } else if (item.url.indexOf('content_main_image')>-1) {
                  event.mainContentUrl = response.data.body.url;
                } else if (item.url.indexOf('content_carousel')>-1) {
                  event.carouselArr.push(response.data.body.url);
                }
              }
            },
          });

        });

      }

    },


    selectTab(id) {
      if (this.$refs.agendaTab) {
        this.agendaOpened = false;
        this.$refs.agendaTab.closeVideo();
      }

      this.$refs.single_tabs.setActiveTab(id);
      this.activeTab = id;
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'getLocale',
      'isLinkedinSignin',
      'getStandLogo'
    ]),
    ...mapState([
      'userData'
    ]),
    standBannerStyle() {
      return this.standBranding.templateBanner ? 'background-image: url('+this.standBranding.templateBanner.url+')' : '';
    },
    customStandColorStyle() {
      return this.standObj.color ? 'background-color: '+this.standObj.color: '';
    },
    customStandBorderStyle() {
      return this.standObj.color ? 'border-color: '+this.standObj.color: '';
    },
  }
}
