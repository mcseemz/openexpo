import RegistrationForm from '@/components/RegistrationForm/RegistrationForm.vue';
import Logo from '../Logo/Logo.vue'
import HeaderSearch from '../HeaderSearch/HeaderSearch.vue'

import { Auth } from 'aws-amplify';
// import activeRoutes from '@/../routing';
import {UiProgressLinear, UiModal} from 'keen-ui';
import 'keen-ui/dist/keen-ui.css';
import func from '@/others/functions.js';

import userMixin from '@/mixins/user.js';


import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  name: 'Header',
  mixins: [userMixin],
  props: ['isLoggedInG', 'changedLogo', 'headerTypeData', 'headerType', 'pageType', 'pageId', 'pageName', 'logoEventId', 'logoType'],
  components: {
    RegistrationForm,
    Logo,
    HeaderSearch,
    UiProgressLinear,
    UiModal,
  },
  watch:{
    $route (to, from){
      this.mobileVisible = false;
      this.$forceUpdate();
    }
  },
  mounted() {
    setTimeout(() => {
      if (Auth.user || this.signedIn) {

        this.ready = true;
        this.isLoading = false;
        this.$forceUpdate();
        if (this.pageType == 'event' && this.$store.state.unreadInterval) {
          clearInterval(this.$store.state.unreadInterval);
          this.$store.state.unreadInterval = null;
        }
        if (!this.$store.state.unreadInterval) {
          this.getUnteadNum()
          this.$store.state.unreadInterval = setInterval(() => {
            this.getUnteadNum();
          }, 60000);
        }

      } else {
        this.ready = true;
        this.isLoading = false;
        this.$forceUpdate();
      }
    }, 300);

  },
  created() {
    if (this.headerTypeData && this.headerType == 'event_visitor') {
      this.dateData = {
        start: this.headerTypeData.dateStart,
        end: this.headerTypeData.dateEnd
      }

      if (this.headerTypeData.showVisitorsCounter && this.headerTypeData.attendees) {
        this.visitorsCount = this.headerTypeData.attendees;
        this.$forceUpdate();
      }
    }
  },
  data: function () {
    return {
      isLoggedIn: true,
      ready: false,
      unreadNum: 0,
      isLoading: true,
      mobileVisible: false,
      dateData: null,
      visitorsCount: null,
      agenda: [],
      eventObj: null,
      currentProductMenu: 'features',
      dropDownHidden: false,
      notificationClose: false,
      announcementClose: false,
      activity: null,
      unreadInterval: null,
      announcement: null
    }
  },
  methods: {
    dropdownMouseOver() {
      this.dropDownHidden = false;
      this.$forceUpdate();
    },
    refreshPage() {
      this.$emit('event-change-tab', 'dt6');
    },
    showVideo(agenda, eventObj) {
      this.agenda = agenda;
      this.eventObj = eventObj;

      this.$forceUpdate();
    },
    getUnteadNum() {
      let eventId = (this.pageType == 'event' || this.pageType == 'stand') ? this.pageId : false;
      this.getUserChatUnreadNum({
        eventId: eventId,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.unreadNum = response.data.body.unread
            if (response.data.body.next) {
              this.activity = response.data.body.next;
            }
            const oldTime = !this.announcement ? null : new Date(this.announcement.date).getTime();
            const newTime = !response.data.body.announcement ? null : new Date(response.data.body.announcement.date).getTime();
            this.announcement = response.data.body.announcement;
            if (!!response.data.body.announcement){
              console.log('this.announcementClose', this.announcementClose);
              if (this.announcementClose) {

                if (!newTime){
                  this.announcementClose = true;  
                }else{
                  this.announcementClose = !!oldTime && oldTime !== newTime; 
                }
              }

              
            }
            this.$forceUpdate();
          }
        }
      });
      
    },
    logout() {
      func.deleteСookie('intercom-session-'+this.configs.intercomId);
      this.authSignOut();
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('amplify-redirected-from-hosted-ui');
    },
    ...mapActions([
      'authSignOut',
      'putVocabularies',
      'putVocabulariesForLanguage',
      'setLocale',
      'getUserChatUnreadNum',
      'apiGetEventVisitors'
    ]),
    closeRegisterModal() {
      this.$refs.registerModal.close();
    },
    openRegisterModal() {
      // this.registerModalOpened = true;
      // this.$forceUpdate();
      this.$refs.registerModal.open()
    },
    afterLoginAction() {
      console.log('OLOLO')
    },
    url64(url) {
      return func.url_64x64('https://'+this.configs.binary+'/'+url);
    },
    tuneIn() {
      if (!this.activity.allowed) return;

      this.$router.push('/'+this.routes.mymeetings+'/'+this.routes.mymeetings_video+'/'+this.activity.id);
    },
  },
  computed: {
    signedIn(){
      return this.$store.state.signedIn || this.isLinkedinSignin;
    },
    ...mapGetters([
      'tr',
      'getAllLocales',
      'getLocale',
      'getLocaleName',
      'routes',
      'isLinkedinSignin',
      'configs'

    ]),
    ...mapState([
      'userData',
      'userFetched'
    ]),
    isLive() {
      if (this.headerType == 'event_visitor') {
        const start = new Date(this.headerTypeData.dateStart);
        const end = new Date(this.headerTypeData.dateEnd);
        const now = new Date();

        return now < end && now > start;
      } else {
        return false;
      }
    },

    isLiveActivity() {
      if (!this.activity) { return false; }
      const start = new Date(this.activity.dateStart);
      const end = new Date(this.activity.dateEnd);
      const now = new Date();

      return now < end && now > start;
    },
    activityMinutesToStart() {
      if (!this.activity || !this.headerTypeData || !this.headerTypeData) { return ''; }
      let now = new Date();
      const start = new Date(this.activity.start);

      let diff = parseInt((start-now)/(60*1000));
      return diff < 0 ? '' : diff;
    },
    activityName() {
      if (!this.activity) { return false; }
      let name = false;
      this.activity.strings.forEach(item => {
        if (item.category == 'name') {
          name = item.value;
        }
      })
      return name;
    },
    localaziedAnnouncementTime(){
      if (!this.announcement || !this.eventObj) {return ''};
      let backDate = new Date(this.announcement.date);
      backDate.setHours(backDate.getHours()+this.eventObj.timezoneObj.value);

      return backDate.toLocaleString();
    }
  },
}
