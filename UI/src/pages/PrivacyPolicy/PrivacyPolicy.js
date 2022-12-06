import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "privacypolicy" */ '@/../locales/privacy_policy/'+lang+'.json')
};

export default {
  name: 'PrivacyPolicy',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('pp_title') : 'PrivacyPolicy',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('pp_title') : 'PrivacyPolicy' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('pp_title') : 'PrivacyPolicy' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('pp_title') : 'PrivacyPolicy' },
      ], 
    }
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
    }
  },

  methods: {
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale'
    ]),
  }
}
