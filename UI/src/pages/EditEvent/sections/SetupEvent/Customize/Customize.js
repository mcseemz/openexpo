import VueUploadComponent from 'vue-upload-component';
import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js'

import { mapActions, mapGetters } from 'vuex'

import Vue from "vue";
import VueRx from "vue-rx";
import VuejsClipper from "vuejs-clipper/dist/vuejs-clipper.umd";
import "vuejs-clipper/dist/vuejs-clipper.css";

Vue.use(VueRx);
Vue.use(VuejsClipper);
Vue.use(VuejsClipper, {
 components: {
    clipperBasic: true,
    clipperPreview: true,
    clipperFixed: true,
 }
})

export default {
  name: 'Customize',
  props: {
    eventObj: Object,
    eventBranding: Object,
    dayList: Array,
    featuredState: Boolean,
    imagePlaceholders: Object,
  },
  components: {
    VueUploadComponent

  },
  mounted() {
    this.timeZoneList = func.getTimezoneList();
  },
  data: function () {
    return {
      event_main_image: [],
      event_main_preview_url: false,
      logo_preview_url: false,
      coverUrlForCropp: false,
      croppRatio: 302/211,
      timeZoneList: [],
      edtTimeZoneVal: '',
      edtTimeZoneList: [],
      datepicker_lang: datepicker_lang,
      currentPlaceholder: '',
      currentImageType: '',
      curMinDate:null,
      curMaxDate:null
    }
  },

  methods: {
    ...mapActions([
      'getTimezones',
      'findUser',
      'getUploadFileUrl',
      'uploadFiles',
    ]),
    saveCropp() {
      const croppResult = this.$refs.croppBox.clip();
      const url = croppResult.toDataURL();
      this.imagePlaceholders[this.currentPlaceholder] = url;
      const blobBin = atob(url.split(',')[1]);
      const array = [];
      for(let i = 0; i < blobBin.length; i++) {
          array.push(blobBin.charCodeAt(i));
      }
      const file = new Blob([new Uint8Array(array)], {type: 'image/png'});

      const fileName = this.eventBranding[this.currentImageType].new[0].file.name;
      this.eventBranding[this.currentImageType].new[0].file = file;
      this.eventBranding[this.currentImageType].new[0].file.name = fileName;

      this.eventBranding[this.currentImageType].cropped = true;
      this.$refs.croppModal.close();
      this.$forceUpdate();
    },
    backCropp() {
      this.eventBranding[this.currentImageType].new = [];
      this.$refs.croppModal.close();
    },
    inputFile(newFile, oldFile) {
      if ( !newFile ) {
        this.imagePlaceholders.event_main_preview_url = false;
        return false;
      }
      this.eventBranding.templateCover.cropped = false;
      let reader = new FileReader();

      reader.onload = () => {
        this.coverUrlForCropp = reader.result;
        this.currentPlaceholder = 'event_main_preview_url';
        this.currentImageType = 'templateCover';
        this.croppRatio = 302/211;
        this.$refs.croppModal.open();
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },
    inputBannerFile(newFile, oldFile) {
      if ( !newFile ) {
        this.imagePlaceholders.event_banner_preview_url = false;
        return false;
      }
      this.eventBranding.templateBanner.cropped = false;
      let reader = new FileReader();

      reader.onload = () => {
        this.coverUrlForCropp = reader.result;
        this.currentPlaceholder = 'event_banner_preview_url';
        this.currentImageType = 'templateBanner';
        this.croppRatio = 2160/1080;
        this.$refs.croppModal.open();
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    inputFilter(newFile, old, prevent) {
      newFile.imagetype="logo";
    },
    inputBannerFilter(newFile, old, prevent) {
      newFile.imagetype="banner";
    },

    inputLogoFile(newFile, oldFile) {
      if ( !newFile ) {
        this.imagePlaceholders.logo_preview_url = false;
        return false;
      }
      this.eventBranding.logo.cropped = false;
      let reader = new FileReader();

      reader.onload = () => {
        this.coverUrlForCropp = reader.result;
        this.currentPlaceholder = 'logo_preview_url';
        this.currentImageType = 'logo';
        this.croppRatio = 250/100;
        this.$refs.croppModal.open();
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    removeImage(type) {
      if (type == 'logo') {
        this.eventBranding.logo.url = this.imagePlaceholders.logo_preview_url = false;
        this.eventBranding.logo.new = [];
        this.eventBranding.logo.todelete = true;
      } else if (type == 'banner') {
        this.eventBranding.templateBanner.url = this.imagePlaceholders.event_banner_preview_url = false;
        this.eventBranding.templateBanner.new = [];
        this.eventBranding.templateBanner.todelete = true;
      } else {
        this.eventBranding.templateCover.url = this.imagePlaceholders.event_main_preview_url = false;
        this.eventBranding.templateCover.new = [];
        this.eventBranding.templateCover.todelete = true;
      }
      this.$forceUpdate();

    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    addDay() {
      this.dayList.push(
        {
          edtDateVal: null,
          timeFrom: this.dayList[0].timeFrom,
          timeTo: this.dayList[0].timeTo,
          dateStart: '',
          dateEnd: '',
          oldvalStart: '',
          oldvalEnd: '',
          toDelete: false,
        }
      );
    },
    removeDay(index) {
      if (this.dayList[index].id) {
        this.dayList[index].toDelete = true;
        this.$forceUpdate();
      } else {
        this.dayList.splice(index, 1);
      }
    },
    dayListToDatestring(date, time) {
      const newDate = new Date(date);

      newDate.setUTCHours(time.split(":")[0]);
      newDate.setMinutes(time.split(":")[1]);

      const timezone = typeof this.eventObj.timezone !== 'string' ? parseFloat(this.eventObj.timezone.value) : parseFloat(this.eventObj.timezone);
      newDate.setHours(newDate.getHours() - timezone);

      return newDate.toISOString();

    },
    calcDate(day) {
      if (day
        && day.edtDateVal
        && day.timeFrom.value
        && day.timeTo.value)
      {
        day.dateStart = this.dayListToDatestring(day.edtDateVal, day.timeFrom.value);
        day.dateEnd = this.dayListToDatestring(day.edtDateVal, day.timeTo.value);
      }
       let x = this.dayList[0]
       let y = this.dayList[1]
       if (x.edtDateVal.getTime() > y.edtDateVal.getTime()) this.$emit('update', x.id == day.id ? x : y, x.id == day.id ? y.id : x.id)

    },
    featuredChange() {
      this.$forceUpdate();
    },
    endTimeList(timeStart) {
      if (!timeStart) { return []; }
      let startHours = 0;
      let startMinutes = 0;
      startHours = +timeStart.value.split(':')[0];
      startMinutes = (+timeStart.value.split(':')[1] / 15) + 1;

      if (startMinutes > 3) {
        startMinutes = 0;
        startHours += 1;
      }

      let arr = [];
      for (let i = startHours; i < 24; i++) {
        var original_time = i;
        var add = i > 11 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        if (time === '00') time = '12';
        original_time = original_time < 10 ? original_time : original_time;

        if ( i !== startHours ) {
          startMinutes = 0;
        }
        for (let j = startMinutes; j < 4; j++) {
          let minutes = j*15 > 10 ? j*15 : '0'+j*15;
          arr.push({ label: ''+time+':'+minutes+' '+add, value: ''+original_time+':'+minutes })
        }
      }

      return arr;
    },
    timezoneChanged() {
      this.dayList.forEach( (day, index) => {
        this.calcDate(day);
      });
    }
  },
  computed: {
     ...mapGetters([
      'tr',
    ]),
    eventData() {
      const timezone = this.timeZoneList.find(item => this.eventObj.timezone == item.value);
      const data = this.eventObj;
      if (timezone) {
        data.timezone = timezone;
      }
      return data;
    },
    featured() {
      return this.eventObj.featured;
    },

    coverUrl() {
      return this.imagePlaceholders.event_main_preview_url ? this.imagePlaceholders.event_main_preview_url : this.eventBranding.templateCover.url;
    },
    bannerUrl() {
      return this.imagePlaceholders.event_banner_preview_url ? this.imagePlaceholders.event_banner_preview_url : this.eventBranding.templateBanner.url;
    },
    logoUrl() {
      return this.imagePlaceholders.logo_preview_url ? this.imagePlaceholders.logo_preview_url : this.eventBranding.logo.url;
    },
    minFromDate() {
      let date = new Date();
      this.curMinDate = date
      this.curMinDate.setDate(date.getDate() + 1);
      return this.curMinDate;
    },
    maxFromDate() {
      let date = new Date();
      this.curMaxDate = date
      this.curMaxDate.setFullYear(date.getFullYear() + 1);
      // let date = this.minFromDate
      return this.curMaxDate;
    },

    timeList() {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 11 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        original_time = original_time < 10 ? original_time : original_time;
        if (time === '00') time = '12';

        arr.push({ label: ''+time+':00 '+add, value: ''+original_time+':00' })
        arr.push({ label: ''+time+':15 '+add, value: ''+original_time+':15' })
        arr.push({ label: ''+time+':30 '+add, value: ''+original_time+':30' })
        arr.push({ label: ''+time+':45 '+add, value: ''+original_time+':45' })
      }

      return arr;
    },
  }
}
