import VueUploadComponent from 'vue-upload-component';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'CompanyInfo',
  props: {
    companyBranding: Object,
    companyObj: Object,
    countryList: Array,
    industryList: Array,
    canEdit: Boolean,
  },
  components: {
    VueUploadComponent

  },
  mounted() {
    console.log(this.companyObj);
  },
  data: function () {
    return {
      logo_image: [],
      logo_preview_url: false,
      companyName: '',
      vat: '',
      industry: '',
      // industryList: ['Technology', 'Engeneering', 'Sport'],
      address1: '',
      address2: '',
      useBilling: false,
      city: '',
      state: '',
      code: '',
      country: '',
      // countryList: ['USA', 'Germany', 'England', 'Russia']
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
    removeImage(type) {
      
        this.companyBranding.logo.url = this.companyBranding.logo_preview_url = false;
        this.companyBranding.logo.new = [];
        this.companyBranding.logo.todelete = true;

    },
    inputLogoFile(newFile, oldFile) {
      if ( !newFile ) {
        this.companyBranding.logo_preview_url = false;
        return false;
      }

      let eurl = '';
      let reader = new FileReader();
console.log('logo_preview_url',this.companyBranding.logo_preview_url);
      reader.onload = () => {
        this.companyBranding.logo_preview_url = reader.result;
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
 
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    logoUrl() {
      return this.companyBranding.logo_preview_url ? this.companyBranding.logo_preview_url : this.companyBranding.logo.url;
    }
  }
}
