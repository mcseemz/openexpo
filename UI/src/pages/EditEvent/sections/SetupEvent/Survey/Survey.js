import func from '@/others/functions.js';
import datepicker_lang from '@/others/datepicker_lang.js';
import VueUploadComponent from 'vue-upload-component';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Survey',
  props: {
    editSponsor: Object,
    eventObj: Object
  },
  components: {
    VueUploadComponent
  },
  created() {
    const eventDate = new Date(this.eventObj.dateStart);
    const now = new Date();
    this.publishDate = eventDate > now ? eventDate : now;

    this.calcDate();

    this.typesList = [
      {
        label: this.tr('adev_sponsor_survey_one-choice'),
        value: 'one-choice',
      },
      {
        label: this.tr('adev_sponsor_survey_many-choice'),
        value: 'many-choice',
      },
      {
        label: this.tr('adev_sponsor_survey_free-text'),
        value: 'free-text',
      }
    ];
  },
  data: function () {
    return {
      datepicker_lang: datepicker_lang,
      typesList: [],
      publishDate: null,
      publishTime: {
        label: '09:00 am',
        value: '9:00',
      },
    }
  },

  methods: {
    ...mapActions([
      'apiGetTiers',
      'apiGetSignedReportUrl'
    ]),
    backToSponsor() {
      this.$emit('back-to-sponsor');
    },
    dayListToDatestring(date, time) {

      let year = date.getFullYear();
      let month = date.getMonth()+1;
      if (month < 10) {
        month = '0'+month;
      }
      let day = date.getDate();
      if (day < 10) {
        day = '0'+day;
      }

      date.setUTCHours(time.split(":")[0]);
      date.setMinutes(time.split(":")[1]);

      let dateUTC = func.getLocalUTCDate(date);

      return dateUTC.toISOString()

    },
    calcDate(index) {
      if (this.publishDate && this.publishTime.value) {
        this.editSponsor.survey.start = this.dayListToDatestring(new Date(this.publishDate), this.publishTime.value);
      }
      this.$forceUpdate();
    },
    inputFile(newFile, oldFile) {
      if ( !newFile ) {this.editSponsor.placeholders.surveyPlaceholder = false;
        this.editSponsor.placeholders.surveyPlaceholder = false;
        return false;
      }
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editSponsor.placeholders.surveyPlaceholder = reader.result;
        this.$forceUpdate();
      }
      this.$forceUpdate();
      let url =  reader.readAsDataURL(newFile.file);
    },
    removeImage(type) {
      this.editSponsor.surveyThumb.imageLogo.url = this.editSponsor.placeholders.surveyPlaceholder = false;
      this.editSponsor.surveyThumb.imageLogo.new = [];
      this.editSponsor.surveyThumb.imageLogo.todelete = true;
      this.$forceUpdate();
    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    forceUpdate() {
      this.$forceUpdate();
    },
    addQuestionRow() {
      this.editSponsor.survey.questions.push({
        label: '',
        type: 'one-choice',
        options: [],
      })
      this.forceUpdate();
    },
    addOptionRow(question) {
      question.options.push('');
      this.forceUpdate();
    },
    deleteOpt(question, index) {
      question.options.splice(index, 1);
      this.$forceUpdate();
    },
    removeQuestion(index) {
      this.editSponsor.survey.questions.splice(index, 1);
      this.$forceUpdate();
    },
    toggleEditType(quest) {
      quest.showEditType = !quest.showEditType;
      this.$forceUpdate();
    },
    changeType(quest, value) {
      quest.type = value;
      quest.showEditType = false;
      this.$forceUpdate();
    }
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs'
    ]),
    thumbUrl() {
      return this.editSponsor.placeholders.surveyPlaceholder ? this.editSponsor.placeholders.surveyPlaceholder : this.editSponsor.sponsorBranding.surveyThumb.url;
    },
    minFromDate() {
      const eventDate = new Date(this.eventObj.dateStart);
      const now = new Date();
      return eventDate > now ? eventDate : now;
    },
    maxFromDate() {
      let date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date;
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
  }
}
