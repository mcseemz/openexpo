import {mapActions, mapGetters} from 'vuex';
import func from '@/others/functions.js';
import {I18n} from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "agenda" */ '@/../locales/agenda/' + lang + '.json')
};


export default {
  name: 'Agenda',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('advanced_agenda_title') : 'Advantages of Agenda at Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('advanced_agenda_text') : 'When organizing an online, an offline or hybrid event, the first place attendees would look is at the event\'s agenda. Usual questions pop in their minds like: Who is to present? What are the topics discussed?' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('advanced_agenda_title') : 'Advantages of Agenda at Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('advanced_agenda_text') : 'When organizing an online, an offline or hybrid event, the first place attendees would look is at the event\'s agenda. Usual questions pop in their minds like: Who is to present? What are the topics discussed?' },
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
