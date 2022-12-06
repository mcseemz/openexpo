import VueUploadComponent from 'vue-upload-component';

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'MainPage',
  components: {
    VueUploadComponent

  },
  props: {
    mainObj: Object,
    mainBranding: Object,
    langList: Array,
    imagePlaceholders: Object,
    objectType: String
  },
  created() {
    if (!this.mainObj.description_long) {
      this.mainObj.description_long = '';
      this.edit_status = true;
    }

    this.mainTextInput = this.mainObj.description_long;

    if (this.objectType == 'event' && this.mainObj.langs.length && this.langList.length ) {
      this.langList.forEach(item => {
        if ( this.mainObj.langs.includes(item.value) ) {
          this.selectedLang = item;
          this.$forceUpdate();
        }
      });
    }
  },
  data: function () {
    return {
      mainUrlx: '',
      stand_left_image: [],
      event_left_preview_url: false,
      selectedLang: '',
      edit_status: false,
      mainTextInput: '',

      carousel_previews: {
        count: 0,
      },
      reuploded: [],
      carousel_images: [
        {
          image: [],
          preview_url: false,
          index: 0,
        },
        {
          image: [],
          preview_url: false,
          index: 1,
        },
        {
          image: [],
          preview_url: false,
          index: 2,
        },
      ],
    }
  },

  methods: {
     toggle_edit() {
       this.edit_status = !this.edit_status;

     },
     preview_edit() {
        this.edit_status = !this.edit_status;
        this.mainTextInput = this.mainObj.description_long;
        this.$forceUpdate();
     },
     cancel_edit() {
        this.edit_status = !this.edit_status;
        this.mainObj.description_long = this.mainTextInput;
        this.$forceUpdate();
     },

    inputMainFile(newFile) {

      if ( !newFile ) {
        this.imagePlaceholders.event_left_preview_url = false;
      }
      let eurl = '';
      let reader = new FileReader();
      this.imagePlaceholders[this.objectType+'_left_preview_url'] = ''

      reader.onload = () => {
        this.imagePlaceholders[this.objectType+'_left_preview_url'] = reader.result;
        this.mainUrlx = reader.result
        this.$forceUpdate();
      }
      let url =  reader.readAsDataURL(newFile.file);

    },

    inputCarouselFile(newFile, oldFile) {
      if ( !newFile ) {
        return false;
      }

      let eurl = '';
      let reader = new FileReader();
      this.imagePlaceholders.carousel_previews[newFile.id] = '';
      reader.onload = () => {
        this.imagePlaceholders.carousel_previews[newFile.id] = reader.result;


        if (this.imagePlaceholders.carousel_previews[newFile.id] && oldFile) {
          const old_id = oldFile.id;
          this.imagePlaceholders.carousel_previews[oldFile.id] = false;
        }
        this.$forceUpdate();
      }
      let url =  reader.readAsDataURL(newFile.file);
    },
    getTextVal(text) {
       return text.replace(/(?:\r\n|\r|\n)/g, '<br />');
    },
    removeImage(evt) {
      const index = evt.currentTarget.getAttribute('data-index');
      let image = this.mainBranding.mainCarousel.new[index].image;

      delete this.imagePlaceholders.carousel_previews[image[0].id];
      this.mainBranding.mainCarousel.new[index].image = [];
      this.$forceUpdate();
    },
    removeMainImage(id) {
        this.mainBranding.mainContent.url = this.imagePlaceholders[this.objectType+'_left_preview_url'] = false;
        this.mainBranding.mainContent.new = [];
        this.mainBranding.mainContent.todelete = true;
        this.$forceUpdate();
    },

    removeExistImage(id) {
      this.mainBranding.mainCarousel.todelete.push(id);
      delete this.mainBranding.mainCarousel.exist[id];

      this.addMoreImages();
      this.$forceUpdate();
    },
    editImage(evt) {
      // add preview removing for old image
      evt.target.closest('.image_box, .file-uploads').querySelector('input').click();
    },
    addMoreImages() {
      this.mainBranding.mainCarousel.new.push({
          image: [],
          preview_url: false,
          index: this.mainBranding.mainCarousel.new.length,
        });
    },
    langSelected() {
      this.mainObj.langs = [this.selectedLang];
    },
    forceUpdate() {
      this.$forceUpdate();
    }

  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    locPrefix() {
      return this.objectType == 'stand' ? 'edst_' : 'adev_';
    },
    containMainUrl() {
      return this.imagePlaceholders[this.objectType+'_left_preview_url'] || this.mainBranding.mainContent.url;
    },
    eventLDescMsg() {
      let msg = '';

      msg = this.mainObj.description_long.length > 4000 ? 'Maximum 4000 characters' : msg;

      return msg;
    }
  }
}
