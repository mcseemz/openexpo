import { mapActions, mapGetters, mapState } from 'vuex'
import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js';
import moment from 'moment';
import LeoCalendar from '@/components/Calendar/UiCalendar';
import StaffScheduleMeeting from '@/components/StaffScheduleMeeting/StaffScheduleMeeting.vue';


export default {
  name: 'StaffTab',
  props: {
  	standObj: Object,
    eventObj: Object,
  },
  components: {
    LeoCalendar,
    StaffScheduleMeeting
  },
  created(){
    this.apiGetStandAvaliablePersonnel({
      id: this.standObj.id,
      callback: (response) => {
        if (response.data.statusCode && response.data.body.length) {
          this.apiGetCompany({
            id: this.standObj.company,
            callback: (resp) => {
              if (resp.data.statusCode == 200) {
                this.company = resp.data.body;
                this.$forceUpdate();
              }
            }
          })
          this.personnelsList = response.data.body;
        }
      }
    })

  },
  data: function () {
    return {
      personnelsList: [],
      companyFilterList: [],
      companyFilter: '',
      company: {},
      scheduleMeetingPerson: {},
    }
  },

  methods: {
    ...mapActions([
      'apiGetStandAvaliablePersonnel',
      'apiGetCompany',
    ]),
    openScheduleMeetingModal(user) {
      this.scheduleMeetingPerson = user;
      this.$forceUpdate();
      if (this.$refs.staffScheduleMeeting) {
        this.$refs.staffScheduleMeeting.openModal(this.scheduleMeetingPerson);
      }
    },
     
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
      return date;
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
        label: this.tr('ss_agenda_zoom_opt'),
        value: 'zoom'
      }];

      if (this.features.video) {
        options.push({
          label: this.tr('ss_agenda_teammeeting_opt'),
          value: 'team_meeting',
        });
      }

      return options; 
    },
    validationCheck() {
      return this.dateSelected && this.duration && this.timezone && this.timeSelected;
    }
  }
}
