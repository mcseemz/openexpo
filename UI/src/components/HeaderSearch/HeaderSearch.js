import {UiProgressCircular, UiCheckbox, UiModal } from 'keen-ui';
import 'keen-ui/dist/keen-ui.css';
import func from '@/others/functions.js';
import searchResults from './searchResults/searchResults.vue'

import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  name: 'HeaderSearch',
  props: ['pageType', 'pageId', 'pageName'],
  components: {
    UiProgressCircular,
    UiCheckbox,
    UiModal,
    searchResults
  },
  mounted() {
    
  },
  watch:{
    $route (to, from){
      this.searchViewAllOpened = false;
      this.searchDropdownOpened = false;
      this.global = false;
    }
  }, 
  created() {
    if (!this.pageType || !this.pageId) {
      this.global = true;
    } else {
      this.global = false;
    }
    window.document.body.addEventListener('click', (evt) => {
      if (!this.searchDropdownOpened || this.searchViewAllOpened) { return false; }

      if (!evt.target.closest('.header_search_wrapper')) {
        this.searchDropdownOpened = false;
      }

      if (evt.target.closest('.btn')) {
        this.searchDropdownOpened = false;
      }

    });
  },
  data: function () {
    return {
      search: '',
      global: false,
      scope: 'all',
      searchPreloader: true,
      searchDropdownOpened: false,
      searchResult: false,
      searchViewAllOpened: false,
      start: 1,
      more: false,
      currentPage: 1,
    }
  },
  methods: {
    ...mapActions([
      'apiSearch'
    ]),
    changePage(id) {
      if ((id == this.currentPage) || id < 1 || ( (id > this.currentPage) && !this.more ) ) { 
        this.start = this.currentPage;
        return false; 
      }
      this.start = id;
      if (this.start < 1) { this.start = 1 }
      console.log(this.start);
      this.searchAction();
    },
    viewAllClick() {
      this.searchDropdownOpened = false;
      this.searchViewAllOpened = true;
      window.document.body.classList.add('overflow_hidden');
      this.$refs.viewAllModal.open();
    },
    viewAllModalClose() {
      this.$refs.viewAllModal.close();
    },
    viewAllOnClose() {
      window.document.body.classList.remove('overflow_hidden');
      this.searchViewAllOpened = false;
      this.searchDropdownOpened = false;
    },
    changeScope(scope) {
      if (scope == this.scope) { return false; }

      this.scope = scope;
      this.searchAction();
    },
    searchAction() {
      this.searchPreloader = true;
      this.searchDropdownOpened = true;
      this.searchResult = false;

      if (!this.pageType || !this.pageId) { this.global = true }


      if (!this.searchViewAllOpened) {
        this.start = 1;
      }

      this.currentPage = this.start;
      // let id = this.global ? 'global' : this.pageId;
      let id = 'global';
      let stand = false;
      if (!this.global) {
        if (this.pageType == 'event') {
          id = this.pageId;
        }
        if (this.pageType == 'stand') {
          stand = 'standid='+this.pageId;
        }
      }

      if( (this.pageType == 'event' && this.scope == 'event') || (this.pageType == 'stand' && this.scope == 'stand') ) {
        this.scope = 'all';
      }

      this.apiSearch({
        id: id,
        scope: this.scope,
        stand: stand,
        start: this.start - 1,
        text: encodeURI(this.search),
        callback: (response) => {
          console.log('SEARCH RESPONSE', response);
          if (response.data.statusCode == '200') {
            if (response.data.body.result.length) {
              const result = response.data.body.result;
              this.more = result.more;
              result.forEach(item => {
                if (item.branding && item.branding.length) {
                  item.branding.forEach(image => {
                    if ( image.description == 'main_image' || 
                          (item.ref=='personnel' && image.description == 'logo_image') ||
                          (item.ref=='news' && image.description == 'article_thumb')
                       ) {
                      item.imgUrl = func.url_180x140('https://'+this.configs.binary+'/'+image.url);
                    }
                  })
                }

                if (item.start) {
                  let itemDate = new Date(item.start);
                  item.displayDate = func.displaySingleData(itemDate);
                }
              });

              this.searchResult = result;
              
              console.log('this.searchResult', this.searchResult);
              this.$forceUpdate();
            }
          }
          this.searchPreloader = false;
        }
      })
    },
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs'
    ]),
    ...mapState([
      'userData',
    ]),
    searchPlaceholder() {
      return (this.pageType && this.pageName && !this.global) ? this.tr('search_local_search_ph') + ' ' + this.pageName+'...' : this.tr('search_global_search_ph');
    }
  },
}
