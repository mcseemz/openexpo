import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "setupmeets" */ '@/../locales/setup_meetings/'+lang+'.json')
};


export default {
  name: 'SetupMeetings',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('setup_meetings_title') : 'Setup meetings with stand owners',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('setup_meetings_text') : 'Setting up meetings with stand\'s/booth\'s staff is essential to networking. Feel free to roam around each and every exhibitor\'s booth and find the right staff member to contact!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('setup_meetings_title') : 'Setup meetings with stand owners' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('setup_meetings_text') : 'Setting up meetings with stand\'s/booth\'s staff is essential to networking. Feel free to roam around each and every exhibitor\'s booth and find the right staff member to contact!' },
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
