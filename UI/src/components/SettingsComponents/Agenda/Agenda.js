import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js';

import {mapActions, mapGetters} from 'vuex';
import {utc} from 'moment';
import momentTz from 'moment-timezone';
import slugify from 'slugify';
import VueUploadComponent from 'vue-upload-component';
import CroppModal from '@/components/CroppModal/CroppModal.vue';
import ModalCreatePersonnel from "../Personnel/ModalCreatePersonnel";
import validName from "../../../mixins/validName";
import filtered from "../../../mixins/validName";

export default {
  name: 'Agenda',
  mixins: [validName,filtered],
  components: {
    CroppModal,
    VueUploadComponent,
    ModalCreatePersonnel,
  },
  props: {
    mainObj: Object,
    agenda: Object,
    dayList: Array,
    objectType: String,
    eventObj: Object,
    pricingTags: Array,
  },
  data: function () {
    return {
      refImage: false,
      preload: true,
      userList: [],
      sessionTitleInput: '',
      sessionCustomInput: '',
      persons: [
        {
          name: '',
          info: '',
        }
      ],

      date: {
        dateStart: null,
        timeStart: '',
        dateEnd: null,
        timeEnd: '',
      },

      meetingType: '',
      twitchInput: '',
      twitchMeeting: '',
      twitchPassword: '',
      zoomInput: '',
      zoomMeeting: '',
      zoomPassword: '',
      description: '',
      modalMsg: '',

      enableChat: false,
      enableQA: false,
      presenter: '',
      presenters: [],
      moderator: {},
      youtubeMeeting: '',
      vimeoMeeting: '',
      vimeoChat: '',
      enableVimeoChat: false,

      datepicker_lang: datepicker_lang,

      ticket_name: '',
      ticket_price: '',
      ticket_qty: '',
      ticket_descr: '',

      off_ticket_name: '',
      off_ticket_price: '',
      off_ticket_qty: '',
      off_ticket_descr: '',

      sessionTitleTouched: false,
      sessionCustomTouched: false,
      customNameInputed: false,
      customNameTimeout: null,
      customNameAvailable: true,
      tagsList: [],
      tag: '',
      videoProfile: '',
      thumbnail: [],
      thumbnailPlaceholder: '',
      sameStreamAs: '',
      selectedAgendaIndex: null,
      priceTags: this.pricingTags,
      customNameWanted: false,
      newPersonnel: false,
      checkedCustomName: false,
      agendasessionIndex: null,
      newForm: false
    }
  },
  watch: {
    sessionTitleInput() {
      if (this.customNameWanted == false) this.sessionCustomInput = ""
    },
    customNameWanted(newVal) {
      if (newVal) {
        this.sessionCustomInput = slugify(this.sessionTitleInput.toLowerCase(), {replacement: "-", remove: this.filtered()});
      } else this.sessionCustomInput = ""
      this.$forceUpdate();
    },

  },
  methods: {
    ...mapActions([
      'apiGetPersonnel',
      'apiCheckCustomName',
    ]),
    setModerator(item, typeAction) {
      if (typeAction === 'create') {
        this.moderator.value ? this.moderator = {} : this.moderator = {...item}
      } else if (typeAction === 'edit') {
        if (this.agenda.sessions[this.agendasessionIndex].moderator && this.agenda.sessions[this.agendasessionIndex].moderator.value &&
          this.agenda.sessions[this.agendasessionIndex].moderator.value.id === item.value.id) {
          this.agenda.sessions[this.agendasessionIndex].moderator = {};
          this.agenda.sessions[this.agendasessionIndex].forUpdate = true;
          this.forceUpdate();
        } else {
          this.agenda.sessions[this.agendasessionIndex].moderator = item;
          this.agenda.sessions[this.agendasessionIndex].forUpdate = true;
          this.forceUpdate();
        }
      }

    },
    presenterSelect(item, typeAction) {

      if (typeAction === 'create') {

        this.presenters = this.presenters.length && this.presenters.includes(item)
          ? this.presenters.filter(presenter => presenter.value && presenter.value.id !== item.value.id)
          : [...this.presenters, item]

      } else if (typeAction === 'edit') {
        this.agenda.sessions[this.agendasessionIndex].forUpdate = true;
        let ifChecked = this.agenda.sessions[this.agendasessionIndex].presenters.length &&
          this.agenda.sessions[this.agendasessionIndex].presenters.map(pre => pre.value.id === item.value.id ? true : false);

        if (this.agenda.sessions.length && ifChecked.length && ifChecked.includes(true)) {
          this.agenda.sessions[this.agendasessionIndex].presenters = this.agenda.sessions[this.agendasessionIndex].presenters.filter(pre => pre.value.id !== item.value.id);
          this.forceUpdate();
        } else {
          this.agenda.sessions[this.agendasessionIndex].presenters.push(item);
          this.forceUpdate();
        }
      }
    },
    imageChecker(item) {
      if (item.thumbnailPlaceholder && item.branding && item.branding.length > 0 && item.branding[0].status && item.branding[0].status !== 'stub') {
        return true;
      } else if (item.thumbnailPlaceholder && !item.branding) {
        return true;
      }
      return false;
    },
    imageStub(item) {
      if (item.branding && item.branding.length > 0 && item.branding[0].status && item.branding[0].status === 'stub') {
        return true;
      }
      return false;
    },
    refreshImage(ind) {
      this.agenda.sessions[ind].branding[0].status = "published";
      this.leftKey += 1;
    },
    getCurPersonnel(payload) {
      this.userList.push({
        label: `${payload.name} - ${payload.position}`,
        value: payload
      })
    },
    addNewPersonnel() {
      this.newPersonnel = true;
    },
    closePersonnelModal() {
      this.newPersonnel = false;
    },
    clearThumbnail() {
      this.thumbnail = [];
    },
    tagsChanged(newTags, session) {
      if (session.forUpdate) session.forUpdate = true;
      if (!session) {
        this.tagsList = newTags;
      } else {
        session.tagsList = newTags;
      }
    },
    dateChange(index) {
      this.date.dateEnd = this.date.dateStart;
      const list = this.endTimeList(this.date.dateStart, this.date.dateEnd, this.date.timeStart);
      this.date.timeEnd = list[0];
    },
    dayListToDatestring(date, time) {
      const cloneDate = new Date(date);

      cloneDate.setUTCHours(time.split(":")[0]);
      cloneDate.setMinutes(time.split(":")[1]);
      return cloneDate.toISOString();
    },
    addPerson(index) {
      if (index) {
        this.agenda.sessions[index].persons.push({
          name: '',
          info: '',
        });
      } else {
        this.presons.push({
          name: '',
          info: '',
        });
      }
    },
    touchSession(session) {
      session.forUpdate = true;
      this.$forceUpdate();
    },
    addSession() {

      if (!this.sessionValid()) {
        return false;
      }
      const session = {
        sessionTitle: this.sessionTitleInput,
        customName: this.sessionCustomInput,
        persons: this.persons,
        date: {...this.date},
        dateStart: this.dayListToDatestring(this.date.dateStart, this.date.timeStart.value),
        dateEnd: this.dayListToDatestring(this.date.dateEnd, this.date.timeEnd.value),
        zoom: this.zoomInput,
        zoomMeeting: this.zoomMeeting,
        zoomPassword: this.zoomPassword,
        twitch: this.twitchInput,
        twitchMeeting: this.twitchMeeting,
        youtubeMeeting: this.youtubeMeeting,
        vimeoMeeting: this.vimeoMeeting,
        vimeoChat: this.vimeoChat,
        enableVimeoChat: this.enableVimeoChat,
        meetingType: this.meetingType,
        description: this.description,
        edit: false,
        enableChat: this.enableChat,
        enableQA: this.enableQA,
        presenters: !this.presenters.length && this.presenter.value.id ? [this.presenter.value] : this.presenters,
        moderator: this.moderator,
        tagsList: this.tagsList,
        stringExist: [],
        newStrings: [],
        oldStrings: [],
        startDateTz: this.getDateWithHours(this.date.dateStart, this.date.timeStart.value),
        endDateTz: this.getDateWithHours(this.date.dateEnd, this.date.timeEnd.value),
        profile: this.videoProfile,
        sameStreamAs: this.sameStreamAs,
        thumbnail: this.thumbnail,
        thumbnailPlaceholder: this.thumbnailPlaceholder,
        priceTags: this.priceTags,
        customNameWanted: this.customNameWanted,
      };

      if (this.objectType == 'stand') {
        session.eventId = this.mainObj.event;
      }
      this.agenda.sessions.push(session);

      this.sessionTitleInput = this.description = this.zoomInput = this.zoomMeeting = this.zoomPassword = this.twitchMeeting = this.twitchMeeting = this.twitchPassword = this.youtubeMeeting = this.vimeoMeeting = '';
      this.vimeoChat = '';
      this.sessionCustomInput = '';
      this.sessionTitleTouched = false;
      this.sessionCustomTouched = false;
      this.customNameWanted = false;
      this.enableChat = this.enableQA = this.enableVimeoChat = false;
      this.meetingType = {
        label: this.tr(this.locPrefix + 'agenda_novideo_opt'),
        value: 'no_video',
      };
      this.videoProfile = '';
      if (this.userList) this.presenter = this.userList[0];
      this.persons = [{
        name: '',
        info: '',
      }];
      this.tagsList = [];
      this.tag = '';
      this.date = {
        dateStart: null,
        timeStart: '',
        dateEnd: null,
        timeEnd: '',
      };
      this.thumbnail = [];
      this.thumbnailPlaceholder = '';

      if (!this.dayList || !this.dayList.length) {
        return false;
      }
      const date = new Date(this.dayList[0].oldvalStart);

      this.date.dateStart = this.date.dateEnd = date;
      this.date.timeStart = this.dayList[0].timeFrom;

      const list = this.endTimeList(this.date.dateStart, this.date.dateEnd, this.date.timeStart);
      this.date.timeEnd = list[0];
      if (this.pricingTags) {
        this.priceTags = this.pricingTags.map(tag => {
          return {...tag, selected: false}
        });
      }

      let changedCount = 0;
      this.agenda.sessions.forEach( session => !('format' in session) ?  changedCount += 1 : '');

      this.$store.commit('setNewAddedAgenda',changedCount);
    },
    deleteSession(index) {
      if (this.agenda.sessions[index].id) {
        const isPartOfOtherAgenda = this.agenda.sessions.find(item => item.sameStreamAs && item.sameStreamAs.value === this.agenda.sessions[index].id);

        if (isPartOfOtherAgenda) {
          this.openAgendaModal([this.tr(this.locPrefix + 'agenda_error_same_stream')]);
          return;
        }
        this.agenda.toDelete[this.agenda.sessions[index].id] = true;
      }
      this.agenda.sessions.splice(index, 1);

        let removedLength = Object.keys(this.agenda.toDelete).length;
        let payload = {
          newLength : removedLength,
          total : true
        }
        this.$store.commit('setRemoveAgenda',removedLength);
      this.forceUpdate();
    },
    backToAgendaList(index) {
      this.agenda.sessions = JSON.parse(localStorage.getItem("agenda"));
      localStorage.removeItem('agenda');
      this.$forceUpdate();
      this.agenda.sessions[index].edit = !this.agenda.sessions[index].edit;
    },
    forceUpdate() {
      this.sessionTitleInputAction();
      this.$forceUpdate();
    },
    openAgendaModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>' + item + '</p>';
      });
      this.$refs.messageAgendaModal.open();
    },
    agendaModalClose() {
      this.$refs.messageAgendaModal.close();
    },
    editSession(index) {
      if (this.agenda.sessions[index].attendees && this.agenda.sessions[index].attendees.length) {
        this.agenda.sessions[index].attendees.forEach(attendee => {
          this.userList.forEach(list => {
            if (list.value.id == attendee.id && list.role === 'presenter') {
              this.agenda.sessions[index].presenters = this.agenda.sessions[index].presenters.filter(presenter => presenter.value !== list.value);
              this.agenda.sessions[index].presenters.push({
                label: list.value.name + ' - ' + list.value.position,
                value: list.value
              })
            }
          })
        })
      }
      this.agenda.sessions[index].edit = !this.agenda.sessions[index].edit;
      this.agenda.sessions[index].dateStart = this.dayListToDatestring(this.agenda.sessions[index].date.dateStart, this.agenda.sessions[index].date.timeStart.value);
      this.agenda.sessions[index].dateEnd = this.dayListToDatestring(this.agenda.sessions[index].date.dateEnd, this.agenda.sessions[index].date.timeEnd.value);

      this.agenda.sessions.edited = true;
      this.agendasessionIndex = index;
      localStorage.setItem("agenda", JSON.stringify(this.agenda.sessions, null, 2));
      this.$forceUpdate();
    },
    updateSession(index,id) {
      if (!this.sessionValid(index)) {
        this.agenda.sessions.edited = false;
        return false;
      }

      if (this.objectType == 'stand') {
        this.agenda.sessions[index].eventId = this.mainObj.event;
      }
      this.agenda.sessions[index].edit = !this.agenda.sessions[index].edit;
      this.agenda.sessions.edited = true;
      this.agenda.sessions[index].dateStart = this.dayListToDatestring(this.agenda.sessions[index].date.dateStart, this.agenda.sessions[index].date.timeStart.value);
      this.agenda.sessions[index].dateEnd = this.dayListToDatestring(this.agenda.sessions[index].date.dateEnd, this.agenda.sessions[index].date.timeEnd.value);
      this.agenda.sessions[index].startDateTz = this.getDateWithHours(this.agenda.sessions[index].date.dateStart, this.agenda.sessions[index].date.timeStart.value);
      this.agenda.sessions[index].endDateTz = this.getDateWithHours(this.agenda.sessions[index].date.dateEnd, this.agenda.sessions[index].date.timeEnd.value);
      this.agendasessionIndex = null;
      this.$store.commit('passEditedHint',id);
      localStorage.removeItem('agenda');
      this.$forceUpdate();
      let changedCount = 0;
      this.agenda.sessions.forEach( session => session.forUpdate ?  changedCount += 1 : '');

      this.$store.commit('setEditedAgenda',changedCount);
    },
    getTicketDate(dateObj) {
      const dateStart = dateObj.id ? this.dayListToDatestring(dateObj.date.dateStart, dateObj.date.timeStart.value)
        : this.getDateWithHours(dateObj.date.dateStart, dateObj.date.timeStart.value);
      const dateEnd = dateObj.id ? this.dayListToDatestring(dateObj.date.dateEnd, dateObj.date.timeEnd.value)
        : this.getDateWithHours(dateObj.date.dateEnd, dateObj.date.timeEnd.value);
      const noUTC = !dateObj.id;
      return func.calcDisplayDate(dateStart, dateEnd, null, noUTC, this.timezoneName).agendaFormat;
    },
    getDateWithHours(date, time) {
      const cloneDate = new Date(date);

      cloneDate.setHours(time.split(":")[0]);
      cloneDate.setMinutes(time.split(":")[1]);

      const parsedDate = momentTz.tz(func.formatDate(cloneDate), this.timezoneName).format();
      return parsedDate;
    },
    setZoomLink(index) {
      if (!index) {
        if (this.zoomMeeting) {
          this.zoomInput = 'https://zoom.us/wc/join/' + this.zoomMeeting + '?prefer=0&pwd=' + this.zoomPassword;
        } else {
          this.zoomInput = '';
        }

      }
      if ((index || index === 0) && this.agenda.sessions[index].zoomMeeting) {

        if (this.agenda.sessions[index].zoomMeeting) {
          this.agenda.sessions[index].zoom = 'https://zoom.us/wc/join/' + this.agenda.sessions[index].zoomMeeting + '?prefer=0';
          if (this.agenda.sessions[index].zoomPassword) {
            this.agenda.sessions[index].zoom += '&pwd=' + this.agenda.sessions[index].zoomPassword;
          }
        } else {
          this.agenda.sessions[index].zoom = '';
        }
        this.touchSession(this.agenda.sessions[index]);
        this.$forceUpdate();
      }
    },

    setTwitchLink(index) {
      if (!index) {
        if (this.twitchMeeting) {
          this.twitchInput = 'https://player.twitch.tv/?channel=' + this.twitchMeeting;
        } else {
          this.twitchInput = '';
        }

      }
      if ((index || index === 0) && this.agenda.sessions[index].twitchMeeting) {
        if (this.agenda.sessions[index].twitchMeeting) {
          this.agenda.sessions[index].twitch = 'https://player.twitch.tv/?channel=' + this.agenda.sessions[index].twitchMeeting;
        } else {
          this.agenda.sessions[index].twitch = '';
        }
        this.$forceUpdate();
      }
    },

    sessionValid(index) {
      let session = {};
      if (index || index === 0) {
        session = this.agenda.sessions[index]
      } else {
        session = {
          sessionTitle: this.sessionTitleInput,
          customName: this.sessionCustomInput,
          date: this.date,
          meetingType: this.meetingType,
          zoomMeeting: this.zoomMeeting,
          zoomPassword: this.zoomPassword,
          twitchMeeting: this.twitchMeeting,
          description: this.description,
          youtubeMeeting: this.youtubeMeeting,
          vimeoMeeting: this.vimeoMeeting,
          customNameAvailable: this.customNameAvailable,
          profile: this.videoProfile,
          customNameWanted: this.customNameWanted
        }
      }

      const errorsArr = [];

      if (!session.sessionTitle || (!session.customName && session.customNameWanted)) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_title_required'));
      }
      if (session.sessionTitle.length > 150 || session.customName.length > 150) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_title_length'));
      }
      if (/[<>;{}$]/.test(session.sessionTitle) || /[<>;{}$]/.test(session.customName)) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_title_symbols'))
      }
      if (!session.customNameAvailable && session.customNameWanted) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_custom_name'));
      }
      if (!session.date.dateStart) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_datestart'))
      }
      if (!session.date.dateEnd) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_dateend'))
      }
      if (!session.date.timeStart) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_timestart'))
      }
      if (!session.date.timeEnd) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_timeend'))
      }


      const sessionEnded = () => {
        const sessionDate = session.date.dateEnd;
        const currentDate = new Date();
        const result = isFinite(sessionDate.valueOf()) 
                    && isFinite(currentDate.valueOf()) 
                    ? (sessionDate>currentDate)-(sessionDate<currentDate)
                    : NaN;

        return result < 0;
      }

      if (sessionEnded()) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_date_expired'))
      }

      if (session.meetingType.value == 'zoom' && session.zoomMeeting.length) {

        if (session.zoomMeeting.indexOf('.') !== -1) {
          errorsArr.push(this.tr(this.locPrefix + 'agenda_error_zoom_onlynumbers'))
        }
        if (session.zoomMeeting.length > 15) {
          errorsArr.push(this.tr(this.locPrefix + 'agenda_error_zoom_length'));
        }

      }
      if (session.meetingType.value == 'zoom' && session.zoomPassword.length > 50) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_zoompassword_length'));
      }
      if (session.meetingType.value == 'vimeo' && (session.vimeoMeeting.indexOf('vimeo.com') == -1 || !session.vimeoMeeting.split('vimeo.com/')[1])) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_vimeo'));
      }
      if (session.meetingType.value == 'youtube' && session.youtubeMeeting.indexOf('youtu.be/') == -1 && session.youtubeMeeting.indexOf('youtube.com/watch?v=') == -1) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_youtube'));
      }
      if (session.meetingType.value == 'twitch' && session.twitchMeeting.length > 30) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_twitch_length'));
      }
      if (session.description.length > 1000) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_description_length'));
      }
      if (session.meetingType.value === 'webinar' && !session.profile) {
        errorsArr.push(this.tr(this.locPrefix + 'agenda_error_no_profile'));
      }

      if (errorsArr.length) {
        this.openAgendaModal(errorsArr);
        return false;
      }

      return true;

    },
    minEndDateSess(date) {
      return this.date.dateStart ? this.date.dateStart : this.minDate;
    },
    sessionMaxDate() {
      return this.maxDate;
    },

    endTimeList(dateStart, dateEnd, timeStart) {
      if (!timeStart || !dateStart || !dateEnd) {
        return [];
      }
      let startHours = 0;
      let startMinutes = 0;
      if (!(dateStart - dateEnd)) {
        startHours = +timeStart.value.split(':')[0];
        startMinutes = (+timeStart.value.split(':')[1] / 15) + 1;

        if (startMinutes > 3) {
          startMinutes = 0;
          startHours += 1;
        }
      }
      let arr = [];
      for (let i = startHours; i < 24; i++) {
        var original_time = i;
        var add = i > 11 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0' + time : time;
        if (time === '00') time = '12';
        original_time = original_time < 10 ? original_time : original_time;

        if (i !== startHours) {
          startMinutes = 0;
        }
        for (let j = startMinutes; j < 4; j++) {
          let minutes = j * 15 > 10 ? j * 15 : '0' + j * 15;
          arr.push({label: '' + time + ':' + minutes + ' ' + add, value: '' + original_time + ':' + minutes})
        }
      }

      arr = this.spliceArrayByDate(arr, dateEnd, 'oldvalEnd');

      return arr;
    },
    startTimeList(dateStart, dateEnd) {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 11 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0' + time : time;
        original_time = original_time < 10 ? original_time : original_time;
        if (time === '00') time = '12';

        arr.push({label: '' + time + ':00 ' + add, value: '' + original_time + ':00'})
        arr.push({label: '' + time + ':15 ' + add, value: '' + original_time + ':15'})
        arr.push({label: '' + time + ':30 ' + add, value: '' + original_time + ':30'})
        arr.push({label: '' + time + ':45 ' + add, value: '' + original_time + ':45'})
      }

      arr = this.spliceArrayByDate(arr, dateStart, 'oldvalStart', true);
      arr = this.spliceArrayByDate(arr, dateEnd, 'oldvalEnd');

      return arr;
    },
    spliceArrayByDate(arr, date, key, start) {
      if (!date) return arr;
      const dayEnd = new Date(date).getDate() ;
      const dayFromList = this.dayList.find(item => {
        if (item[key]) {
          const date = momentTz.tz(utc(item[key]).format('YYYY-MM-DD HH:mm'), this.timezoneName).format('YYYY/MM/DD');
          const dateObj = new Date(date);
          return dateObj.getUTCDate() === dayEnd;
        }
      });

      if (dayFromList) {
        const dayDate = new Date(dayFromList[key]);
        const mainObj = this.eventObj ? this.eventObj.timezoneObj : this.mainObj.timezoneObj;
        dayDate.setHours(dayDate.getHours() + mainObj.value, 0, 0, 0);
        let hrs = dayDate.getUTCHours();
        let mins = dayDate.getUTCMinutes();
        mins = mins < 10 ? '0' + mins : mins;
        const finalTimeValue = `${hrs}:${mins}`;

        const index = arr.map(item => item.value).indexOf(finalTimeValue);

        if (index > -1) {
          if (start) {
            arr = arr.splice(index, arr.length - 1);
          } else {
            arr = arr.splice(0, index + 1);
          }
        }
      }

      return arr;
    },
    getObjectByValue(val, key) {
      if (val && val.label && val.value) {
        return val;
      }
      let result = {
        label: val,
        value: val
      }
      this[key].forEach(item => {
        if (item.value == val) {
          result = item;
        }
      })
      return result;
    },
    customNameInput(inputed) {
      if (inputed) {
        this.customNameInputed = true;
      }
      this.sessionCustomInput = slugify(this.sessionCustomInput.toLowerCase(), {replacement: "-", remove: this.filtered()});
      if (this.customNameTimeout) {
        clearTimeout(this.customNameTimeout);
      }

      if (this.sessionCustomInput) {
        this.customNameTimeout = setTimeout(() => {
          this.apiCheckCustomName({
            type: 'activity',
            customName: this.sessionCustomInput,
            callback: (response) => {
              if (response.data.statusCode == '200') {
                this.customNameAvailable = true
              } else {
                this.customNameAvailable = false;
              }
            }
          })
        }, 1000);
      }
    },
    sessionTitleInputAction() {
      if (this.customNameWanted) {
        this.sessionCustomInput = slugify(this.sessionTitleInput.toLowerCase(), {replacement: "-", remove: this.filtered()});
        // this.customNameInput(false);
      }
      this.$forceUpdate();

    },
    customNameInputEdited(inputed, session) {
      if (inputed) {
        session.customNameInputed = true;
      }
      session.forUpdate = true;
      session.customName = slugify(session.customName.toLowerCase(), {replacement: "-"});
      if (this.customNameTimeout) {
        clearTimeout(this.customNameTimeout);
      }

      if (session.customName) {
        this.customNameTimeout = setTimeout(() => {
          this.apiCheckCustomName({
            type: 'activity',
            customName: session.customName,
            callback: (response) => {
              if (response.data.statusCode == '200') {
                session.customNameAvailable = true
              } else {
                session.customNameAvailable = false;
              }
            }
          })
        }, 1000);
      }
    },
    sessionTitleInputEdit(session) {
      session.forUpdate = true;
      if ( session.customNameWanted) {
        session.customName = slugify(session.sessionTitle.toLowerCase(), {replacement: "-", remove: this.filtered()});
        this.customNameInputEdited(false, session);
      }
    },

    agendaSessionIds(meetingType, id) {
      const agendaForType = this.agenda.sessions.filter(item => {
        return item.id && item.id !== id && !item.sameStreamAs.value && item.meetingType && item.meetingType.value === meetingType;
      });
      if (!agendaForType.length) return [];

      return [
        {label: 'No dependency', value: null},
        ...agendaForType.map(item => {
          return {
            label: item.sessionTitle,
            value: item.id
          }
        })
      ];
    },
    meetingTypeSelected(event, session) {
      if (['webinar', 'no_video', 'team_meeting'].includes(event.value)) {
        if (session) {
          session.profile = {
            label: this.tr(this.locPrefix + 'agenda_general_profile'),
            value: 'general',
          }
        } else if (!this.videoProfile) {
          this.videoProfile = {
            label: this.tr(this.locPrefix + 'agenda_general_profile'),
            value: 'general',
          }
        }
      }
    },
    existedFile(newFile, index) {
      if (!newFile) {
        this.agenda.sessions[index].thumbnail = null;
        return false;
      }
      this.selectedAgendaIndex = index;

      let reader = new FileReader();
      reader.onload = () => {
        // this.urlForCropp = reader.result;
        this.touchSession(this.agenda.sessions[index]);
        this.$refs.croppModal.open(reader.result, this.agenda.sessions[index].thumbnail);
      }

      reader.readAsDataURL(newFile.file);
    },
    inputFile(newFile, oldFile) {
      if (!newFile) {
        this.thumbnail = [];
        return false;
      }
      this.selectedAgendaIndex = null;

      let reader = new FileReader();

      reader.onload = () => {
        this.$refs.croppModal.open(reader.result, this.thumbnail);
      }

      let url = reader.readAsDataURL(newFile.file);
    },
    removeThumbnail(event, session) {
      if (session) {
        session.thumbnail = [];
        session.thumbnailPlaceholder = null;
        if (session.branding?.length) {
          session.removeImage = session.branding[0].id;
          this.touchSession(session);
        }
        return;
      }
      this.thumbnail = [];
      this.thumbnailPlaceholder = '';
    },
    editThumbnail(evt, index) {
      if (index || index === 0) {
        this.selectedAgendaIndex = index;
      }
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    croppFinished(data) {
      if (this.selectedAgendaIndex || this.selectedAgendaIndex === 0) {
        this.agenda.sessions[this.selectedAgendaIndex].thumbnail[0].file = data.file;
        this.agenda.sessions[this.selectedAgendaIndex].thumbnailPlaceholder = data.url;

        if (this.agenda.sessions[this.selectedAgendaIndex].branding?.length) {
          this.agenda.sessions[this.selectedAgendaIndex].removeImage = this.agenda.sessions[this.selectedAgendaIndex].branding[0].id;
          this.$forceUpdate();
        }
        this.selectedAgendaIndex = null;
      } else {
        this.thumbnail[0].file = data.file;
        this.thumbnailPlaceholder = data.url;
      }
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'features',
      'configs',
    ]),
    locPrefix() {
      return this.objectType == 'stand' ? 'edst_' : 'adev_';
    },
    meetingTypeList() {
      const options = [
        {
          label: this.tr(this.locPrefix + 'agenda_novideo_opt'),
          value: 'no_video',
        },
        {
          label: this.tr(this.locPrefix + 'agenda_zoom_opt'),
          value: 'zoom',
        },
        {
          label: this.tr(this.locPrefix + 'agenda_twitch_opt'),
          value: 'twitch',
        },
        {
          label: this.tr(this.locPrefix + 'agenda_youtube_opt'),
          value: 'youtube',
        },
        {
          label: this.tr(this.locPrefix + 'agenda_vimeo_opt'),
          value: 'vimeo'
        }
      ];

      //temporary close this option -> $$$
      // if (this.features.video) {
      //   options.splice(1, 0, {
      //     label: this.tr(this.locPrefix + 'agenda_webinar_opt'),
      //     value: 'webinar',
      //   });
      // }


      return options;
    },
    videoProfilesList() {
      return [
        {
          label: this.tr(this.locPrefix + 'agenda_webinar_profile'),
          value: 'webinar',
        },
        {
          label: this.tr(this.locPrefix + 'agenda_home_concert_profile'),
          value: 'home_concert',
        },
        {
          label: this.tr(this.locPrefix + 'agenda_general_profile'),
          value: 'general',
        }
      ];
    },
    timeList() {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 11 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0' + time : time;
        original_time = original_time < 10 ? original_time : original_time;

        arr.push({label: '' + time + ':00 ' + add, value: '' + original_time + ':00'})
        arr.push({label: '' + time + ':15 ' + add, value: '' + original_time + ':15'})
        arr.push({label: '' + time + ':30 ' + add, value: '' + original_time + ':30'})
        arr.push({label: '' + time + ':45 ' + add, value: '' + original_time + ':45'})
      }

      return arr;
    },

    minDate() {
      if (!this.dayList || !this.dayList.length) {
        return new Date();
      }
      const dateStart = this.dayList[0].dateStart || this.dayList[0].oldvalStart;

      const date = momentTz.tz(utc(dateStart).format('YYYY-MM-DD HH:mm'), this.timezoneName).format('YYYY/MM/DD');
      return new Date(date);
    },

    minEndDate(date) {
      if (this.date.dateStart) {
        const date = momentTz.tz(utc(this.date.dateStart).subtract(1, 'days').format('YYYY-MM-DD HH:mm'), this.timezoneName).format('YYYY-MM-DD HH:mm');
        return new Date(date);
      }
      return this.minDate;
    },

    maxDate() {
      if (!this.dayList || !this.dayList.length) {
        let date = new Date();

        date.setFullYear(date.getFullYear() + 1);
        return date;
      }
      const dateStart = this.dayList[this.dayList.length - 1].dateStart || this.dayList[this.dayList.length - 1].oldvalStart;

      const date = momentTz.tz(utc(dateStart).format('YYYY-MM-DD HH:mm'), this.timezoneName).format('YYYY/MM/DD');
      const fullDate = new Date(date);
      fullDate.setHours('23');
      return fullDate;
    },
    maxSessDate() {

    },
    retDL() {
      return this.dayList;
    },
    customAgendaNameMsg() {
      let msg = '';

      msg = this.sessionCustomTouched && this.sessionCustomInput.length == 0 ? 'This field is required' : msg;
      msg = this.sessionCustomInput.length > 150 ? 'Maximum 150 characters' : msg;
      msg = /[<>;{}$]/.test(this.sessionCustomInput) ? 'Custom agenda name should not contain: <>;{}$' : msg;
      msg = !this.customNameAvailable ? 'Already exist' : msg;

      return msg;
    },
    timezoneName() {
      if (this.eventObj && this.eventObj.timezoneObj && this.eventObj.timezoneObj.name) return this.eventObj.timezoneObj.name;
    },
  },
  mounted() {
    localStorage.hasOwnProperty("agenda") ? localStorage.removeItem('agenda') : '' ;

    this.meetingType = {
      label: this.tr(this.locPrefix + 'agenda_novideo_opt'),
      value: 'no_video',
    };

    if (this.agenda.sessions && this.agenda.sessions.length) {
      this.agenda.sessions.forEach((item, index) => {
        item.meetingType = this.getObjectByValue(item.meetingType, 'meetingTypeList');
        item.profile = this.getObjectByValue(item.profile, 'videoProfilesList');
        if (item.branding?.length) {
          item.thumbnailPlaceholder = func.url_368x208('https://' + this.configs.binary + '/' + item.branding[0].url);
        }

        if (item.sameStreamAs) {
          const streamById = this.agenda.sessions.find(item => item.id === item.sameStreamAs);

          if (streamById) {
            item.sameStreamAs = {
              label: streamById.sessionTitle,
              value: streamById.id
            };
          }
        } else {
          item.sameStreamAs = {label: 'No dependency', value: null};
        }
        item.customNameAvailable = true;
      });
    }

    this.apiGetPersonnel({
      type: this.objectType,
      typeId: this.mainObj.id,
      companyId: this.mainObj.company,
      callback: (response) => {
        if (response.data.statusCode == '200') {
          const result = response.data.body.length ? response.data.body : [];
          this.userList = [];
          result.forEach((user, index) => {
            const person = user;
            if (user.branding && user.branding.length) {
              user.branding.forEach(item => {
                item.url = func.url_64x64('https://' + this.configs.binary + '/' + item.url);
                person.logo = item.url;
              });
            }
            this.userList.push({
              label: `${user.name} - ${user.position}`,
              value: person
            });
            if (this.agenda.sessions && this.agenda.sessions.length) {
              this.agenda.sessions.forEach((item, index) => {
                if (item.prevPresenter.id == person.id) {
                  item.presenter = {
                    label: `${person.name} - ${person.position}`,
                    value: person
                  };
                }
                if (!item.presenters) {
                  item.presenters = [];
                }
                item.attendeesIds = [];
                if (item.attendees && item.attendees.length) {
                  item.attendees.forEach(attendee => {
                    if (attendee.id == person.id) {
                      if (attendee.role == 'presenter') {
                        if (!item.attendeesIds.includes(attendee.id)) {
                          item.attendeesIds.push(attendee.id);
                          item.presenters.push({
                            label: `${person.name}  - ${person.position}`,
                            value: person
                          });
                        }
                      }
                      if (attendee.role == 'moderator') {
                        item.moderator = {
                          label: `${person.name} - ${person.position}`,
                          value: person
                        };
                      }
                    }
                  })
                }
              })
            }

          });

          if (this.agenda.sessions && this.agenda.sessions.length) {
            this.agenda.sessions.forEach((item, index) => {
              item.tagsList = [];
              if (item.tags && item.tags.length) {
                item.tags.forEach(tag => {
                  if (tag.split(':')[0] != 'type' && tag.indexOf('pricing:') < 0) {
                    item.tagsList.push({
                      text: tag,
                    });
                    this.$forceUpdate()
                  }
                });

                const parcedPriceTags = this.priceTags?.map(tag => {
                  return {
                    ...tag,
                    selected: item.pricingTags?.includes(tag.value)
                  }
                });
                item.priceTags = parcedPriceTags;
              }
              if (!item.prevPresenter || !item.prevPresenter.id) {
                item.presenter = this.userList[0];
              }
              if (!item.moderator) {
                item.moderator = this.userList[0];
              }
              if (!item.presenters && !item.presenters.length) {
                item.presenters.push(this.userList[0]);
              }

              item.startDateTz = momentTz(item.dateStart).tz(this.timezoneName).format();
              item.endDateTz = momentTz(item.dateEnd).tz(this.timezoneName).format();
            })
          }

          if (this.userList && this.userList.length) {
            this.presenter = this.userList[0];
          }

        }

        this.preload = false;
        this.mainObj.saveAgenda = true;

      }
    });

    if (!this.dayList || !this.dayList.length) {
      return false;
    }

    const date = new Date(this.dayList[0].edtDateVal);

    this.date.dateStart = this.date.dateEnd = date;

    this.date.timeStart = this.dayList[0].timeFrom;
    const list = this.endTimeList(this.date.dateStart, this.date.dateEnd, this.date.timeStart);
    this.date.timeEnd = list[0];
    setTimeout(() => {
      if(this.userList && Array.isArray(this.userList) ) {
        this.userList.forEach((user) => {
          if(user.value && user.value.selected) user.value.selected = false;
        });
      }
      this.preload = false
    }, 2100)
    !this.agenda.sessions.length ? this.newForm = true : this.newForm = false;

  }
}
