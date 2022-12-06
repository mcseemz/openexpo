import { mapActions, mapGetters } from 'vuex'
import slugify from 'slugify';
import validName from "../../../../../mixins/validName";
import filtered from "../../../../../mixins/validName";

export default {
  name: 'BasicInformation',
  mixins: [validName,filtered],
  props: {
    eventObj : Object,
    categoriesList: Array,
    timeZoneList: Array,
    customNameAvaliable: Boolean,
  },
  components: {
  },
  mounted() {
    this.category = this.eventObj.category;
    this.$forceUpdate();
  },
  data: function () {
    return {
      textbox1: '',
      eventNameTouched: false,
      eventSDescTouched: false,
      eventAnnounsTouched: false,
      customNameTouched: false,
      // eventNameMsg: '',
      tag: '',
      tags: [],
      catList: [],
      timeList: [],
      category: {},
      // categoriesList: ['All', 'Business', 'Health', 'Film & Media', 'Technology', 'Travel & Outdoor'],

      // catVal: '',
      onlineCheck: true,
      offlineCheck: false,
      customNameTimeout: false,
      discountValue: '',
    }
  },
  methods: {
    ...mapActions([
      'getCategories',
      'getTimezones',
      'findUser',
      'apiGetDiscountInfo'
    ]),
    customNameInput() {

      this.eventData.customName = slugify(this.eventData.customName.toLowerCase(), {replacement: "-", remove: "'"});
      if (this.customNameTimeout) {
        clearTimeout(this.customNameTimeout);
      }

      if (this.eventObj.customName) {
        this.customNameTimeout = setTimeout( () => {
          this.$emit('custom-name-change');
        }, 1000 );
      }
      this.$forceUpdate();
    },
    changeCategory() {
      this.eventData.category = this.category;
    },
    forceUpdateEvent(event) {
      this.eventNameInputAction();
      this.$forceUpdate();
    },
    eventNameInputAction(){
      if(this.eventObj.customNameWanted) {
         this.eventData.customName = slugify(this.eventData.name.toLowerCase(), {replacement: "-", remove: this.filtered()})
      }
      this.$emit('custom-name-change');
      this.$forceUpdate();

    },
    showDiscount() {
      if (!this.discountValue) {
        this.apiGetDiscountInfo({
          discountHash: this.eventObj.discount,
          callback: (response) => {
            if (response.data.statusCode === 200 && response.data.body.is_active) {
              this.discountValue = response.data.body.definition.amount;
            }
          }
        });
      }
    },
    videoChanged(value) {
      if (!value) {
        this.eventData.videoname = '';
      }
    }
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),

    eventNameMsg() {
      let msg = '';

      msg = this.eventNameTouched && this.eventObj.name.length == 0 ? `${this.tr('this_field_required')}` : msg;
      msg = this.eventObj.name.length > 60 ? `${this.tr('maximum_characters')}` : msg;
      msg = /[<>;{}$]/.test(this.eventObj.name) ? `${this.tr('name_not_contain_special')}` : msg;

      return msg;
    },
    customNameMsg() {
      let msg = '';

      msg = this.customNameTouched && this.eventObj.customName.length == 0 ? `${this.tr('this_field_required')}` : msg;
      msg = this.eventObj.customName.length > 60 ? `${this.tr('maximum_characters')}`  : msg;
      msg = /[<>;{}$]/.test(this.eventObj.customName) ? `${this.tr('name_not_contain_special')}` : msg;
      msg = !this.customNameAvaliable ? `${this.tr('already_exist')}` : msg;

      return msg;
    },
    eventSDescMsg() {
      let msg = '';

      msg = this.eventSDescTouched && this.eventObj.description_short.length == 0 ? `${this.tr('this_field_required')}` : msg;
      msg = this.eventObj.description_short.length > 60 ? `${this.tr('maximum_characters')}` : msg;
      msg = /[<>;{}$]/.test(this.eventObj.description_short) ? `${this.tr('name_not_contain_special')}` : msg;

      return msg;
    },

    eventData() {
      return this.eventObj;
    },
    eventTags() {
      this.eventData.tags.filter((item) => {
        const tagArr = item.split(':');
        return !['category', 'lang', 'color'].includes(tagArr[0]);
      })
    },
  }
}
