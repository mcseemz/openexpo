import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "eventcustom" */ '@/../locales/event_customisation/'+lang+'.json')
};


export default {
  name: 'EventCustomisation',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('event_customisation_title') : 'Event customisation with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('event_customisation_text') : 'Molding the event to the event organiser\'s view in a few clicks is one of our core beliefs. We always target simplifaction and customisation that meets quality.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('event_customisation_title') : 'Event customisation with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('event_customisation_text') : 'Molding the event to the event organiser\'s view in a few clicks is one of our core beliefs. We always target simplifaction and customisation that meets quality.' },
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
