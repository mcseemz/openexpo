import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import AddCustomFields from '@/components/Solutions/AddCustomFields/AddCustomFields.vue';
import Customisation from '@/components/Solutions/Customisation/Customisation.vue';
import EngageSponsors from '@/components/Solutions/EngageSponsors/EngageSponsors.vue';
import EveryInOnePlace from '@/components/Solutions/EveryInOnePlace/EveryInOnePlace.vue';
import FindAnything from '@/components/Solutions/FindAnything/FindAnything.vue';
import InviteSponsors from '@/components/Solutions/InviteSponsors/InviteSponsors.vue';
import EventBroadcast from '@/components/Solutions/EventBroadcast/EventBroadcast.vue';
import SolutionsCarousel from '@/components/Solutions/SolutionsCarousel/SolutionsCarousel.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "onlineexhib" */ '@/../locales/online_exhibition/'+lang+'.json')
};


export default {
  name: 'OnlineExhibition',
  components: {
    AddCustomFields,
    Customisation,
    EngageSponsors,
    EveryInOnePlace,
    FindAnything,
    InviteSponsors,
    EventBroadcast,
    SolutionsCarousel,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('virtual_online_exhibition_title') : 'Online Exhibition Platform with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('virtual_online_exhibition_text') : 'Create an advanced, interactive, fun <span class=\"orange\">virtual trade show</span> with us! Find loads of different exciting features that can help you engage the attendees and exhibitors!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('virtual_online_exhibition_title') : 'Online Exhibition Platform with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('virtual_online_exhibition_text') : 'Create an advanced, interactive, fun <span class=\"orange\">virtual trade show</span> with us! Find loads of different exciting features that can help you engage the attendees and exhibitors!' },
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
