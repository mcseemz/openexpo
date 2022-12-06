import { mapActions, mapGetters } from 'vuex';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "cookies" */ '@/../locales/cookies/'+lang+'.json')
};


export default {
  name: 'Cookies',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('cookies_title') : 'Cookies',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('cookies_title') : 'Cookies' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('cookies_title') : 'Cookies' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('cookies_title') : 'Cookies' },
      ], 
    }
  },
  mounted() {
    dict['importLang']('en_GB').then((resp) => {
      const dicts = {};
      dicts[this.getLocale] = resp.default;

      if (this.getLocale == 'en_GB') {
        I18n.putVocabularies(dicts);
        this.localesLoaded = true;
        this.$forceUpdate();  
      } else {
        dict['importLang'](this.getLocale).then((resp) => {
          Object.assign(dicts[this.getLocale], resp.default);
          I18n.putVocabularies(dicts);
          this.localesLoaded = true;
          this.$forceUpdate();
        }); 
      }
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
