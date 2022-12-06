import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';

import Vue from 'vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "termsconditions" */ '@/../locales/terms_conditions/'+lang+'.json')
};



export default {
  name: 'TermsConditions',
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('tc_title') : 'TermsConditions',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('tc_title') : 'TermsConditions' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('tc_title') : 'TermsConditions' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('tc_title') : 'TermsConditions' },
      ], 
    }
    
  },
  components: {

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
