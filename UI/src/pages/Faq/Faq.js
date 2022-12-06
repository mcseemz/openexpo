import keenui from '@/plugins/keenUi';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "faq" */ '@/../locales/faq/'+lang+'.json'),
  importTabs: (lang) => import( /* webpackChunkName: "faq" */ '@/../locales/faq/tabs/'+lang+'.json')
};


export default {
  name: 'Faq',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('faq_title') : 'Faq',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('faq_title') : 'Faq' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('faq_title') : 'Faq' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('faq_title') : 'Faq' },
      ], 
    }
  },
  created() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();  
    });

    dict['importTabs'](this.getLocale).then((resp) => {
      this.faqList = {};
      this.faqList[this.getLocale] = resp.default;  
      this.$forceUpdate();
    });
    
    // console.log(this.faqTabs);
  },
  data: function () {
    return {
      localesLoaded: false,
      activeTab: 'dt0',
      faqList: {},
      searchInput: '',

    }
  },

  methods: {
    selectTab(id) {
      // console.log(this.$refs);
      this.$refs.faq_tabs.setActiveTab(id);
      this.activeTab = id;
    },
    filterFaq() {
      console.log(this.searchInput);
      this.$forceUpdate();
    }
  },
  computed: {
    ...mapGetters([
      'getLocale',
      'tr',
    ]),
    faqTabs() {
      if (this.faqList[this.getLocale] && this.faqList[this.getLocale].faq_tabs) {

        if ( !this.searchInput ) {

          return this.faqList[this.getLocale].faq_tabs;  

        } else {
          let result = [];
          this.faqList[this.getLocale].faq_tabs.forEach(item => {
            result.push({
              svg_icon: item.svg_icon,
              tab_title: item.tab_title,
              tab_items: item.tab_items.filter(faq => {
                return faq.item_title.toLowerCase().indexOf(this.searchInput.toLowerCase()) != -1;
              }),
            });
          });

          return result;
          // return this.faqList[this.getLocale].faq_tabs.filter(item => {

          //   return item.tab_title.toLowerCase().indexOf(this.searchInput.toLowerCase()) != -1;

          // });
        }
        
      } else {
        return [];
      }
    }
  }
}
