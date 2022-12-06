import { mapActions, mapGetters } from 'vuex';

import { I18n } from 'aws-amplify';

// const dict = {
//   en_GB: () => import('@/../locales/report/en_GB.json'),
//   de_DE: () => import('@/../locales/report/de_DE.json'),
//   ru_RU: () => import('@/../locales/report/ru_RU.json'),
// };

export default {
  name: 'Report',
  components: {

  },
  metaInfo() {
    return {
      title: 'Sponsors report page',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('page_sellticketsonline_title') : 'AboutUs' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('page_sellticketsonline_title') : 'AboutUs' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('page_sellticketsonline_title') : 'AboutUs' },
      ], 
    }
    
  },
  mounted() {
    this.localesLoaded = true;
    dict[this.getLocale]().then((resp) => {
      const dict = {};
      dict[this.getLocale] = resp.default;
      I18n.putVocabularies(dict);
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
    download(filename, text) {
      // var element = document.createElement('a');
      // element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
      // element.setAttribute('download', filename);

      // element.style.display = 'none';
      // document.body.appendChild(element);

      // element.click();

      // document.body.removeChild(element);
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale'
    ]),
    fileData() {
      let text = 'test11,test12\r\ntest21,test22';
      return 'data:text/csv;charset=utf-8,' + encodeURIComponent(text)
    }
  }
}
