import VueSlickCarousel from 'vue-slick-carousel'
import 'vue-slick-carousel/dist/vue-slick-carousel.css'
import 'vue-slick-carousel/dist/vue-slick-carousel-theme.css'
import func from '@/others/functions.js';

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'MainTab',
  components: {
    VueSlickCarousel,

  },
  props: {
    mainObj: Object,
    branding: Object,
    type: String,
    agenda: Object,
  },
  created() {
    this.apiGetCompany({
      id: this.mainObj.company,
      callback: (response) => {
        if (response.data.statusCode == 200) {
          this.company = response.data.body;
        }
      }
    })
  },
  data: function () {
    return {
      notFound: false,
      name: '',
      email: '',
      tel: '',
      msg: '',
      check1: '',
      modalMsg: '',
      modalTitle: '',
      company: false,

      event_carousel_settings: {
        arrows: true,
        dots: true,
        slidesToShow: 3,
        infinite: false,
        customPaging: '8px',
        cssEase: 'ease-in-out',
        focusOnSelect: true,
      },
    }
  },

  methods: {
    ...mapActions([
      'apiGetCompany',
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
     openCarouselModal(index) {
       this.$refs.carouselModal[index].open();
     },
     closeCarouselModal(index) {
       this.$refs.carouselModal[index].close();
     },
     sendRequest() {
      const errorsArr = [];
      if (!this.name) {
        errorsArr.push(this.tr('cf_valid_name_req'));
      }
      if (!this.email) {
        errorsArr.push(this.tr('cf_valid_email_req'));
      }

      if (this.email && !this.validateEmail(this.email)) {
        errorsArr.push(this.tr('cf_valid_email_inv'));
      }

      if (!this.tel) {
        errorsArr.push(this.tr('cf_valid_phone_req'));
      }
      if (this.tel && !/^[\d()\-#+\s]*$/.test(this.tel)) {
        errorsArr.push(this.tr('cf_valid_phon_inv'));
      }
      if (!this.check1) {
        errorsArr.push(this.tr('cf_valid_terms_req'));
      }

      if (errorsArr.length) {
        this.openModal(errorsArr, this.tr('validation_error'));
        return false;
      }

      let request = {
        name: this.name,
        email: this.email,
        tel: this.tel,
        msg: this.msg,
      }

      if (this.type == 'stand') {
        request.standid = this.mainObj.id;
      } else {
        request.eventid = this.mainObj.id;
      }
      this.apiRequestDemo({
        request: request,
        callback: (response) => {
          this.name = this.email = this.tel = this.msg = '';
          this.check1 = false;
          console.log('REQUEST DEMO CALLBACK', response);
          this.openModal([this.tr('cf_success_modal_message')], this.tr('cf_success_modal_title'))
          this.$forceUpdate();
        }
      })
    },
    getLogoLink(link) {
      return func.url_64x64('https://'+this.configs.binary+'/'+link);
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs'
    ]),
    locPrefix() {
      return this.type == 'stand' ? 'ss_' : 'se_';
    },
    descriptionLong() {
      return this.mainObj.description_long ? this.mainObj.description_long.replace(/(?:\r\n|\r|\n)/g, '<br />') : '';
    },
    carousel_items() {
      return this.branding.mainCarousel.exist;
    },
    contacts() {
      return this.mainObj.contacts;
    },
    contactEmail() {
      if (this.mainObj.contacts && this.mainObj.contacts.email) { return this.mainObj.contacts.email }
      if (this.company.email) { return this.company.email }
      return false;
    },
    speakersList() {
      if (!this.agenda) { return [] }

      const resultList = [];
      const existedPresenters = [];

      this.agenda.sessions.forEach(item => {
        if (item.attendees && item.attendees.length) {
          item.attendees.forEach((attendee) => {
            if (attendee.id && !existedPresenters.includes(attendee.id)) {
              existedPresenters.push(attendee.id);
              resultList.push(attendee);
            }
          })
        }
      });
      return resultList;
    }
  }
}
