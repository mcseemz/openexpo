import keenui from '@/plugins/keenUi';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "myevents" */ '@/../locales/myevents/'+lang+'.json')
};

export default {
  name: 'MyEvents',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('myevents_title') : 'My events',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('myevents_title') : 'My events' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('myevents_title') : 'My events' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('myevents_title') : 'My events' },
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
