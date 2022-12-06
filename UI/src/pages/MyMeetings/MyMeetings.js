import Logo from '../../components/Logo/Logo.vue'

import keenui from '@/plugins/keenUi';

import Meetings from './Meetings/Meetings.vue'
import Calendar from './Calendar/Calendar.vue'

import { mapActions, mapGetters } from 'vuex';
import datepicker_lang from '@/others/datepicker_lang';
import func from '@/others/functions';
// import eventMixin from '../../mixins/event/event.js';
import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "mymeetings" */ '@/../locales/mymeetings/'+lang+'.json')
};

export default {
  name: 'MyMeetings',
  components: {
    Logo,
    Meetings,
    Calendar
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('my_meetings') : 'My meetings',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('my_meetings') : 'My meetings' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('my_meetings') : 'My meetings' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('my_meetings') : 'My meetings' },
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
    const zoomElem = document.getElementById('zmmtg-root');
    if (zoomElem) {
      zoomElem.classList.remove('opened');
    }
    this.userGetMeetings({
      type: 'coming',
      callback: (resp) => {
        console.log(resp);
        let comingMeetings = resp.data.body;

        this.addMeetingData(comingMeetings, () => {
          this.comingMeetings = comingMeetings;
          this.$forceUpdate();
        });

        this.userGetMeetings({
          type: 'past',
          callback: (resp) => {
            console.log('past', resp);
            let pastMeetings = resp.data.body;
            this.addMeetingData(pastMeetings, () => {
              this.pastMeetings = pastMeetings;
              this.$forceUpdate();
            });
            this.preload = false;
          }
        });
      }
    });
  },
  data: function () {
    return {
      localesLoaded: false,
      comingMeetings: [],
      pastMeetings: [],
      selectedMenu:  'meetings',
      activity: null,
      eventLoaded: false,
      filter: 'all',
      preload: true,
      datepicker_lang: datepicker_lang,
      gridPreload: false,
    }
  },
  methods: {
    ...mapActions([
      'getActivity',
      'getActivityMeeting',
      'getActivityById',
      'userGetMeetings',
      'apiGetUser',
      'apiGetCompany'
    ]),
    reloadMeetings() {
      this.gridPreload = true;
      this.userGetMeetings({
        type: 'coming',
        callback: (resp) => {
          console.log(resp);
          let comingMeetings = resp.data.body;

          this.addMeetingData(comingMeetings, () => {
            this.comingMeetings = comingMeetings;
            this.$forceUpdate();
          });

          this.userGetMeetings({
            type: 'past',
            callback: (resp) => {
              console.log('past', resp);
              let pastMeetings = resp.data.body;
              this.addMeetingData(pastMeetings, () => {
                this.pastMeetings = pastMeetings;
                this.$forceUpdate();
              });
              this.gridPreload = false;
            }
          });
        }
      });
    },
    addMeetingData(meetingList, callback) {
      let m_i = 0;
      meetingList.forEach( (item, index) => {
        if(!item.otherUser) return;
        this.apiGetUser({
          id: item.otherUser.id,
          callback: (resp) => {
            meetingList[index].user = resp.data.body;
            meetingList[index].user.avatar = false;
            meetingList[index].formatDate = this.meetingDateFormat(item.dateStart, item.dateEnd, item.timezone);
            if (resp.data.body.branding && resp.data.body.branding.length) {
              resp.data.body.branding.forEach(item => {
                if (!item.strings && !item.strings.length) {
                  return false;
                }

                item.strings.forEach(str => {

                  if (str.category == 'description_long') {

                    if (str.value == 'logo_image') {
                      meetingList[index].user.avatar = func.url_64x64('https://'+this.configs.binary+'/'+item.url);
                    }

                  }
                });

              });
            }
            this.apiGetCompany({
              id: item.otherUser.company,
              callback: (resp) => {
                meetingList[index].company = resp.data.body;
                console.log('company', resp);
                this.$forceUpdate();
                if (m_i == (meetingList.length - 1) ) {
                  if (callback) {
                    callback();
                  }
                }
                m_i++;
              }
            })
          }
        })
      });
    },
    meetingDateFormat(start, end, timezone) {
      if (!start || !end) {
        return false;
      }
      const dateStart = new Date(start);
      const dateEnd = new Date(end);



      let offset = Math.abs(dateStart.getTimezoneOffset());
      let tz = timezone*60;
      if (dateStart.getTimezoneOffset() < 0) {
        offset = offset - tz;
      } else {
        offset  = offset + tz;
      }

      const dateStartCTZ = new Date(dateStart.getTime() + offset*60000);
      const dateEndCTZ = new Date(dateEnd.getTime() + offset*60000);

      // console.log('OFFSET', offset);

      const startMonth = datepicker_lang.months.abbreviated[dateStart.getUTCMonth()];
      const endMonth = datepicker_lang.months.abbreviated[dateEnd.getUTCMonth()];

      const startDay = datepicker_lang.days.full[dateStart.getUTCDay()];
      const endDay = datepicker_lang.days.full[dateEnd.getUTCDay()];

      const dateString = `${startDay} ${startMonth} ${dateStart.getUTCDate()}, ${dateStart.getUTCFullYear()}`;

      const startHours = dateStart.getUTCHours() < 10 ? '0'+dateStart.getUTCHours() : dateStart.getUTCHours();
      const endHours = dateEnd.getUTCHours() < 10 ? '0'+dateEnd.getUTCHours() : dateEnd.getUTCHours();

      const startMinutes = dateStart.getUTCMinutes() < 10 ? '0'+dateStart.getUTCMinutes() : dateStart.getUTCMinutes();
      const endMinutes = dateEnd.getUTCMinutes() < 10 ? '0'+dateEnd.getUTCMinutes() : dateEnd.getUTCMinutes();

      const startMonthCTZ = datepicker_lang.months.abbreviated[dateStartCTZ.getUTCMonth()];
      const endMonthCTZ = datepicker_lang.months.abbreviated[dateEndCTZ.getUTCMonth()];

      const startMonthNum = dateStartCTZ.getUTCMonth() < 10 ? '0'+dateStartCTZ.getUTCMonth() : dateStartCTZ.getUTCMonth();
      const startDateNum = dateStartCTZ.getUTCDate() < 10 ? '0'+dateStartCTZ.getUTCDate() : dateStartCTZ.getUTCDate();

      const startDayCTZ = datepicker_lang.days.full[dateStartCTZ.getUTCDay()];
      const endDayCTZ = datepicker_lang.days.full[dateEndCTZ.getUTCDay()];

      const dateStringCTZ = `${startDayCTZ} ${startMonthCTZ} ${dateStartCTZ.getUTCDate()}, ${dateStartCTZ.getUTCFullYear()}`;

      const startHoursCTZ = dateStartCTZ.getUTCHours() < 10 ? '0'+dateStartCTZ.getUTCHours() : dateStartCTZ.getUTCHours();
      const endHoursCTZ = dateEndCTZ.getUTCHours() < 10 ? '0'+dateEndCTZ.getUTCHours() : dateEndCTZ.getUTCHours();

      const startMinutesCTZ = dateStartCTZ.getUTCMinutes() < 10 ? '0'+dateStartCTZ.getUTCMinutes() : dateStartCTZ.getUTCMinutes();
      const endMinutesCTZ = dateEndCTZ.getUTCMinutes() < 10 ? '0'+dateEndCTZ.getUTCMinutes() : dateEndCTZ.getUTCMinutes();

      // const startHoursGTM = dateStart.getUTCHours() < 10 ? '0'+dateStart.getUTCHours() : dateStart.getUTCHours();
      // const endHoursGTM = dateEnd.getUTCHours() < 10 ? '0'+dateEnd.getUTCHours() : dateEnd.getUTCHours();

      // const startMinutesGTM = dateStart.getUTCMinutes() < 10 ? '0'+dateStart.getUTCMinutes() : dateStart.getUTCMinutes();
      // const endMinutesGTM = dateEnd.getUTCMinutes() < 10 ? '0'+dateEnd.getUTCMinutes() : dateEnd.getUTCMinutes();

      const timeString = `${startHours}:${startMinutes} - ${endHours}:${endMinutes}`;
      const timeStringCTZ = `${startHoursCTZ}:${startMinutesCTZ} - ${endHoursCTZ}:${endMinutesCTZ}`;

      // console.log('TIME TIME', timeString, timeStringCTZ);

    //   var sign = (date.getTimezoneOffset() > 0) ? "-" : "+";
    // var offset = Math.abs(date.getTimezoneOffset());
    // var hours = pad(Math.floor(offset / 60));
    // var minutes = pad(offset % 60);
    // return sign + hours + ":" + minutes;

      const dateDiff = new Date(dateEnd.getTime() - dateStart.getTime());
      const duration = dateDiff.getTime()/60000;

      return {
        date: dateString,
        time: timeString,
        timeStart: `${dateStart.getUTCHours()}:${dateStart.getUTCMinutes()}`,
        displayTimeStart: `${startHoursCTZ}:${startMinutesCTZ}`,
        displayDate: `${startMonthNum}/${startDateNum}/${dateStartCTZ.getUTCFullYear()}`,
        dateCTZ: dateStringCTZ,
        timeCTZ: timeStringCTZ,
        duration: duration
      }

    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs',
      'getLocale'
    ]),

  }
}
