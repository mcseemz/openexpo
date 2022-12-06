import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "chatatevent" */ '@/../locales/chat_at_the_event/'+lang+'.json')
};


export default {
  name: 'ChatAtTheEvent',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('chat_on_the_event_title') : 'Chat with the stand\'s staff or chat with the speakers!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('chat_on_the_event_text') : 'The primary online way how to engage is by chatting. Our platform allows to participate in conversation with the speakers or other attendees whilst listening to the In-House broadcasting' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('chat_on_the_event_title') : 'Chat with the stand\'s staff or chat with the speakers!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('chat_on_the_event_text') : 'The primary online way how to engage is by chatting. Our platform allows to participate in conversation with the speakers or other attendees whilst listening to the In-House broadcasting' },
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
