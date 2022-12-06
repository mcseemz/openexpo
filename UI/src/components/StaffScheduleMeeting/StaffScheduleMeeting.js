import { mapActions, mapGetters, mapState } from 'vuex'
import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js';
import moment from 'moment';
import LeoCalendar from '@/components/Calendar/UiCalendar';

export default {
  name: 'StaffScheduleMeeting',
  props: {
    person: Object,
    standObj: Object,
    eventObj: Object,
  },
  components: {
    LeoCalendar
  },
  created(){
    this.meetingType = {
      label: this.tr('staff_agenda_teammeeting_opt'),
      value: 'team_meeting',
    };

    this.timeZoneList = func.getTimezoneList();
    this.timezone = this.getTimezoneLabel(this.eventObj.timezone);
  },
  data: function () {
    return {
    personnelsList: [],
    companyFilterList: [],
    companyFilter: '',
    company: {},
      meetingType: 'Team meeting',
      duration: '15',
      message: '',
      datepicker_lang: datepicker_lang,
      dateSelected: null,
      timeSelected: '',
      timezone: {value: 2, label: "GMT +2:00"},
      timezoneList: [],
      selectedUser: null,
      selectedUserDates: [],
      modalMsg: '',
      modalPreloader: false,
    }
  },

  methods: {
    ...mapActions([
      'apiStandCreateMeeting',
    ]),

    isAvaliable(dateStart, dateEnd) {
      let is_avaliable = false;
      if (!dateEnd) { dateEnd = dateStart }

      this.selectedUser.schedule.forEach( item => {
        let itemStart = new Date(item.start);
        itemStart.setSeconds(0);
        itemStart.setMilliseconds(0);
        let itemEnd = new Date(item.end);
        itemEnd.setSeconds(0);
        itemEnd.setMilliseconds(0);
        let timezonedStart = func.getTimezoneUTCDate(itemStart, this.timezone.value - this.eventObj.timezone);
        let timezonedEnd = func.getTimezoneUTCDate(itemEnd, this.timezone.value - this.eventObj.timezone);

        if (timezonedStart <= dateStart && timezonedEnd >= dateEnd ) {
          is_avaliable = true;
        }
      } );

      return is_avaliable;
    },
    openModal(user) {
      if (!user) {
        return false;
      }
      this.selectedUserDates = [];
      this.selectedUser = user;
      this.selectedUser.schedule.forEach(item => {
        let itemStart = new Date(item.start);
        itemStart.setSeconds(0);
        itemStart.setMilliseconds(0);
        let itemEnd = new Date(item.end);
        itemEnd.setSeconds(0);
        itemEnd.setMilliseconds(0);

        this.selectedUserDates.push({
          start: func.getTimezoneUTCDate(itemStart, this.eventObj.timezone),
          end: func.getTimezoneUTCDate(itemEnd, this.eventObj.timezone)
        })
      })
      this.dateSelected = func.getTimezoneUTCDate(this.selectedUserDates[0].start, this.timezone.value - this.eventObj.timezone);
      this.timeSelected = this.staffTimeList[0] ? this.staffTimeList[0].value : {};
      this.$refs.messageModal.open();
      this.$forceUpdate();
    },
    timezoneSelected() {
      this.timeSelected = this.staffTimeList[0].value;
    },
    messageModalClose() {
      this.$refs.messageModal.close();
      this.clearFormData();
    },
    successModalOpen() {
      this.$refs.successModal.open();
    },
    successModalClose() {
      this.$refs.successModal.close();
      this.messageModalClose();
    },
    errorModalOpen(resp_data) {
      this.modalMsg = '<p><strong>statusCode: </strong>'+resp_data.statusCode+'</p>';
      this.modalMsg += '<p>'+resp_data.body+'</p>'
      this.$refs.errorModal.open();
    },
    errorModalClose() {
      this.$refs.errorModal.close();
    },
    clearFormData() {
      this.timeSelected = this.message = '';
      this.timezone = {value: 1, label: "GMT +1:00"};
      this.meetingType = {
        label: this.tr('staff_agenda_teammeeting_opt'),
        value: 'team_meeting',
      };
      this.duration = '15';
      this.dateSelected = this.selectedUser = null;
    },
    getTimezoneLabel(timezone) {
      let result = {value: 2, label: "GMT +2:00"};
      this.timeZoneList.forEach(item => {
        if (item.value == timezone) {
          result = item;
        }
      });
      return result;
    },
    sendRequest() {
      if (!this.validationCheck || (this.minDate > this.maxDate)) {

        return false;
      }
      let minutes = this.timeSelected.split(':')[1];
      let hours = this.timeSelected.split(':')[0];

      const startLocal = new Date(this.dateSelected);

      startLocal.setHours(hours);
      startLocal.setMinutes(minutes);
      startLocal.setSeconds(0);
      startLocal.setMilliseconds(0);

      const start = new Date(Date.UTC(
        startLocal.getFullYear(),
        startLocal.getMonth(),
        startLocal.getDate(),
        hours,
        minutes,
        0,
        0
      ))

      const end = new Date(start);
      end.setMinutes(start.getMinutes() + +this.duration);

      // console.log('func.getTimezoneUTCDate(start, 0)', start, func.getTimezoneUTCDate(start, 0), func.getTimezoneUTCDate(start, this.timezone.value));
      // return false;
      this.modalPreloader = true;
      this.apiStandCreateMeeting({
        standId: this.standObj.id,
        repid: this.selectedUser.id,
        start: start,
        end: end,
        timezone: this.timezone,
        subject: this.message,
        duration: this.duration,
        visitor: this.userData.id,
        meetingType: this.meetingType.value,


        callback: (response) => {
          if (response.data.statusCode == 200) {
            this.messageModalClose();
            this.successModalOpen();
          } else {
            this.errorModalOpen(response.data);
          }
          this.modalPreloader = false;
        }
      });
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs',
      'features',
      'routes'
    ]),

    ...mapState([
      'userData'
    ]),

    minDate() {
      const date = func.getTimezoneUTCDate(this.selectedUserDates[0].start, this.timezone.value - this.eventObj.timezone);
      date.setHours(0);
      date.setMinutes(0);

      const now = new Date();

      return now < date ? date : now;
    },
    maxDate() {
      const date = func.getTimezoneUTCDate(this.selectedUserDates[this.selectedUserDates.length - 1].end, this.timezone.value - this.eventObj.timezone);
      date.setHours(23);
      date.setMinutes(59);
      return date;
    },
    staffTimeList() {
      if (!this.dateSelected) { return [] }
      if (!this.duration) { return [] }
      let arr = [];

      for (let i = 0; i < 24; i++) {
        let mins = 0;
        var original_time = i;
        var add = i > 12 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        original_time = original_time < 10 ? original_time : original_time;

        while (mins < 60) {
          let textMins = mins < 10 ? '0'+mins : mins;

          const start = new Date(this.dateSelected);

          start.setHours(original_time);
          start.setMinutes(mins);
          start.setSeconds(0);
          start.setMilliseconds(0);

          const end = new Date(start);
          end.setMinutes(start.getMinutes() + +this.duration);
          if (this.isAvaliable(start, end)) {
            arr.push({ label: ''+time+':'+textMins+' '+add, value: ''+original_time+':'+textMins });
          }
          mins = mins + +this.duration;
        }
      }

      return arr;
    },
    meetingTypeList() {
      const options = [{
        label: this.tr('staff_agenda_zoom_opt'),
        value: 'zoom'
      }];

      if (this.features.video) {
        options.push({
          label: this.tr('staff_agenda_teammeeting_opt'),
          value: 'webinar',
        });
      }

      return options;
    },
    validationCheck() {
      return this.dateSelected && this.duration && this.timezone && this.timeSelected;
    }
  }
}
