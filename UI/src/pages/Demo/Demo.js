import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';

import func from '@/others/functions.js';

import { mapActions, mapGetters } from 'vuex';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "demo" */ '@/../locales/demo/'+lang+'.json')
};

export default {
  name: 'Demo',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('demo_request_demo') : 'Demo',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('demo_request_demo') : 'Demo' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('demo_request_demo') : 'Demo' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('demo_request_demo') : 'Demo' },
      ],
    }
  },
  created() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });

  },
  data: function () {
    return {
      localesLoaded: false,
      activeSection: 'main',
      reqNameTouched: false,
      reqMailTouched: false,
      reqTelTouched: false,
      preload: false,
      modalMsg: '',
      modalTitle: '',
      statusModalSuccess: false,
      request:{
        name: '',
        email: '',
        tel: '',
        msg: '',
        page: ''
      },
      terms: false,

    }
  },

  methods: {
    ...mapActions([
      'apiRequestDemo'
    ]),
    watchNow() {

    },
    openRequestModal(formType) {
      this.request.page = formType;
      this.$refs.requestDemoModal.open();
      console.log(this.request);
    },
    modalClose() {
      this.request.page = '';
      this.$refs.requestDemoModal.close();
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    sendRequest() {
      const errorsArr = [];
      if (!this.request.name) {
        errorsArr.push(this.tr('demo_valid_name_req'));
      }
      if (!this.request.email) {
        errorsArr.push(this.tr('demo_valid_email_req'));
      }

      if (this.request.email && !this.validateEmail(this.request.email)) {
        errorsArr.push(this.tr('demo_valid_email_inv'));
      }

      if (!this.request.tel) {
        errorsArr.push(this.tr('demo_valid_phone_req'));
      }
      if (this.request.tel && !/^[\d()\-#+\s]*$/.test(this.request.tel)) {
        errorsArr.push(this.tr('demo_valid_phon_inv'));
      }
      if (!this.terms) {
        errorsArr.push(this.tr('demo_valid_terms_req'));
      }

      if (errorsArr.length) {
        this.openModal(errorsArr, this.tr('validation_error'));
        return false;
      }

      this.preload = true;

      this.apiRequestDemo({
        request: this.request,
        callback: (response) => {

          if ( this.request.page == 'recorded_demo' ) {
            this.modalClose();
            this.activeSection = 'playlist';
            this.$forceUpdate();
          } else {
            this.modalClose();
            this.statusModalSuccess = true;
            this.openModal([this.tr('demo_success_modal_message')], this.tr('demo_success_modal_title'))
          }

          this.request = {
            name: '',
            email: '',
            tel: '',
            msg: '',
            page: '',
          };
          this.reqNameTouched = this.reqTelTouched = this.reqMailTouched = this.terms = false;
          this.preload = false;
          this.$forceUpdate();

        }
      })
    },
    goBack() {
      this.activeSection = 'main';
      this.$forceUpdate();
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
      this.statusModalSuccess = false;
    },
  },
  computed: {
    ...mapGetters([
      'getLocale',
      'tr',
    ]),
  }
}
