import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Footer',
  mounted() {
    this.getLanguages(response => {
      // console.log('getLanguages',response);
      if ( response.data.statusCode == 200 ) {
        // console.log(200);
        let langs = [];
        response.data.body.forEach(item => {


          langs.push({
            name: item.value,
            iso: item.language
          });  
        })
        this.langList = langs;
        this.setLocalesList(langs);
        this.$forceUpdate()
      }
    });
  },
  data() {
    return {
      langList: null,
    }
  },
  methods: {
    
    ...mapActions([
      
      'putVocabularies',
      'putVocabulariesForLanguage',
      'setLocale',
      'getLanguages',
      'setLocalesList'
    ]),

    setLoc(locale) {
    	this.setLocale(locale)
    	// this.$forceUpdate();
    }
  },
  computed: {
  	...mapGetters([
  		'getAllLocales',
  		'getLocale',
		  'tr',
      'routes',
      'features'
  	]),

    getLocaleName() {
      let result = '';
      if (this.langList) {
        this.langList.forEach(item => {
          if (this.getLocale == item.iso) {
            result = item.name;
          }
        })
      }
      return result
    }

  }
}
