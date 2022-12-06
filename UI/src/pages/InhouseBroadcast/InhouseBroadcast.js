import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "inhousebroad" */ '@/../locales/inhouse_broadcast/'+lang+'.json')
};


export default {
  name: 'InhouseBroadcast',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('inhouse_broadcast_title') : 'In-House video broadcast with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('inhouse_broadcast_text') : 'What kind of an event would it be without an agenda and video translation service? We worked very hard and finally we are ready to present our video broadcasting service with a few perks.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('inhouse_broadcast_title') : 'In-House video broadcast with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('inhouse_broadcast_text') : 'What kind of an event would it be without an agenda and video translation service? We worked very hard and finally we are ready to present our video broadcasting service with a few perks.' },
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
