import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';

import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "howitworks" */ '@/../locales/how_it_works/'+lang+'.json')
};
const faq_dict = {
  importLang: (lang) => import( /* webpackChunkName: "homefaq" */ '@/../locales/home/faq/'+lang+'.json')
};
export default {
  name: 'HowItWorks',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('how_it_works_title') : 'HowItWorks',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('how_it_works_title') : 'HowItWorks' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('how_it_works_title') : 'HowItWorks' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('how_it_works_title') : 'HowItWorks' },
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
  },
  data: function () {
    return {
      localesLoaded: false,
      faqList: {},
      accordions: {
        0: true,
        1: false,
        2: false,
        3: false,
      }
    }
  },

  methods: {
    onAccordionOpen(id) {
      Object.keys(this.accordions).forEach(key => {
        this.accordions[key] = key == id;
      });
    },
    onAccordionClose(key) {
      this.accordions[key] = false;
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale',
      'routes'
    ]),

    getFaq() {
      if (this.faqList[this.getLocale] && this.faqList[this.getLocale].tab_items) {
        return this.faqList[this.getLocale].tab_items;  
      }
      return [];
      
    },
  }
}
