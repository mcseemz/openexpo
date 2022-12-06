import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "streamintegr" */ '@/../locales/streaming_integrations/'+lang+'.json')
};


export default {
  name: 'StreamingIntegrations',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('streaming_integrations_title') : 'Streaming integrations at Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('streaming_integrations_text') : 'At times it is benefitial to use a third party video provider like Zoom or Twitch. We have heard our customers and made this possible!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('streaming_integrations_title') : 'Streaming integrations at Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('streaming_integrations_text') : 'At times it is benefitial to use a third party video provider like Zoom or Twitch. We have heard our customers and made this possible!' },
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
