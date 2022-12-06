import { mapGetters, mapActions } from 'vuex';
import func from '@/others/functions.js';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "partners" */ '@/../locales/partners/'+lang+'.json')
};

export default {
  name: 'Partners',
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('affiliate_program_title') : 'Partner/Affiliate program',
      titleTemplate: "%s  | Openexpo Online Event Platform",
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('affiliate_program_description') : 'Join our partner program and earn up to 25% commissions for every client that will use our platform referred by you.' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('affiliate_program_title') : 'Partner/Affiliate program' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('affiliate_program_description') : 'Join our partner program and earn up to 25% commissions for every client that will use our platform referred by you.' },
      ],
    }
  },
  data: function () {
    return {
      localesLoaded: false,
      form: {
        name: '',
        email: '',
        page: 'partners'
      },
      errors: {
        name: null,
        email: null
      },
      formSent: false,
      modalTitle: '',
      modalMsg: ''
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale',
      'routes'
    ]),
  },
  methods: {
    ...mapActions([
      'apiRequestDemo'
    ]),
    openModal(message, title) {
      this.modalMsg = message;
      this.modalTitle = title;
      this.$refs.messageModal.open();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    contact() {
      this.formSent = true;

      this.errors.name = this.form.name ? null : this.tr('rd_modal_valid_name_req')
      this.errors.email = this.validateEmail(this.form.email) ? null : this.tr('rd_modal_valid_email_inv')

      if(!this.errors.email && !this.errors.name) {
        this.apiRequestDemo({
          request: this.form,
          callback: (response) => {
            this.form = {
              name: '',
              email: '',
              page: 'partners'
            };
            this.formSent = false;
            this.openModal(this.tr('contact_success_modal_message'), this.tr('contact_success_modal_title'))
          }
        });
      }
    },
    clearError(field) {
      this.errors[field] = null;
    }
  }
}
