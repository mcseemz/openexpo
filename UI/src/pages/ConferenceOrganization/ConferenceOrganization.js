import { mapActions, mapGetters } from 'vuex';
import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "conforg" */ '@/../locales/conference_organization/'+lang+'.json')
};


export default {
  name: 'ConferenceOrganization',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('page_conforg_title') : 'ConferenceOrganization',
      titleTemplate: "%s  | Openexpo Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('page_conforg_title') : 'ConferenceOrganization' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('page_conforg_title') : 'ConferenceOrganization' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('page_conforg_title') : 'ConferenceOrganization' },
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

  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale'
    ]),
  }
}
