import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "contentevent" */ '@/../locales/content_of_the_event/'+lang+'.json')
};


export default {
  name: 'ContentOfTheEvent',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('content_creation_of_the_event_title') : 'Content creation for the event at Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('content_creation_of_the_event_text') : 'Before broadcasting live, event organiser requires to create content and market the event(product) out as much as possible, therefore Openexpo provides the functionality of the content creation in different forms.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('content_creation_of_the_event_title') : 'Content creation for the event at Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('content_creation_of_the_event_text') : 'Before broadcasting live, event organiser requires to create content and market the event(product) out as much as possible, therefore Openexpo provides the functionality of the content creation in different forms.' },
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
