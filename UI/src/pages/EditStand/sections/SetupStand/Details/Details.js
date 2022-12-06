import VueUploadComponent from 'vue-upload-component';
import func from '@/others/functions.js';

import { mapActions, mapGetters } from 'vuex'

import Vue from "vue";
import VueRx from "vue-rx";
import VuejsClipper from "vuejs-clipper/dist/vuejs-clipper.umd";
import "vuejs-clipper/dist/vuejs-clipper.css";
import slugify from "slugify";
import validName from "../../../../../mixins/validName";
import filtered from "../../../../../mixins/validName";


Vue.use(VueRx);
Vue.use(VuejsClipper);
Vue.use(VuejsClipper, {
 components: {
    clipperBasic: true,
    clipperPreview: true,
    clipperFixed: true,
 }
})

export default {
  name: 'Details',
  mixins: [validName,filtered],
  props: {
    standObj: Object,
    standBranding: Object,
    imagePlaceholders: Object,
  },
  components: {
    VueUploadComponent

  },
  mounted() {
    this.customNameWanted = this.standObj.customName?.indexOf('-gen') < 0;
  },
  data: function () {
    return {
      standSDescTouched: false,
      standNameTouched: false,
      stand_main_image: [],
      stand_main_preview_url: false,
      coverUrlForCropp: false,
      currentPlaceholder: '',
      currentImageType: '',
      croppRatio: 302/211,

      eventBranding: {
        logo: {
          new: ''
        }
      },
      customNameWanted: false,
      sessionCustomInput: '',
      sessionCustomTouched: false,
      customNameAvailable: true,
      customNameInputed: false,
    }
  },
  watch: {
    sessionTitleInput() {
      if (this.customNameWanted == false) this.standObj.customName = ""
    },
    customNameWanted(newVal) {
      if (newVal) {
        this.standObj.customNameWanted = true;
        this.standObj.customName  = slugify(this.standObj.name.toLowerCase(), {replacement: "-", remove: this.filtered()});
      } else this.standObj.customName = "";
      this.$forceUpdate();
    },

  },
  methods: {
    ...mapActions([
      'getUploadFileUrl',
      'uploadFiles',
    ]),

    customNameInput(inputed) {
      if (inputed) {
        this.customNameInputed = true;
      }
      this.sessionCustomInput  = slugify(this.sessionCustomInput.toLowerCase(), {replacement: "-", remove: this.filtered()});
      if (this.customNameTimeout) {
        clearTimeout(this.customNameTimeout);
      }

      if (this.sessionCustomInput) {
        this.customNameTimeout = setTimeout(() => {
          this.apiCheckCustomName({
            type: 'activity',
            customName: this.sessionCustomInput,
            callback: (response) => {
              if (response.data.statusCode == '200') {
                this.customNameAvailable = true
              } else {
                this.customNameAvailable = false;
              }
            }
          })
        }, 1000);
      }
    },

    saveCropp() {
      const croppResult = this.$refs.croppBox.clip();
      const url = croppResult.toDataURL();
      this.imagePlaceholders[this.currentPlaceholder] = url;
      const blobBin = atob(url.split(',')[1]);
      const array = [];
      for(let i = 0; i < blobBin.length; i++) {
          array.push(blobBin.charCodeAt(i));
      }
      const file = new Blob([new Uint8Array(array)], {type: 'image/png'});

      const fileName = this.standBranding[this.currentImageType].new[0].file.name;
      this.standBranding[this.currentImageType].new[0].file = file;
      this.standBranding[this.currentImageType].new[0].file.name = fileName;
      this.standBranding[this.currentImageType].cropped = true;
      this.$refs.croppModal.close();
      this.$forceUpdate();
    },
    backCropp() {
      this.standBranding[this.currentImageType].new = [];
      this.$refs.croppModal.close();
    },
    inputFile(newFile) {
      if (!newFile) {
        this.imagePlaceholders.stand_main_preview_url = false;
        return false;
      }
      this.standBranding.templateCover.cropped = false;
      let reader = new FileReader();

      reader.onload = () => {
        this.coverUrlForCropp = reader.result;
        this.currentPlaceholder = 'stand_main_preview_url';
        this.currentImageType = 'templateCover';
        this.croppRatio = 302/211;
        this.$refs.croppModal.open();
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },
    inputLogoFile(newFile) {
      if ( !newFile ) {
        this.imagePlaceholders.logo_preview_url = false;
        return false;
      }
      this.standBranding.logo.cropped = false;
      let reader = new FileReader();

      reader.onload = () => {
        this.coverUrlForCropp = reader.result;
        this.currentPlaceholder = 'logo_preview_url';
        this.currentImageType = 'logo';
        this.croppRatio = 250/100;
        this.$refs.croppModal.open();
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);

    },
    inputBannerFile(newFile, oldFile) {
      if (!newFile) {
        this.imagePlaceholders.stand_banner_preview_url = false;
        return false;
      }
      this.standBranding.templateCover.cropped = false;
      let reader = new FileReader();

      reader.onload = () => {
        this.coverUrlForCropp = reader.result;
        this.currentPlaceholder = 'stand_banner_preview_url';
        this.currentImageType = 'templateBanner';
        this.croppRatio = 2160/1080;
        this.$refs.croppModal.open();
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    inputFilter(newFile, old, prevent) {
      newFile.imagetype="logo";
    },
    inputBannerFilter(newFile, old, prevent) {
      newFile.imagetype="banner";
    },

    removeImage(brandingType, placeholder) {
      this.imagePlaceholders.logo_preview_url = false
      this.standBranding[brandingType].url = this.imagePlaceholders[placeholder] = false;
      this.standBranding[brandingType].new = [];
      this.standBranding[brandingType].todelete = true;
      this.$forceUpdate();
    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    inputChange() {
      if (this.standObj.name && this.standObj.customName) {
        this.standObj.customName  = slugify(this.standObj.name.toLowerCase(), {replacement: "-", remove: this.filtered()});
      }
      this.$parent.$forceUpdate();
      this.$forceUpdate();
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),

    customAgendaNameMsg() {
      let msg = '';

      msg = this.sessionCustomTouched && this.standObj.customName.length == 0 ? 'This field is required' : msg;
      msg = this.standObj.customName.length > 150 ? 'Maximum 150 characters' : msg;
      msg = /[<>;{}$]/.test(this.standObj.customName) ? 'Custom agenda name should not contain: <>;{}$' : msg;
      msg = !this.customNameAvailable ? 'Already exist' : msg;

      return msg;
    },

    logoUrl() {
      return this.imagePlaceholders.logo_preview_url ? this.imagePlaceholders.logo_preview_url : this.standBranding.logo.url;
    },
    standSDescMsg() {
      let msg = '';

      msg = this.standNameTouched && this.standObj.name.length == 0 ? 'This field is required' : msg;
      msg = this.standObj.name.length > 100 ? 'Maximum 100 characters' : msg;

      return msg;
    },
    standNameMsg() {
      let msg = '';

      msg = this.standObj.description_short.length > 120 ? 'Maximum 120 characters' : msg;

      return msg;
    },
    templateCoverUrl() {
      return this.imagePlaceholders.stand_main_preview_url || this.standBranding.templateCover.url;
    },
    bannerUrl() {
      return this.imagePlaceholders.stand_banner_preview_url || this.standBranding.templateBanner.url;
    }
  }
}
