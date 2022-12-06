import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "advsponsors" */ '@/../locales/advanced_sponsorships/'+lang+'.json')
};


export default {
  name: 'AdvancedSponsorships',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('advanced_sponsorship_title') : 'Advanced sponsorship with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('advanced_sponsorship_text') : 'Sponsors sometimes are one of the most important revenue generators on the event, therefore we find that interaction of the visitor/attendee and the sponsors is crucial. We allot this to happen!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('advanced_sponsorship_title') : 'Advanced sponsorship with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('advanced_sponsorship_text') : 'Sponsors sometimes are one of the most important revenue generators on the event, therefore we find that interaction of the visitor/attendee and the sponsors is crucial. We allot this to happen!' },
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
