import VueUploadComponent from 'vue-upload-component';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'
import Vue from "vue";
import VueRx from "vue-rx";
// Use build files
import VuejsClipper from "vuejs-clipper/dist/vuejs-clipper.umd";
import "vuejs-clipper/dist/vuejs-clipper.css";

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
  name: 'PersonalInfo',
  props: {
    userObj: Object,
    userBranding: Object,
    countryList: Array,
    customFields: Array,
  },
  components: {
    VueUploadComponent

  },
  inject:['saveClick'],
  mounted() {
    if(this.userObj.email && this.validateEmail(this.userObj.email)) this.forbidChanges = true;
  },
  data: function () {
    return {
      forbidChanges: false,
      logo_image: [],
      logo_preview_url: false,
      logoUrlForCropp: false,
      firstName: '',
      lastName: '',
      email: '',
      prefix: '',
      prefixList: ['+1', '+2', '+3'],
      phone: '',
      address1: '',
      address2: '',
      useBilling: false,
      city: '',
      state: '',
      code: '',
      country: '',
      telegramAddress: this.userObj.addressesObj?.telegram || '',
      telegramBotLink: 'https://t.me/bottalk',
      telegramBotCaption: 'ExpoBot'
    }
  },

  methods: {
    ...mapActions([
      'getUploadFileUrl',
      'uploadFiles',
    ]),

    forceUpdate() {
      this.$forceUpdate()
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },

//     inputFile(newFile, oldFile) {
//       // if (this.$refs.upload)
//       if ( !newFile ) {this.event_main_preview_url = false;
//         this.event_main_preview_url = false;
//         return false;
//       }
// console.log('bbbb', newFile, oldFile);
//       let eurl = '';
//       let reader = new FileReader();

//       reader.onload = () => {
//         this.event_main_preview_url = reader.result;
//       }

//       let url =  reader.readAsDataURL(newFile.file);
//     },

//     inputFilter(newFile, old, prevent) {
//       newFile.imagetype="logo";
//     },

    inputLogoFile(newFile, oldFile) {
      if ( !newFile ) {
        this.userBranding.logo_preview_url = false;
        return false;
      }
      this.userBranding.logo.cropped = false;
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.logoUrlForCropp = reader.result;
        this.$refs.croppModal.open();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    saveCropp() {
      const croppResult = this.$refs.croppBox.clip();
      const url = croppResult.toDataURL();
      this.userBranding.logo_preview_url = url;
      const blobBin = atob(url.split(',')[1]);
      const array = [];
      for(let i = 0; i < blobBin.length; i++) {
          array.push(blobBin.charCodeAt(i));
      }
      const file = new Blob([new Uint8Array(array)], {type: 'image/png'});

      const fileName = this.userBranding.logo.new[0].file.name;
      this.userBranding.logo.new[0].file = file;
      this.userBranding.logo.new[0].file.name = fileName;

      this.userBranding.logo.cropped = true;
      this.$refs.croppModal.close();
    },

    backCropp() {
      this.userBranding.logo.new = [];
      this.$refs.croppModal.close();
    },

    removeLogo() {
      this.userBranding.logo.url = this.userBranding.logo_preview_url = false;
      this.userBranding.logo.new = [];
      this.userBranding.logo.todelete = true;
      this.$forceUpdate();
    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    openDeleteModal() {
      this.$refs.deleteModal.open();
    },
    closeDeleteModal() {
      this.$refs.deleteModal.close();
    },
    telegramConnectOnClickHandler() {
      if (this.needTelegramSave) {
        this.$refs.sv_telegram_modal.open();
      } else {
        this.$refs.msg_telegram_modal.open();
      }
    },
    telegramSaveOnClickHandler() {
      this.$refs.sv_telegram_modal_btn.loading = true;
      this.saveClick();
    },
    telegramDeleteOnClickHandler() {
      console.log('telegramDeleteOnClickHandler -->', this.$refs.sv_telegram_modal_delete_btn);
      this.$refs.sv_telegram_modal_delete_btn.loading = true;
      this.userObj.addressesObj.telegram = this.telegramAddress = '';
      this.saveClick();
    }
  },
  computed: {
     ...mapGetters([
      'tr',
    ]),
    logoUrl() {
      return this.userBranding.logo_preview_url ? this.userBranding.logo_preview_url : this.userBranding.logo.url;
    },
    needTelegramConnection() {
      return !!this.telegramAddress && this.isValidTelegramAddress;
    },
    needTelegramSave() {
      return this.isValidTelegramAddress && (!!this.telegramAddress && this.telegramAddress != this.userObj.address?.telegram);
    },
    isValidTelegramAddress() {
      return /^(@)[-a-zA-Z0-9@:%._\+~#=]*/g.test(this.telegramAddress);
    },
    isTelegramConnected() {
      return this.userObj.addressesObj.telegram_id && (!!this.telegramAddress && this.telegramAddress == this.userObj.address?.telegram);
    }
  }
}
