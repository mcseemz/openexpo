import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Stands',
  props: {
    eventObj: Object,
    langList: Array
  },
  components: {
  },
  created() {
    this.preload = true;
    this.getStands();
  },
  data: function () {
    return {
      standsList: [],
      preload: true,
      name: '',
      language: 'English',
      selectedLang: '',
      tags: [],
      tag: '',
      standIdForArchive: null,
      loaderShow: true,
    }
  },

  methods: {
    ...mapActions([
      'eventAuthGetStands',
      'apiCreateStand',
      'apiStandOperation'
    ]),
    getStands() {
      this.eventAuthGetStands({
        id: this.eventObj.id,
        type: 'all',
        status: 'all',
        callback: (res) => {
          if ( res.data && res.data.statusCode == '200' && res.data.body ) {

            res.data.body.forEach((item, index) => {

              item.name = '';
              item.description_short = '';
              item.description_long = '';
              item.strings.forEach(str => {
                item[str.category] = str.value;
              });
              item.templateCoverUrl = '';
              item.templateCoverBigUrl = '';
              item.logoUrl = '';
              item.mainContentUrl = '';
              item.carouselArr = [];
              func.parseBrandings(item);

              if ( index == (res.data.body.length - 1) ) {
                this.standsList = res.data.body;
              }

            });
          }

          this.preload = false;
          this.$forceUpdate();
        }
      });
    },
    createStand() {
      if (!this.language || !this.name) { return false; }
      const tags = [];
      if (this.tags.length) {
        this.tags.forEach(item => {
          tags.push(item.text);
        })
      }

      this.preload = true;
      this.apiCreateStand({
        eventId: this.eventObj.id,
        name: this.name,
        tags: tags,
        language: this.language,
        callback: (response) => {
          this.getStands();
          this.name = this.language = this.selectedLang = this.tag = '';
          this.tags = [];
        }
      });
    },
    makeAction(standId, operation) {
      if (!standId || !operation) { return false; }

      this.preload = true;
      this.apiStandOperation({
        standId: standId,
        operation: operation,
        callback: (response) => {
          this.getStands();
        }
      });
    },
    archiveItem(standId) {
      if (!standId) { return false; }
      this.standIdForArchive  = standId;
      this.$refs.archiveModal.open();
    },
    archiveAccept() {
      this.makeAction(this.standIdForArchive, 'archive');
      this.closeArchiveModal();
    },
    langSelected() {
      this.language = this.selectedLang.value;
    },
    tagsChanged(newTags) {
      this.tags = newTags;
      this.tag = '';
    },
    closeArchiveModal() {
      this.standIdForArchive = null;
      this.$refs.archiveModal.close();
    },
    userCan(grant) {
      return this.eventObj.grants ? this.eventObj.grants.includes(grant) : [];
    },
    hideLoader () {
      setTimeout(() => {
        this.loaderShow = false
      }, 1500);
    }
  },
  mounted () {
    this.hideLoader();
    this.selectedLang = {
      label:"English (Default)",
      value:"English"
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes'
    ]),
  }
}
