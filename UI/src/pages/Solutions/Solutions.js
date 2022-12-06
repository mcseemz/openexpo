import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "solutions" */ '@/../locales/solutions/'+lang+'.json')
};


export default {
  name: 'Solutions',
  components: {
    OtherFeatures,
    StaticBottomSection
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('openexpo_solutions_title') : 'Find the right solution for you with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('openexpo_solutions_text') : 'Imagine your online event with an UNLIMITED number of active participants, stands and booths from anywhere in the world without any restraints by space or number!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('openexpo_solutions_title') : 'Find the right solution for you with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('openexpo_solutions_text') : 'Imagine your online event with an UNLIMITED number of active participants, stands and booths from anywhere in the world without any restraints by space or number!' },
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

    }
  },

  methods: {

  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale',
      'routes'
    ]),
  }
}
