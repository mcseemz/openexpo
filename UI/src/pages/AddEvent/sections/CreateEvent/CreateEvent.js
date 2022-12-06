import { mapActions, mapGetters } from 'vuex';
import datepicker_lang from '../../../../others/datepicker_lang.js';
import funcs from '../../../../others/functions.js';
import slugify from 'slugify';
import { tz } from 'moment-timezone';
import ValidName from "../../../../mixins/validName";

export default {
  name: 'CreateEvent',
  mixins: [ValidName],
  props: {
    eventObj: Object,
    customNameAvaliable: Boolean,
    categoryTouched: Boolean
  },
  mounted() {
    let cat_answ = [];
    this.getCategories()
    .then(response => {
      if ( response.data && response.data.body && response.data.body.length ) {
        for ( var i = 0; i < response.data.body.length; i++ ) {
          cat_answ[i] = {
            label: response.data.body[i].value,
            value: response.data.body[i].id
          };
        }
        this.categoriesList = cat_answ;
      }
    })
    .catch(error => console.log(error));

    this.timeZoneList = funcs.getTimezoneList();

    const myOffset = new Date().getTimezoneOffset();
    const myTimezoneVal = -1*myOffset/60;

    this.timeZoneList.forEach(item => {
      if (myTimezoneVal == item.value) {
        this.eventObj.timezone = item;
      }
    });

  },
  data: function () {
    return {
      textbox1: '',
      eventNameTouched: false,
      eventSDescTouched: false,
      customEventNameTouched: false,
      customEventInputed: false,
      customEventNameValid: false,
      tag: '',
      tags: [],
      datepicker_lang: datepicker_lang,
      dateStartInput: null,
      dateEndInput: null,
      dateStart: '',
      dateEnd: '',
      categoriesList: [],

      onlineCheck: true,
      offlineCheck: false,

      timeZoneList: [],
      customNameTimeout: false,
    }
  },

  methods: {
     ...mapActions([
      'getCategories',
      'getTimezones',
      'findUser',

    ]),
    replaceName() {
      this.eventNameInputAction();
      this.$forceUpdate();

    },
    customNameInput() {
      this.eventObj.customEventName = slugify(this.eventObj.customEventName.toLowerCase(), {replacement: "-", remove: "'"});
      if (this.customNameTimeout) {
        clearTimeout(this.customNameTimeout);
      }

      if (this.eventObj.customEventName) {
        this.customNameTimeout = setTimeout( () => {
          this.$emit('custom-name-change');
        }, 1000);
      }

    },
    eventNameInputAction(){
      if (this.eventData.customNameWanted) {
        this.eventData.customEventName = slugify(this.eventData.eventName.toLowerCase(), {replacement: "-", remove: /[']/g});
      }
      this.$forceUpdate();
    },
    calcDate(t) {

      if (t == 'start') {
        const dateStart = new Date(this.dateStartInput);
        dateStart.setHours(10-this.eventObj.timezone.value, 0, 0, 0);
        this.eventObj.dateStart = this.getUTCDate(dateStart);
        let x = this.getUTCDate(dateStart);
        let y = this.eventObj.dateEnd

        if (x > y) this.eventObj.dateEnd = this.getUTCDate(dateStart);
      }
      if (t == 'end') {
        const dateEnd = new Date(this.dateEndInput);
        dateEnd.setHours(18-this.eventObj.timezone.value, 0, 0, 0);
        this.eventObj.dateEnd = this.getUTCDate(dateEnd);
      }

      if (this.dateStartInput && this.dateEndInput && !(this.dateStartInput < this.dateEndInput) ) {
        let date = new Date(this.dateStartInput);
        this.dateEndInput = date;
        if ( t != 'end' ) {
          date.setHours(18-this.eventObj.timezone.value, 0, 0, 0);
          this.eventObj.dateEnd = this.getUTCDate(date);
        }
      }
      if(this.dateEndInput < this.dateStartInput) this.dateEndInput = this.dateStartInput;
      this.$forceUpdate();

    },
    getUTCDate(date) {
      return tz(funcs.formatDate(date), 'UTC').format();
    },
    timezoneChanged() {
      if (this.dateStartInput) {
        this.calcDate('start');
      }
      if (this.dateEndInput) {
        this.calcDate('end');
      }
    }
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    minFromDate() {
      let date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    },
    maxFromDate() {
      let date = new Date(this.minFromDate);
      date.setFullYear(date.getFullYear() + 1);
      return date;
    },
    minToDate() {
      let date = this.dateStartInput ? new Date(this.dateStartInput) : new Date(this.minFromDate);
      date.setDate(date.getDate());
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      return date;
    },
    maxToDate() {
      let date = new Date(this.minFromDate);
      date.setFullYear(date.getFullYear() + 1);
      return date;

    },
    eventNameMsg() {
      let msg = '';

      msg = this.eventNameTouched && this.eventObj.eventName.length == 0 ? 'This field is required' : msg;
      msg = this.eventObj.eventName.length > 60 ? 'Maximum 60 characters' : msg;
      msg = /[<>;{}$]/.test(this.eventObj.eventName) ? 'Event name should not contain: <>;{}$' : msg;

      return msg;
    },
    customEventNameMsg() {
      let msg = '';

      msg = this.customEventNameTouched && this.eventObj.customEventName.length == 0 ? 'This field is required' : msg;
      msg = this.eventObj.customEventName.length > 60 ? 'Maximum 60 characters' : msg;
      msg = /[<>;{}$]/.test(this.eventObj.customEventName) ? 'Custom event name should not contain: <>;{}$' : msg;
      msg = !this.customNameAvaliable ? 'Already exist' : msg;

      return msg;
    },
    eventSDescMsg() {
      let msg = '';

      msg = this.eventSDescTouched && this.eventObj.shortDescription.length == 0 ? 'This field is required' : msg;
      msg = this.eventObj.shortDescription.length > 60 ? 'Maximum 60 characters' : msg;
      msg = /[<>;{}$]/.test(this.eventObj.shortDescription) ? 'Event description should not contain: <>;{}$' : msg;

      return msg;
    },
    eventData() {
      return this.eventObj;
    },
  }
}
