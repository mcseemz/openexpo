import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import AddCustomFields from '@/components/Solutions/AddCustomFields/AddCustomFields.vue';
import Customisation from '@/components/Solutions/Customisation/Customisation.vue';
import EngageSponsors from '@/components/Solutions/EngageSponsors/EngageSponsors.vue';
import EveryInOnePlace from '@/components/Solutions/EveryInOnePlace/EveryInOnePlace.vue';
import FindAnything from '@/components/Solutions/FindAnything/FindAnything.vue';
import InviteSponsors from '@/components/Solutions/InviteSponsors/InviteSponsors.vue';
import SolutionsCarousel from '@/components/Solutions/SolutionsCarousel/SolutionsCarousel.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "virtualwork" */ '@/../locales/virtual_workshop/'+lang+'.json')
};


export default {
  name: 'VirtualWorkshops',
  components: {
    AddCustomFields,
    Customisation,
    EngageSponsors,
    EveryInOnePlace,
    FindAnything,
    InviteSponsors,
    SolutionsCarousel,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('virtual_workshop_title') : 'Virtual Workshop with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('virtual_workshop_text') : 'Creating a virtual workshop is treaky, especially when the organiser wants to engage the visitors to the maximum. We at Openexpo make this happen!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('virtual_workshop_title') : 'Virtual Workshop with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('virtual_workshop_text') : 'Creating a virtual workshop is treaky, especially when the organiser wants to engage the visitors to the maximum. We at Openexpo make this happen!' },
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
