import keenui from '@/plugins/keenUi';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "mystands" */ '@/../locales/mystands/'+lang+'.json')
};

export default {
  name: 'MyStands',
  components: {
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('mystands_title') : 'My stands',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('mystands_title') : 'My stands' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('mystands_title') : 'My stands' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('mystands_title') : 'My stands' },
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
      isLoggedInG: true,
      events_list: ['ev', 'ev', 'ev', 'ev', 'ev', 'ev'],
    }
  },

  methods: {
     
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'getLocale'
    ]),
    route() {
      
      return this.$route;
    }
  }
}
