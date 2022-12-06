import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "customfields" */ '@/../locales/custom_field/'+lang+'.json')
};


export default {
  name: 'CustomField',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('custom_field_title') : 'Register with custom fields at Openexpo!',
      titleTemplate: "%s  | OPenexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('custom_field_text') : 'Event organiser would want to know their customer on the registration, that is why we allow to add custom fields at the registration point. Such fields like profession, company position would help match attendees with potential counterparts.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('custom_field_title') : 'Register with custom fields at Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('custom_field_text') : 'Event organiser would want to know their customer on the registration, that is why we allow to add custom fields at the registration point. Such fields like profession, company position would help match attendees with potential counterparts.' },
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
