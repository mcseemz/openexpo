import Logo from '../../components/Logo/Logo.vue'
import NotFound from '@/components/NotFound/NotFound.vue';
import VideoMeeting from '@/components/VideoMeeting/VideoMeeting.vue';
import Zoom from '@/components/Zoom/Zoom.vue';
import NotPermitted from '@/components/NotPermitted/NotPermitted.vue';

import keenui from '@/plugins/keenUi';

import { mapActions, mapGetters, mapState } from 'vuex';
import eventMixin from '../../mixins/event/event.js';
import standMixin from '../../mixins/stand.js';

import datepicker_lang from '@/others/datepicker_lang.js';

import Countdown from 'vuejs-countdown'

export default {
  name: 'MyMeetingsVideo',
  mixins: [eventMixin, standMixin],
  components: {
    Logo,
    Countdown,
    VideoMeeting,
    Zoom,
    NotPermitted,
    NotFound
  },
  metaInfo() {
    return {
      title: 'Meeting',
      meta: [
        { vmid: 'description', property: 'description', content: 'Meeting' },
        { vmid: 'og:title', property: 'og:title', content: 'Meeting' },
        { vmid: 'og:description', property: 'og:description', content: 'Meeting' },
      ],
    }
  },
  beforeRouteLeave (to, from, next) {
    if (this.$refs.videoMeeting) {
      this.$refs.videoMeeting.stopStreams();
    }
    this.$emit('change-logo', null);
    next()
  },
  created(){
    if (this.$route.params.activityId) {
      this.getActivityById({
        id: this.$route.params.activityId,
        // type: 'agenda',
        callback: (response) => {

          if (response.data.statusCode == '200') {

            this.activity = response.data.body;

            if (typeof this.activity.value === 'string') {
              this.activity.value = JSON.parse(this.activity.value);
            }

            if (this.activity.value.attendees) {
              this.activity.attendees = this.activity.value.attendees;
            }

            if (this.activity.value.meetingType) {
              this.activity.meetingType = this.activity.value.meetingType;
            }

            if (this.activity.meetingUrl) {
              this.activity.glMeetingUrl = this.activity.meetingUrl;
            }
            if (this.activity.value.enableChat) {
              this.activity.enableChat = this.activity.value.enableChat;
            }
            if (this.activity.value.enableQA) {
              this.activity.enableQA = this.activity.value.enableQA;
            }

            if (this.activity.strings && this.activity.strings.length) {
              this.activity.strings.forEach(str => {
                if (str.category == 'name') {
                  this.activity.headerName = str.value.length > 40 ? str.value.substr(0, 37)+'...' : str.value;
                }
              })
            }


            let interval = setInterval(() => {
              const now = new Date();
              const endDate = new Date(this.activity.end);

              if ( (endDate - now) < 10*60*1000 ) {
                this.showTimer = true;
                clearInterval(interval);
              }

            }, 30*1000)

            if (response.data.body.stand) {
              this.getFormattedStand(response.data.body.stand, () => {
                this.parseEventData(response.data.body.event);
                this.mainObj = this.standObj;
              });
            } else if (response.data.body.event) {
              this.parseEventData(response.data.body.event, () => {
                this.mainObj = this.eventObj;
              });
            }
          }else if(response.data.statusCode == '404') {
            this.notFounded = true;
          }

        }
      });
      this.getActivityMeeting({
        activityid: this.$route.params.activityId,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.meeting = response.data.body;
          }else if(response.data.statusCode == '404') {
            this.notFounded = true;
          }
        }
      });

    }

  },
  data: function () {
    return {
      meeting:  null,
      activity: null,
      eventLoaded: false,
      standLoaded: false,
      posttype: '',
      fromMeetings: false,
      fromMeetingsZoomUrl: '',
      fromMeetingsTwitchUrl: '',
      datepicker_lang: datepicker_lang,
      showTimer: false,
      promoFetched: false,
      mainObj: null,
      eventLogo: null,
      dataLoaded: false,
      notFounded: false
    }
  },
  methods: {
    ...mapActions([
      'getActivity',
      'getActivityMeeting',
      'getActivityById',
      'getEventPromos',
      'apiPromoShowed',
      'apiWatchPromo',
    ]),
    parseEventData(eventId, callback) {
      this.getFormattedEvent(eventId, () => {
        if (callback) {
          callback()
        }
        this.getEventPromos({
          eventId: this.eventObj.id,
          pagesQuery: ['video'],
          callback: (response) => {

            if (response.data.statusCode == '200') {
              if (response.data.body['video']) {
                this.eventObj.currentSponsorVideoId = response.data.body['video'].id;
                this.eventObj.videoLogo = response.data.body['video'].video;
                this.eventObj.videoUrl = response.data.body['video'].videoUrl;
                this.$forceUpdate();
                // if (this.activity.value.meetingType == 'team_meeting') {
                  // this.$refs.teamMeeting.insertLogo(this.eventObj.videoLogo);
                // }
                // this.logoShowed();
              }
            }else if(response.data.statusCode == '404') {
              this.notFounded = true;
            }
          }
        })
      });
      this.eventLoaded = true;
      console.log(this.eventObj);
    },
    logoClick() {
      if (this.eventObj.videoUrl) {
        this.apiWatchPromo({
          url: this.eventObj.videoUrl,
          callback: (response) => {
            if (response.data.statusCode == '301' && response.data.headers && response.data.headers.Location) {
             window.open(response.data.headers.Location);
            }
          }
        });
      }
    },
    logoShowed() {
      if (this.eventObj.currentSponsorVideoId) {
        this.apiPromoShowed({
          eventId: this.eventObj.id,
          relationId: this.eventObj.currentSponsorVideoId,
          placeId: 'video'
        });
      }
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs',
      'features'
    ]),
    ...mapState([
      'userData'
    ]),
    deadlineDate() {
      if (!this.activity) { return false; }

      const endDate = new Date(this.activity.end);
      return endDate.toString();
    },
    is_live() {
      if (!this.activity) { return false; }
      const now = new Date().toISOString();

      return now > this.activity.start && now < this.activity.end;
    },
    is_past() {
      if (!this.activity) { return false; }
      const now = new Date().toISOString();

      return now > this.activity.end;
    },
    is_future() {
      if (!this.activity) { return false; }
      const now = new Date().toISOString();

      return now < this.activity.start;
    },
    isPresenter() {
      return this.activity.value.presenter.id == this.userData.id;
    },
    hostname() {
      return window.location.hostname;
    },
    zoomUrl() {
      if (this.activity.value.meetingType == 'zoom') {
        if (!this.$Amplify.Auth.user?.attributes?.email) {
          return this.activity.value;
        }
        const email = this.$Amplify.Auth.user.attributes.email;
        let encodedMail = btoa(this.$Amplify.Auth.user.attributes.email);
        return this.activity.value.meetingUrl+'&uel='+encodedMail;
      } else {
        return false;
      }
    },

    twitchUrl() {

      if (this.activity.value.meetingType == 'twitch') {
        return this.activity.value.meetingUrl+'&parent='+this.hostname;
      } else {
        return false;
      }

    },

    youtubeUrl() {
      if (this.activity.value.meetingType == 'youtube' && this.activity.value.meetingUrl.indexOf('youtube.com/') != -1) {
        return this.activity.value.meetingUrl.split('?v=')[1];
      } else {
        return false;
      }
    },
    vimeoUrl() {
      if (this.activity.value.meetingType == 'vimeo' && this.activity.value.meetingUrl.indexOf('vimeo.com/') != -1) {
        const ids = this.activity.value.meetingUrl.split('com/')[1];
        const idValues = ids.split('/');
        if (idValues.length > 2) {
          const typeId = idValues[0];
          const videoId = idValues[1];
          const hId = idValues[2];
          return `https://vimeo.com/${typeId}/${videoId}/embed/${hId}`;
        } else {
          return `https://player.vimeo.com/video/${ids}`;
        }
      } else {
        return false;
      }
    },
    vimeoChatLink() {
      if (!this.activity.value.enableVimeoChat) return false;

      return this.activity.value.vimeoChat;
    },
    userLoggedIn() {
      return !!this.isUserAuth;
    },
  },
  watch: {
    'eventBranding.logo.url': function(newVal, oldVal) {
      if (newVal) {
        this.eventLogo = newVal;
      }
    },
    'eventObj.letmein': function(newVal, oldVal) {
      this.dataLoaded = true;
    }
  }
}
