import CreateEvent from './sections/CreateEvent/CreateEvent.vue'
import Register from './sections/Register/Register.vue'
import { AmplifyEventBus } from 'aws-amplify-vue';

import keenui from '@/plugins/keenUi';
import func from '@/others/functions.js';
import { mapActions, mapGetters, mapState } from 'vuex'

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "editevent" */ '@/../locales/add_event/'+lang+'.json')
};

export default {
  name: 'AddEvent',
  components: {
  	CreateEvent,
  	Register,
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('adev_title') : 'Add event',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('adev_title') : 'Add event' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('adev_title') : 'Add event' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('adev_title') : 'Add event' },
      ],
    }
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });
  },
  created(){
    this.findUser();
    AmplifyEventBus.$on('authState', info => {
      if(info === "signedIn") {
        this.findUser();
      } else {
        this.$store.state.signedIn = false;
        this.$store.state.user = null;
      }
    });
  },
  data: function () {
    return {
      preload: false,
      currentStep: 0,
      steps: [1, 2],

      modalMsg: '',
      modalTitle: '',

      validations: {
        eventName: ''
      },

      eventObj: {
        eventId: '',
        eventName: '',
        shortDescription: '',
        category: '',
        tag: '',
        tags: [],
        offline: '',
        online: true,
        address: '',
        timezone: '',
        status: 'draft',
        customEventName: '',
        customNameWanted: false,
      },
      customNameAvaliable: true,
      localesLoaded: false,
      categoryTouched: false,

    }
  },

  methods: {

    ...mapActions([
      'createEvent',
      'findUser',
      'apiCheckCustomName',
    ]),
    checkCustomName(){
      this.apiCheckCustomName({
        type: 'event',
        customName: this.eventObj.customEventName,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.customNameAvaliable = true
          } else {
            this.customNameAvaliable = false;
          }
          console.log( this.eventObj.customEventName);
          console.log(response);
        }
      })
    },

  	changeStep(showStep) {
  		if (this.steps[showStep]) {
  			this.currentStep = showStep;
  		}
  	},
    /*
  Lorem ipsum dolor sit amet, consectetur adipiscin elit, sed do eiusmod temporst.
  Womens Lifestyle Expo
    */
    nextStep() {
      const errorsArr = [];

      if ( this.eventNameValid &&
            this.shortDescriptionValid &&
            this.eventObj.category &&
            this.eventObj.dateStart &&
            this.eventObj.dateEnd &&
            this.eventObj.timezone &&
            ( (this.customEventNameValid && this.customNameAvaliable) || !this.eventObj.customNameWanted) ) {

        if ( this.userData ) {

          let event = {
            name: this.eventObj.eventName,
            // description: this.eventObj.shortDescription,
            dateStart: this.eventObj.dateStart,
            dateEnd: this.eventObj.dateEnd,
            timezone: this.eventObj.timezone.value,
            language: this.getLocale,
            video: '',
            company: 1,
            customName: this.eventObj.customNameWanted ? this.eventObj.customEventName : '',
            tags: ['category:'+this.eventObj.category.value, 'lang:English'],
            status: "draft",
            strings: [
              {
                category: 'name',
                value: this.eventObj.eventName
              },
              {
                category: 'description_short',
                value: this.eventObj.shortDescription
              },
            ],
          }
          this.preload = true;
          this.createEvent({
            event: event,
            callback: (response) => {
              console.log('result---------- ', response);

              if ( response.data.statusCode == 200 ) {
                this.eventObj.eventId = response.data.body.id;
                this.eventObj.status = response.data.body.status;

                this.$router.push({ path: `/${this.routes.editevent}/${this.eventObj.eventId}` });
              }
            }
          });

        } else {
          this.currentStep = 1;
        }




      } else {

        if (!this.eventObj.eventName) {
          errorsArr.push(this.tr('adev_valid_eventname_req'));
        }

        if (this.eventObj.eventName.length > 60) {
          errorsArr.push(this.tr('adev_valid_eventname_max_length'));
        }

        if (/[<>;{}$]/.test(this.eventObj.eventName)) {
          errorsArr.push(this.tr('adev_valid_eventname_symb'));
        }

        if (/^\d+$/.test(this.eventObj.eventName)) {
          errorsArr.push(this.tr('adev_valid_eventname_notnum'));
        }

        if ( this.eventObj.customNameWanted && !this.eventObj.customEventName) {
          errorsArr.push(this.tr('adev_valid_customname_req'));
        }

        if (this.eventObj.customEventName.length > 60) {
          errorsArr.push(this.tr('adev_valid_customname_max_length'));
        }

        if (/[<>;{}$]/.test(this.eventObj.customEventName)) {
          errorsArr.push(this.tr('adev_valid_customname_symb'));
        }

        if (/^\d+$/.test(this.eventObj.customEventName)) {
          errorsArr.push(this.tr('adev_valid_customname_notnum'));
        }

        if (!this.customNameAvaliable) {
          errorsArr.push(this.tr('adev_valid_customname_exist'));
        }

        if (!this.eventObj.shortDescription) {
          errorsArr.push(this.tr('adev_valid_eventdesc_req'));
        }

        if (this.eventObj.shortDescription.length > 60) {
          errorsArr.push(this.tr('adev_valid_eventdesc_max_length'));
        }

        if (/[<>;{}$]/.test(this.eventObj.shortDescription)) {
          errorsArr.push(this.tr('adev_valid_eventdesc_symb'));
        }

        if (!this.eventObj.category) {
          errorsArr.push(this.tr('adev_valid_category_req'));
          this.categoryTouched = true;
          this.$forceUpdate();
        }

        if (!this.eventObj.dateStart) {
          errorsArr.push(this.tr('adev_valid_datestart_req'));
        }

        if (!this.eventObj.dateEnd) {
          errorsArr.push(this.tr('adev_valid_dateend_req'));
        }

        if (!this.eventObj.timezone) {
          errorsArr.push(this.tr('adev_valid_timezone_req'));
        }
        // console.log(errorsArr);
        this.openModal(errorsArr);
        // this.openModal(this.tr('modal_fill_all_required_fields'))
      }

    },

    openModal(msg) {
      // this.modalMsg = msg;
      // console.log(msg);
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },

    messageModalClose() {
      this.$refs.messageModal.close();
    },

    saveEventClick() {

      let event = {
        name: this.eventObj.eventName,
        dateStart: this.eventObj.dateStart,
        dateEnd: this.eventObj.dateEnd,
        timezone: this.eventObj.timezone.value,
        company: 1,
        status: this.eventObj.status,
        id: this.eventObj.eventId
      }

      this.updateEvent(event)
      .then(response => {
        console.log(response);

        // if ( response.data.statusCode == 200 ) {
        //   this.eventObj.eventId = response.data.body.id;
        //   this.eventObj.status = response.data.body.status;
        //   this.currentStep = 1;
        // }

      })
      .catch(error => { console.log(error);  });

    }

  },
  computed: {
    ...mapGetters([
      'getLocale',
      'getAuthUser',
      'getSignedIn',
      'tr',
      'routes',
      'isLinkedinSignin',
    ]),
    ...mapState([
      'userData',
    ]),

    eventNameValid() {
      return this.eventObj.eventName && this.eventObj.eventName.length < 61 && !/[<>;{}$]/.test(this.eventObj.eventName);
    },
    customEventNameValid() {
      return this.eventObj.customEventName && this.eventObj.customEventName.length < 61 && !/[<>;{}$]/.test(this.eventObj.customEventName);
    },
    shortDescriptionValid() {
      return this.eventObj.shortDescription && this.eventObj.shortDescription.length < 61 && !/[<>;{}$]/.test(this.eventObj.shortDescription);
    }
  },
}
