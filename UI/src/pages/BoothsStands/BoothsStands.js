import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import OtherFeatures from '@/components/OtherFeatures/OtherFeatures.vue';
import StaticBottomSection from '@/components/StaticBottomSection/StaticBottomSection.vue';
import RequestDemo from '@/components/RequestDemo/RequestDemo.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "boothstands" */ '@/../locales/booths_and_stands/'+lang+'.json')
};


export default {
  name: 'BoothsStands',
  components: {
    OtherFeatures,
    StaticBottomSection,
    RequestDemo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('stands_and_booths_title') : 'Unlimited number of stands/booths',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('stands_and_booths_text') : 'One of the advantages of hosting an online/virtual events is that there is no \"floor space\" restrictions. We allow anyone to invite as many exhibitors as they can. The more the merrier!' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('stands_and_booths_title') : 'Unlimited number of stands/booths' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('stands_and_booths_text') : 'One of the advantages of hosting an online/virtual events is that there is no \"floor space\" restrictions. We allow anyone to invite as many exhibitors as they can. The more the merrier!' },
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
