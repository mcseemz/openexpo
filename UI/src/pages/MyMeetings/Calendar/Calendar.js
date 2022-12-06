import { mapActions, mapGetters } from 'vuex';
// import eventMixin from '../../mixins/event/event.js';
import { FullCalendar } from 'vue-full-calendar'
import 'fullcalendar/dist/fullcalendar.css'

export default {
  name: 'Calendar',
  // mixins: [eventMixin],
  components: {
    FullCalendar,
  },
  props: {
    comingMeetings: Array,
    pastMeetings: Array,
  },
  created(){
    let events = [];
    [...this.pastMeetings, ...this.comingMeetings].forEach(item => {
      events.push({
        title: item.user.name + ' ' + item.user.surname,
        start: item.dateStart,
        end: item.dateEnd,
        className: 'activity-'+item.activityId,
      });
    });
    this.events = events;

    let tooltipElem;

    document.onmouseover = function(event) {
      let target = event.target;

      let tooltipHtml = target.dataset.tooltip;
      if (!tooltipHtml) {
        target = target.closest('.fc-event');
        tooltipHtml = target ? target.dataset.tooltip : false;
      }
      if (!tooltipHtml) return;

      tooltipElem = document.createElement('div');
      tooltipElem.className = 'tooltip';
      tooltipElem.innerHTML = tooltipHtml;
      document.body.append(tooltipElem);

      let coords = target.getBoundingClientRect();

      let left = coords.left + (target.offsetWidth - tooltipElem.offsetWidth) / 2;
      if (left < 0) left = 0;

      let top = coords.top - tooltipElem.offsetHeight - 5;
      if (top < 0) {
        top = coords.top + target.offsetHeight + 5;
      }

      tooltipElem.style.left = left + 'px';
      tooltipElem.style.top = top + 'px';
    };

    document.onmouseout = function(e) {

      if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
      }

    };

  },
  data: function () {
    return {
      events: [
        {
            title  : 'event1',
            start  : '2010-01-01',
        },
        {
            title  : 'event2',
            start  : '2010-01-05',
            end    : '2010-01-07',
        },
        {
            title  : 'event3',
            start  : '2020-06-29T12:30:00',
            allDay : false,
        },
      ],
      config: {
        defaultView: 'month',
        editable: false
        // drop: false,
        // draggable: false
      },
    }
  },
  methods: {
    ...mapActions([
      'getActivity',
      'getActivityMeeting',
      'getActivityById'
    ]),
    tmp(event) {
      console.log('123123', event);
      let elems = [];
      setTimeout(()=>{
        [...this.pastMeetings, ...this.comingMeetings].forEach(item => {
          const elem = document.querySelector('.activity-'+item.activityId);
          elem.classList.add('popover-trigger');
          const html = elem.innerHTML;
          const title = item.otherUser.name + ' ' + item.otherUser.surname;
          const meetingType = this.getMeetingType(item);
          const duration = item.formatDate.duration;
          const date = item.formatDate.displayDate;
          const time = item.formatDate.displayTimeStart;
          const notes = item.notes ? item.notes : '';
          elem.dataset.tooltip = `
          <p class="tooltop_title">${title}</p>
          <div class="tooltip_items">
            <div class="tooltip_item">
              <p class="tooltip_item_title">${this.tr('mymeet_meeting_type')}</p>
              <p class="tooltip_item_value">${meetingType}</p>
            </div>
            <div class="tooltip_item">
              <p class="tooltip_item_title">${this.tr('mymeet_duration')}</p>
              <p class="tooltip_item_value">${duration}</p>
            </div>
            <div class="tooltip_item">
              <p class="tooltip_item_title">${this.tr('mymeet_date')}</p>
              <p class="tooltip_item_value">${date}</p>
            </div>
            <div class="tooltip_item">
              <p class="tooltip_item_title">${this.tr('mymeet_start_time_label')}</p>
              <p class="tooltip_item_value">${time}</p>
            </div>
            <div class="tooltip_item tooltip_note">
              <p class="tooltip_item_title">${this.tr('mymeet_note')}</p>
              <p class="tooltip_item_value">${notes}</p>
            </div>
          </div>`;
          // elem.innerHTML = html + '<ui-popover class="fullcalendar_popover" animation="none"><div class="fullcalendar_popover_content"><p>'+item.notes+'</p></div></ui-popover>';
          // elem.append('');
          elems.push(elem);
          console.log('.activity-'+item.activityId, elems);
        });
      },1);


    },
    getMeetingType(item) {
      if (item.url.indexOf('zoom.us') !== -1) {
        return this.tr('staff_agenda_zoom_opt');
      }
      return this.tr('staff_openexpo_video');
    },
    refreshEvents() {
      this.$refs.calendar.$emit('refetch-events');
      let elems = document.querySelectorAll('.fc-month-view .fc-event');
    console.log(elems);

    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs'
    ]),

  }
}
