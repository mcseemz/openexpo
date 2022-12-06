import keenui from '@/plugins/keenUi';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "mychats" */ '@/../locales/mychats/'+lang+'.json')
};

export default {
  name: 'MyChats',
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('mychats_title') : 'My chats',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('mychats_title') : 'My chats' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('mychats_title') : 'My chats' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('mychats_title') : 'My chats' },
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
  computed: {
    ...mapGetters([
      'tr',
      'routes',
    ]),
  }
}
