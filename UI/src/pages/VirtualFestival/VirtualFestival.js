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
  importLang: (lang) => import( /* webpackChunkName: "virtualfest" */ '@/../locales/virtual_festival/'+lang+'.json')
};


export default {
  name: 'VirtualFestival',
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
      title: this.localesLoaded ? this.tr('virtual_film_festival_title') : 'Host a virtual festival with Openexpo!',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('virtual_film_festival_text') : 'Whether you are hosting a <span class\"orange\">film</span> festival or any other kind of festival, you came to the right place. Our platform gives one all kinds of customisations and fun and simple interaction!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('virtual_film_festival_title') : 'Host a virtual festival with Openexpo!' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('virtual_film_festival_text') : 'Whether you are hosting a <span class\"orange\">film</span> festival or any other kind of festival, you came to the right place. Our platform gives one all kinds of customisations and fun and simple interaction!' },
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
