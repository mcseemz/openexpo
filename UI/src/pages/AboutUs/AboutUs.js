import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import keenui from '@/plugins/keenUi';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "aboutus" */ '@/../locales/about_us/'+lang+'.json')
};

export default {
  name: 'AboutUs',
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('about_us_title') : 'AboutUs',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('about_us_title') : 'AboutUs' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('about_us_title') : 'AboutUs' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('about_us_title') : 'AboutUs' },
      ], 
    }
    
  },
  components: {
    OtherFeatures,
    StaticBottomSection
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();  
    });
  },
  data: function () {
    return {
      localesLoaded: false,
      currentTab: 'tab1',
    }
  },

  methods: {
    setAccordeon(tab) {
      this.currentTab = tab;
      this.$forceUpdate();
      ['tab1', 'tab2', 'tab3', 'tab4'].forEach(item => {
        if (item != tab) {
          this.$refs[item].open = false;
          this.$refs[item].isOpen = false;
        }
      })
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'getLocale'
    ]),
  }
}
