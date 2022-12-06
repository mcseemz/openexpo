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
  importLang: (lang) => import( /* webpackChunkName: "virtualconf" */ '@/../locales/virtual_conference/'+lang+'.json')
};


export default {
  name: 'VirtualConference',
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
  metaInfo: {
    title: 'Virtual Conference with Openexpo! | Openexpo Platform',
    meta: [
      { vmid: 'description', property: 'description', content: 'Virtual conference usually is simple to create, but we spice this opportunity up and deliver the \"few\" features to enhance the experience.' },
      { vmid: 'og:title', property: 'og:title', content: 'Virtual Conference with Openexpo!' },
      { vmid: 'og:description', property: 'og:description', content: 'Virtual conference usually is simple to create, but we spice this opportunity up and deliver the \"few\" features to enhance the experience.' },
    ],
  },
  // metaInfo() {
  //   return {
  //     title: this.localesLoaded ? this.tr('virtual_conference_title') : 'Virtual Conference with Openexpo!',
  //     meta: [
  //       { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('virtual_conference_title') : 'Virtual conference usually is simple to create, but we spice this opportunity up and deliver the \"few\" features to enhance the experience.' },
  //       { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('virtual_conference_title') : 'Virtual Conference with Openexpo!' },
  //       { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('virtual_conference_title') : 'Virtual conference usually is simple to create, but we spice this opportunity up and deliver the \"few\" features to enhance the experience.' },
  //     ],
  //   }
  // },
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
