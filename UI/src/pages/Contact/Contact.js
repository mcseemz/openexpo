import { mapActions, mapGetters, mapState } from 'vuex';
import func from '../../others/functions.js';

import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "contact" */ '@/../locales/contact/'+lang+'.json')
};

export default {
  name: 'Contact',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('contact_title') : 'Contact',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('contact_title') : 'Contact' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('contact_title') : 'Contact' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('contact_title') : 'Contact' },
      ],
    }
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });

    if (this.userData) {
      this.request.name = this.userData.name + ' ' + this.userData.surname;
      this.request.email = this.userData.email;
      this.request.tel = this.userData.addressesObj.phone ? this.userData.addressesObj.phone : '';
    }

  },
  data: function () {
    return {
      localesLoaded: false,
      request:{
        name: '',
        email: '',
        tel: '',
        msg: '',
        page: 'contact'
      },
      terms: false,
      reqNameTouched: false,
      reqMailTouched: false,
      reqTelTouched:false,
      modalMsg: '',
      modalTitle: ''
    }
  },

  methods: {
    ...mapActions([
      'apiRequestDemo'
    ]),
    validateEmail(email) {
      return func.validateEmail(email);
    },
    openModal(msg, title) {
      this.modalMsg = '';
      this.modalTitle = title;
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
    },
    sendRequest() {
      const errorsArr = [];
      if (!this.request.name) {
        errorsArr.push(this.tr('contact_valid_name_req'));
      }
      if (!this.request.email) {
        errorsArr.push(this.tr('contact_valid_email_req'));
      }

      if (this.request.email && !this.validateEmail(this.request.email)) {
        errorsArr.push(this.tr('contact_valid_email_inv'));
      }

      if (!this.request.tel) {
        errorsArr.push(this.tr('contact_valid_phone_req'));
      }
      if (this.request.tel && !/^[\d()\-#+\s]*$/.test(this.request.tel)) {
        errorsArr.push(this.tr('contact_valid_phon_inv'));
      }
      if (!this.terms) {
        errorsArr.push(this.tr('contact_valid_terms_req'));
      }

      if (errorsArr.length) {
        this.openModal(errorsArr, this.tr('validation_error'));
        return false;
      }

      this.apiRequestDemo({
        request: this.request,
        callback: (response) => {
          this.request = {
            name: '',
            email: '',
            tel: '',
            msg: '',
            page: 'contact'
          };
          this.reqNameTouched = this.reqTelTouched = this.reqMailTouched = this.terms = false;
          console.log('REQUEST DEMO CALLBACK', response);
          this.openModal([this.tr('contact_success_modal_message')], this.tr('contact_success_modal_title'))
          this.$forceUpdate();
        }
      })
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale'
    ]),
    ...mapState([
      'userData',
    ]),
  }
}
