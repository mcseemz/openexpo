import { mapActions, mapGetters } from 'vuex';
import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js';
// import eventMixin from '../../mixins/event/event.js';

export default {
  name: 'Meetings',
  // mixins: [eventMixin],
  props: {
    tabFilter: String,
    comingMeetings: Array,
    pastMeetings: Array,
    gridPreload: Boolean,
  },
  components: {

  },
  created(){
    console.log('DATE   AA', this.datepicker_lang);
    
  },
  data: function () {
    return {
      ta4: [1,2,3,4,5,6,7,8,9],
      personnelList: ['All', 'Other'],
      search: '',
      tmp_rows: [true, true, false, true, false, true, true, false, false, true],
      filter: {
        personnel: 'All',
        orderBy: 'Upcoming First',
        interval: '02/02/20 - 02/28/20',
      },
      orderByList: ['Upcoming First', 'Upcoming Last'],
      intervalList: ['02/02/20 - 02/28/20', '02/02/21 - 02/28/21'],
      datepicker_lang: datepicker_lang,
      infoModalData: {
        date: '',
        duration: '',
        email: '',
        phone: '',
        questions: '',
      },
      ppModalData: {
        date: '',
        dateStart: null,
        timeStart: '',
        duration: '',
        item: ''
      },
      acceptModalData: {
        date: '',
        dateStart: null,
        timeStart: '',
        duration: '',
        item: ''
      },
      ppModalDateStart: '',
      updatePreload: false,
      currentTableFilter: false,
      dateFrom: null,
      dateTo: null,
    }
  },
  methods: {
    ...mapActions([
      'getActivity',
      'getActivityMeeting',
      'getActivityById',
      'deleteActivity',
      'updateActivityMeeting',
      'acceptStandActivityMeeting'
    ]),
    
    deleteMeeting(item, index) {
      console.log(item, index);
      this.deleteActivity({
        id: item.activityId,
        callback: (resp) => {
          this.comingMeetings.splice(index, 1);
          this.$forceUpdate();
        } 
      });
    },

    updateMeeting(ppModalData) {
      const start = func.dayListToDatestring(this.ppModalData.dateStart, this.ppModalData.timeStart.value);
      let dateEnd = new Date(this.ppModalData.dateStart.getTime() + this.ppModalData.duration.value*60000);
      const end = func.dayListToDatestring(dateEnd);
      this.updatePreload = true;
      console.log('pp', ppModalData);
      let ends = false;
      setTimeout(() => {
        if (!ends) {
          this.postponeModalClose();
          this.updatePreload = false;
          this.$emit('reload-meetings');
          ends = true;
        }
      }, 1500);
      this.updateActivityMeeting({
        activityid: ppModalData.item.activityId,
        body: {
          start: start,
          end: end,
        },
        callback: (response) => {
          if (!ends) {
            this.postponeModalClose();
            this.updatePreload = false;
            this.$emit('reload-meetings');
            ends = true;
          }

        }
      })
    },

    acceptMeeting(acceptModalData) {
      this.acceptModalData.item.visibility = 'private_meeting';
      this.updatePreload = true;
      this.acceptModalData.item.start = new Date(this.acceptModalData.item.dateStart);
      this.acceptModalData.item.start.setHours(this.acceptModalData.timeStart.value.split(':')[0]);
      this.acceptModalData.item.start.setMinutes(this.acceptModalData.timeStart.value.split(':')[1]);
      this.acceptModalData.item.end = new Date(this.acceptModalData.item.dateEnd);
      this.acceptModalData.item.end.setHours(this.acceptModalData.timeStart.value.split(':')[0]);
      this.acceptModalData.item.end.setMinutes(this.acceptModalData.timeStart.value.split(':')[1] + +this.acceptModalData.duration);
      this.acceptModalData.item.name = 'placeholder';
      this.acceptModalData.item.value = this.acceptModalData.item.activity;
      console.log('acceptModalData', acceptModalData);
      let ends = false;

      console.log('acceptStandActivityMeeting')
      this.acceptStandActivityMeeting({
        activityid: this.acceptModalData.item.activityId,
        body: this.acceptModalData.item,
        standId: this.acceptModalData.item.standId, 
        repid: this.acceptModalData.item.presenter, 
        start: this.acceptModalData.item.dateStart, 
        end: this.acceptModalData.item.dateEnd,
        timezone: this.acceptModalData.item.timezone, 
        visitor: this.acceptModalData.item.otherUser.id,
        value: this.acceptModalData.item.activity,
        visibility: 'private_meeting',

        callback: (response) => {
          console.log('acceptStandActivityMeeting CALLBACK')
          if (!ends) {
            this.acceptModalClose();
            this.updatePreload = false;
            this.$emit('reload-meetings');
            ends = true;
          }

        }
      })
    },

    openAcceptModal(item) {
      console.log(item);
      this.acceptModalData.date = item.formatDate.dateCTZ+' '+item.formatDate.timeCTZ;
      this.acceptModalData.item = item;
      this.acceptModalData.dateStart = new Date(item.dateStart);

      if (item.strings.length) {
        item.strings.forEach(str => {
          if (str.category == 'description_long') {
            this.acceptModalData.subject = str.value;
          }
        })
      }


      let dateStart = new Date(item.dateStart);
      let hoursStart = dateStart.getUTCHours();
      let minutesStart = dateStart.getUTCMinutes();
      let timestart = hoursStart +':'+ (minutesStart < 10 ? '0'+minutesStart : minutesStart);
      this.timeList.forEach(time => {
        console.log(time.value, timestart)
        if (time.value == timestart) {
          timestart = time;
        }
      })

      let duration = '30';
      this.durationList.forEach(dur => {
        if (dur.value == item.formatDate.duration) {
          duration = dur;
        }
      });
      this.acceptModalData.timeStart = timestart;
      this.acceptModalData.duration = duration;
      console.log(this.acceptModalData);
      // this.$forceUpdate();
      this.$refs.acceptModal.open();
    },

    acceptModalClose() {
      this.$refs.acceptModal.close();
    },
    openPostponeModal(item) {
      console.log(item);
      this.ppModalData.date = item.formatDate.dateCTZ+' '+item.formatDate.timeCTZ;
      this.ppModalData.item = item;
      this.ppModalData.dateStart = new Date(item.dateStart);

      let timestart = '';
      this.timeList.forEach(time => {
        if (time.value == item.formatDate.timeStart) {
          timestart = time;
        }
      })

      let duration = '';
      this.durationList.forEach(dur => {
        if (dur.value == item.formatDate.duration) {
          duration = dur;
        }
      });
      this.ppModalData.timeStart = timestart;
      this.ppModalData.duration = duration;
      console.log(this.ppModalData);
      // this.$forceUpdate();
      this.$refs.postponeModal.open();
    },

    postponeModalClose() {
      this.ppModalData = {
        date: '',
        dateStart: '',
        timeStart: '',
        duration: '',
        item: ''
      };

      this.$refs.postponeModal.close();
    },
calcDate() {},
    infoModalClose() {
      this.$refs.infoModal.close();
    },

    openInfoModal(item) {
      this.infoModalData.date = item.formatDate.dateCTZ+' '+item.formatDate.timeCTZ;
      
      // const dateStart = new Date(item.dateStart);
      // const dateEnd = new Date(item.dateEnd);

      // let sh = dateEnd.getUTCHours() - dateStart.getUTCHours();
      // let sm = dateEnd.getUTCMinutes() - dateStart.getUTCMinutes();


      // const startHours = sh < 10 ? '0'+sh : sh;

      // const startMinutes = sm < 10 ? '0'+sm : sm;
      
      // let dur = startHours +' : '+ startMinutes;
      this.infoModalData.duration = item.formatDate.duration + 'min';
      console.log(item.user);
      this.infoModalData.email = item.otherUser.email;
      this.infoModalData.questions = item.notes;
      this.$refs.infoModal.open();
    },
    getVideoLink(item) {
      // path: `/${activeRoutes.mymeetings}/${activeRoutes.mymeetings_video}/zid/:zoomId/zp/:zoomPwd/:posttype/:id`,
      // https://zoom.us/wc/join/21323123123?prefer=0&pwd=2323
      if (this.twitchOrZoom(item) == 'zoom') {
        let zoomId = item.url.split('join/')[1].split('?')[0];
        let pwd = item.url.split('&pwd=')[1];
        let postId = item.standId ? item.standId : item.eventId;
        let posttype = item.standId ? 'stand' : 'event';
        return `${this.routes.mymeetings}/${this.routes.mymeetings_video}/${posttype}/${postId}/zid/${zoomId}/zp/${pwd}`;  
      }

      if (this.twitchOrZoom(item) == 'twitch') {
        // `/${activeRoutes.mymeetings}/${activeRoutes.mymeetings_video}/:posttype/:id/tid/:twitchId`
        // https://player.twitch.tv/?channel='+this.twitchMeeting
        let twitchId = item.url.split('?channel=')[1];
        let postId = item.standId ? item.standId : item.eventId;
        let posttype = item.standId ? 'stand' : 'event';
        return `${this.routes.mymeetings}/${this.routes.mymeetings_video}/${posttype}/${postId}/tid/${twitchId}`;  
      } 
      
    },
    getChatLink(item) {
      
      let postId = item.standId ? item.standId : item.eventId;
      let posttype = item.standId ? 'stand' : 'event';
      let type = this.isMe(item) ? '/owner' : '';

      let meetingData = '';
      if (!this.isMe(item) && item.visibility == 'private_meeting') {
        meetingData = '/meeting/'+item.activityId;
      }

      return `/${this.routes.chat}/${posttype}/${postId}${type}${meetingData}`;
    },
    twitchOrZoom(item) {
      if (item.url.indexOf('zoom.us') !== -1) {
        return 'zoom';
      } else if (item.url.indexOf('twitch') !== -1) {
        return 'twitch';
      }
      return 'team_meeting';
    },
    isMe(item) {
      if (item.presenter == this.$store.state.userData.id) {
        return true;
      }
      return false;
    },
    tableFilter(type) {
      if (this.currentTableFilter == type) {
        this.currentTableFilter = type+'Rev';
      } else {
        this.currentTableFilter = type;
      }
      this.$forceUpdate();
    },
    tableSearch() {
      this.search;
      if (!this.search) {
        return this.pastMeetings;
      }

      return this.pastMeetings.filter(item => {
        const name = item.otherUser.name + ' ' + item.otherUser.surname;
        return name.toLowerCase().indexOf(this.search.toLowerCase()) != -1;
      });
    },
    runGridFilter() {

    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs'
    ]),
    filteredComingMeetings() {
      let arr = [...this.comingMeetings];
      if (this.dateFrom) {
        arr = arr.filter(item => {
          const ds = new Date(item.dateStart);
          const df = new Date(this.dateFrom);
          df.setHours(0);
          df.setMinutes(0)
          return df <= ds;
        });
      }
      if (this.dateTo) {
        arr = arr.filter(item => {
          const de = new Date(item.dateEnd);
          const dt = new Date(this.dateTo);
          return dt > de;
        });
      }
      if (this.filter.orderBy == 'Upcoming Last') {
        return arr.reverse();
      }

      return arr;
    },
    filteredPastMeetings() {
      let arr = [...this.pastMeetings];
      if (this.dateFrom) {
        arr = arr.filter(item => {
          const ds = new Date(item.dateStart);
          const df = new Date(this.dateFrom);
          df.setHours(0);
          df.setMinutes(0)
          return df <= ds;
        });
      }
      if (this.dateTo) {
        arr = arr.filter(item => {
          const de = new Date(item.dateEnd);
          const dt = new Date(this.dateTo);
          return dt > de;
        });
      }
      if (this.filter.orderBy == 'Upcoming Last') {
        return arr.reverse();
      }

      return arr;
    },
    timeList() {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 12 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        original_time = original_time < 10 ? original_time : original_time;

        arr.push({ label: ''+time+':00 '+add, value: ''+original_time+':00' })
        arr.push({ label: ''+time+':15 '+add, value: ''+original_time+':15' })
        arr.push({ label: ''+time+':30 '+add, value: ''+original_time+':30' })
        arr.push({ label: ''+time+':45 '+add, value: ''+original_time+':45' })
      }

      return arr;
    },
    checkFields() {
      return this.ppModalData.dateStart && this.ppModalData.timeStart && this.ppModalData.duration;
    },
    checkAcceptFields() {
      return this.acceptModalData.dateStart && this.acceptModalData.timeStart && this.acceptModalData.duration;
    },
    durationList() {
      let durations = [];

      for(let i = 1; i < 5; i++) {
        durations.push({
          label: i*15+' min',
          value: i*15
        });
      }

      return durations;
    },
    pastMeetingsTable() {
      let arr = [...this.tableSearch()];
      if (!this.currentTableFilter) {
        return arr;  
      }
      console.log(this.currentTableFilter);
      
      if (this.currentTableFilter == 'date' || this.currentTableFilter == 'dateRev') {
        return arr.sort((a, b) => {
          const aDate = new Date(a.dateStart);
          const bDate = new Date(b.dateStart);
          let result = this.currentTableFilter == 'date' ? aDate < bDate : bDate < aDate;
          return result ? 1 : -1;
        });
      }
      if (this.currentTableFilter == 'time' || this.currentTableFilter == 'timeRev') {
        return arr.sort((a, b) => {
          let result = this.currentTableFilter == 'time' ? a.formatDate.displayTimeStart < b.formatDate.displayTimeStart : b.formatDate.displayTimeStart < a.formatDate.displayTimeStart;
          return result ? 1 : -1;
        });
      }

      if (this.currentTableFilter == 'duration' || this.currentTableFilter == 'durationRev') {
        return arr.sort((a, b) => {
          let result = this.currentTableFilter == 'duration' ? a.formatDate.duration < b.formatDate.duration : b.formatDate.duration < a.formatDate.duration;
          return result ? 1 : -1;
        });
      }

      if (this.currentTableFilter == 'type' || this.currentTableFilter == 'typeRev') {
        return arr.sort((a, b) => {
          let result = this.currentTableFilter == 'type' ? this.twitchOrZoom(a) == 'zoom' : this.twitchOrZoom(a) == 'twitch';
          return result ? 1 : -1;
        });
      }

      if (this.currentTableFilter == 'name' || this.currentTableFilter == 'nameRev') {
        return arr.sort((a, b) => {
          const aName = a.otherUser.name + ' ' + a.otherUser.surname;
          const bName = b.otherUser.name + ' ' + b.otherUser.surname;
          let result = this.currentTableFilter == 'name' ? aName < bName : bName < aName;
          return result ? 1 : -1;
        });
      }
      
    }
  }
}
