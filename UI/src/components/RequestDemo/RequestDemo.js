import { mapGetters, mapActions } from 'vuex';

import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';

import func from '@/others/functions.js';

export default {
  name: 'RequestDemo',
  components: {
    
  },
  data: function () {
    return {
      request:{
        name: '',
        email: '',
        tel: '',
        msg: ''
      },
      terms: false,
      reqNameTouched: false,
      reqMailTouched: false,
      reqTelTouched:false,
      modalMsg: '',
      modalTitle: '',
      statusModalSuccess: false,
    }
  },

  methods: {
    ...mapActions([
      'apiRequestDemo'
    ]),
    openRequestModal(msg) {
      this.$refs.requestDemoModal.open();
    },
    modalClose() {
      this.$refs.requestDemoModal.close();
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    sendRequest() {
      const errorsArr = [];
      if (!this.request.name) {
        errorsArr.push(this.tr('rd_modal_valid_name_req'));
      }
      if (!this.request.email) {
        errorsArr.push(this.tr('rd_modal_valid_email_req'));
      }

      if (this.request.email && !this.validateEmail(this.request.email)) {
        errorsArr.push(this.tr('rd_modal_valid_email_inv'));
      }

      if (!this.request.tel) {
        errorsArr.push(this.tr('rd_modal_valid_phone_req'));
      }
      if (this.request.tel && !/^[\d()\-#+\s]*$/.test(this.request.tel)) {
        errorsArr.push(this.tr('rd_modal_valid_phon_inv'));
      }
      if (!this.terms) {
        errorsArr.push(this.tr('rd_modal_valid_terms_req'));
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
            msg: ''
          };
          this.reqNameTouched = this.reqTelTouched = this.reqMailTouched = this.terms = false;
          console.log('REQUEST DEMO CALLBACK', response);
          this.modalClose();
          this.statusModalSuccess = true;
          this.openModal([this.tr('rd_modal_success_modal_message')], this.tr('rd_modal_success_modal_title'))
          this.$forceUpdate();
        }
      })
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
      'tr',
      'routes'
    ]),
  }
}
