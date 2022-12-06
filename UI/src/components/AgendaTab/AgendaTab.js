import { mapGetters, mapState } from 'vuex'
import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js';

import VideoMeeting from '@/components/VideoMeeting/VideoMeeting.vue';
import VueSlickCarousel from 'vue-slick-carousel'

export default {
  name: 'AgendaTab',
  props: {
    eventObj: Object,
    agenda: Object,
    evtDayList: Array,
    showTickets: Boolean,
    standObj: Object,
    tiersList: Array,
    type: String,
  },
  components: {
    VideoMeeting,
    VueSlickCarousel
  },
  created() {
    if (this.showTickets) {
      this.$emit('single-event-agenda-loaded', this.agenda.sessions);
    }

    const dateObjects = [];

    this.evtDayList.pop();
    this.evtDayList.forEach((item, index) => {
      let dateStart = new Date(item.oldvalStart);
      let dateName = dateStart.getFullYear()+'_'+(dateStart.getMonth()+1)+'_'+dateStart.getDate();
      if (!this.agendaDates.includes(dateName)) {
        this.agendaDates.push(dateName);
        dateObjects.push({
          date: dateStart,
          dateName: dateName
        });
        this.agendaLists[dateName] = {
          sMonth: (dateStart.getMonth() + 1) < 10 ? '0'+(dateStart.getMonth() + 1) : (dateStart.getMonth() + 1),
          sDate: dateStart.getDate() < 10 ? '0'+dateStart.getDate() : dateStart.getDate(),
          sDay: this.dayNames[dateStart.getDay()],
          sFullMonth: this.dayMonthes[dateStart.getMonth()],
          sYear: dateStart.getFullYear(),
          items: [],
        };
      }

      if (index == (this.evtDayList.length - 1) ) {
        this.wlq = true;
      }
      this.$forceUpdate();
    });

    this.agenda.sessions.forEach((session, index) => {
      let dateStart = new Date(session.date.dateStart);
      let dateEnd = new Date(session.date.dateEnd);
      session.sYear = dateStart.getFullYear();
      session.eYear = dateEnd.getFullYear();
      session.sMonth = (dateStart.getMonth() + 1) < 10 ? '0'+(dateStart.getMonth() + 1) : (dateStart.getMonth() + 1);
      session.eMonth = (dateStart.getMonth() + 1) < 10 ? '0'+(dateStart.getMonth() + 1) : (dateStart.getMonth() + 1);
      session.sDate = dateStart.getDate() < 10 ? '0'+dateStart.getDate() : dateStart.getDate();
      session.eDate = dateEnd.getDate() < 10 ? '0'+dateStart.getDate() : dateStart.getDate();
      session.sDay = this.dayNames[dateStart.getDay()];
      session.eDay = this.dayNames[dateEnd.getDay()];

      session.sHours = dateStart.getUTCHours();
      session.eHours = dateEnd.getUTCHours();
      session.sMinutes = dateStart.getUTCMinutes();
      session.eMinutes = dateEnd.getUTCMinutes();
      let dateName = dateStart.getFullYear()+'_'+(dateStart.getMonth()+1)+'_'+dateStart.getDate();
      if (!this.agendaDates.includes(dateName)) {
        dateObjects.push({
          date: dateStart,
          dateName: dateName
        });
        this.agendaDates.push(dateName);

        this.agendaLists[dateName] = {
          sMonth: (dateStart.getMonth() + 1) < 10 ? '0'+(dateStart.getMonth() + 1) : (dateStart.getMonth() + 1),
          sFullMonth: this.dayMonthes[dateStart.getMonth()],
          sDate: dateStart.getDate() < 10 ? '0'+dateStart.getDate() : dateStart.getDate(),
          sDay: this.dayNames[dateStart.getDay()],
          sYear: session.sYear,
          items: [],
        };
      }

      this.agendaLists[dateName].items.push(session);
      this.agendaDates = [];
      dateObjects.sort( (a, b) => {
        if (a.date > b.date) { return 1 }
        if (a.date < b.date) { return -1 }
        return 0;
      })
      dateObjects.forEach(item => {
        this.agendaDates.push(item.dateName);
      })
      if (index == (this.agenda.sessions.length - 1) ) {
        this.alq = true;
      }
      this.$forceUpdate();
    });

    Object.keys(this.agendaLists).forEach(item => {
      if (this.agendaLists[item].items && this.agendaLists[item].items.length) {
        this.agendaLists[item].dateTimeStart = this.agendaLists[item].items[this.agendaLists[item].items.length - 1].sHours;
        this.agendaLists[item].dateTimeEnd = this.agendaLists[item].items[0].eMinutes ? this.agendaLists[item].items[0].eHours + 1 : this.agendaLists[item].items[0].eHours;
        this.agendaLists[item].timeline = [];
        for (let i = this.agendaLists[item].dateTimeStart; i <= this.agendaLists[item].dateTimeEnd; i++) {
          this.agendaLists[item].timeline.push(i);
        }
      }
    });

  },
  mounted() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth()+1;
    const day = today.getDate();
    const agendaDateFormat = `${year}_${month}_${day}`;

    const index = this.agendaDates.indexOf(agendaDateFormat);
    if (index > -1) {
      this.selectAgenda(index);
    }
    this.$forceUpdate();
  },
  data: function () {
    return {
      dayNames: datepicker_lang.days.full,
      dayMonthes: datepicker_lang.months.full,
      agendaDates: [],
      agendaLists: {},
      wlq: false,
      alq: false,
      agenda_carousel_settings: {
        slidesToShow: 3,
        infinite: false,
        cssEase: 'ease-in-out',
        focusOnSelect: false,
      },
      activeAgenda: 0,
      agendaOpened: false,
      currentActivity: null,
    }
  },

  methods: {
    closeVideo() {
      this.agendaOpened = false;
      this.$forceUpdate();
    },
    getLogoLink(link) {
      return func.url_64x64('https://'+this.configs.binary+'/'+link);
    },
    callToActionClick(item) {
      this.$router.push({ path:  `/${this.routes.mymeetings}/${this.routes.mymeetings_video}/${item.id}`});
      setTimeout(() => {
        this.currentActivity = item;
        this.agendaOpened = true;
        this.$emit('agenda-opened', item);
        this.$forceUpdate();
      },1000)
    },
    backClick() {
      this.agendaOpened = false;
      this.$router.go(-1);
    },
    selectAgenda(index) {
      this.activeAgenda = index;
    },
    is_live(activity) {
      if (!activity) { return false; }
      const now = new Date().toISOString();

      return now > activity.dateStart && now < activity.dateEnd;
    },
    is_past(activity) {
      if (!activity) { return false; }
      const now = new Date().toISOString();

      return now > activity.dateEnd;
    },
    is_future(activity) {
      if (!activity) { return false; }
      const now = new Date().toISOString();

      return now < activity.dateStart;
    },
    isPresenter(item) {
      let result = false;
      if (item.attendees && item.attendees.length && this.userData) {
        item.attendees.forEach(item => {
          if ((item.role == 'presenter' || item.role == 'moderator') && item.id == this.userData.id) {
            result = true;
          }
        })
      }

      return result;
    },
    orderedAgendaLists(date) {
      this.agendaLists[date].items = this.agendaLists[date].items.sort((a,b) => (a.dateStart > b.dateStart) ? 1 : ((b.dateStart > a.dateStart) ? -1 : 0));
      return this.agendaLists[date].items;
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs',
      'getAuthUser'
    ]),
    ...mapState([
      'userData'
    ]),
    locPrefix() {
      return this.type == 'stand' ? 'ss_' : 'se_';
    },

  }
}
