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
  importLang: (lang) => import( /* webpackChunkName: "advwebinar" */ '@/../locales/advanced_webinar/'+lang+'.json')
};


export default {
  name: 'AdvancedWebinar',
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
      title: this.localesLoaded ? this.tr('advanced_webinar_title') : 'Advanced webinar platform on Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('advanced_webinar_text') : 'Sometimes it takes more just giving a speech on camera. Our platform allows webinars be more interactive than an ordinary talk!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('advanced_webinar_title') : 'Advanced webinar platform on Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('advanced_webinar_text') : 'Sometimes it takes more just giving a speech on camera. Our platform allows webinars be more interactive than an ordinary talk!' },
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
