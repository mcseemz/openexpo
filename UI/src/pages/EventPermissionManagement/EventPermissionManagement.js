import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "eventpremman" */ '@/../locales/event_permissions_management/'+lang+'.json')
};


export default {
  name: 'EventPermissionManagement',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('event_permission_title') : 'Event permission management',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('event_permission_text') : 'Roles and permissions are one of the key features in the event. Some staff would require certain restrictions to some of the event\'s places. I.e one might not need to edit logos, or sponsors.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('event_permission_title') : 'Event permission management' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('event_permission_text') : 'Roles and permissions are one of the key features in the event. Some staff would require certain restrictions to some of the event\'s places. I.e one might not need to edit logos, or sponsors.' },
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
