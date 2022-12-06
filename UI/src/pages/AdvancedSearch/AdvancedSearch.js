import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "advsearch" */ '@/../locales/advanced_search/'+lang+'.json')
};


export default {
  name: 'AdvancedSearch',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('advanced_search_title') : 'Advanced search at Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('advanced_search_text') : 'Finding different type of information on a crowded event is a primary functionality. Whereas trying to find the needed company by a specific category or a speaker on the event.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('advanced_search_title') : 'Advanced search at Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('advanced_search_text') : 'Finding different type of information on a crowded event is a primary functionality. Whereas trying to find the needed company by a specific category or a speaker on the event.' },
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
    requestDemoClick() {
      this.$refs.request_demo.openRequestModal()
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale',
      'routes'
    ]),
  }
}
