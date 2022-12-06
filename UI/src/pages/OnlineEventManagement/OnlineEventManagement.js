import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "onleventman" */ '@/../locales/online_event_management/'+lang+'.json')
};

export default {
  name: 'OnlineEventManagement',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('page_oem_title') : 'OnlineEventManagement',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('page_oem_title') : 'OnlineEventManagement' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('page_oem_title') : 'OnlineEventManagement' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('page_oem_title') : 'OnlineEventManagement' },
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
