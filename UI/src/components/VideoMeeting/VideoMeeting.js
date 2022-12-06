import VueSlickCarousel from 'vue-slick-carousel'
import 'vue-slick-carousel/dist/vue-slick-carousel.css'
// optional style for arrows & dots
import 'vue-slick-carousel/dist/vue-slick-carousel-theme.css'
import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';
import func from '@/others/functions.js';

import Flashphoner from '@/assets/flashphoner.js';
import * as FlashphonerUtils from '@/assets/flashphoner-utils.js';

import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  name: 'VideoMeeting',
  props: {
    activity: Object,
    mainObj: Object,
    tiersList: Array,
    iframe: Boolean,
    compactView: {
      type: Boolean,
      default: false
    },
  },
  components: {
    VueSlickCarousel,

  },
  created() {
    this.qaPlaceholder = this.tr('vm_survey_enter_qa_ph');
    this.attendeesList = this.activity.attendees;
    if (!this.attendeesList && this.activity.visibility == 'private_meeting') {
      this.attendeesList = [this.activity.value.presenter];
    }
    this.attendeesList.forEach(item => {
      item.volume = 50;
      item.mute = false;
      item.disable_video = false;
      item.makePrimary = false;
      this.usersObj[item.id] = item;
    })

    const profile = this.activity.profile || 'webinar';
    this.selectedMediaProfile = this.configs.constraints[profile];
  },
  mounted() {
    if (this.mainObj && !this.mainObj.event) {
      this.getEventPromos({
        eventId: this.mainObj.id,
        pagesQuery: ['video'],
        callback: (response) => {
          console.log('getEventPromos', response, this.mainObj);
        }
      });
    }

    if (this.tiersList && this.tiersList.length) {
      console.log('TIERS LIST', this.tiersList);
    }
    this.videoElement = document.getElementById('video');
    this.volumeBar = document.getElementById('volumeBar');
    this.volumeProgress = document.getElementById('volumeProgress');

    if (this.videoElement && this.volumeProgress) {
      this.volumeProgress.style.width = this.videoElement.volume*100 +'%';
    }

    console.log('WEBINAR CLIENT ACTIVITY', this.activity);
    if (this.activityRecords) { return false; }
    this.streamUrl = this.configs.video + this.activity.glMeetingUrl;
    this.streamName = this.activity.glMeetingUrl;

    this.playStreamUrl = this.configs.video_2 + this.activity.glMeetingUrl;
    this.playStreamName = this.activity.glMeetingUrl;

    Flashphoner.init({});

    this.remoteVideo = document.getElementById("video_box");
    this.localVideo = document.getElementById("local_video_box");
    this.videoControls = document.getElementById("video")
    this.localVideoControls = document.getElementById("local_video");


    if (Flashphoner.getMediaProviders()[0] === "WSPlayer") {
      Flashphoner.playFirstSound();
    } else if (FlashphonerUtils.Browser.isSafariWebRTC() || Flashphoner.getMediaProviders()[0] === "MSE") {
      Flashphoner.playFirstVideo(this.remoteVideo, false).then( () => {
        this.startClicked = true;
        this.start();
      }).catch(() => {
        this.onStopped();
      });
      return;
    }
    this.startClicked = true;
    this.start();
  },
  data: function () {
    return {
      SESSION_STATUS: Flashphoner.constants.SESSION_STATUS,
      STREAM_STATUS: Flashphoner.constants.STREAM_STATUS,
      CONNECTION_QUALITY: Flashphoner.constants.CONNECTION_QUALITY,
      STREAM_EVENT: Flashphoner.constants.STREAM_EVENT,
      STREAM_EVENT_TYPE: Flashphoner.constants.STREAM_EVENT_TYPE,
      remoteVideo: null,
      videoControls: null,
      started: false,
      previewStream: null,
      streamUrl: '',
      streamName: '',
      playStreamUrl: '',
      playStreamName: '',
      preload: false,
      stream: null,
      currentVolumeValue: 50,
      conferenceStream: null,
      publishStream: null,
      shareStream: null,
      localVideoControls: null,
      localVideo: null,
      attendeesList: null,

      isAvaliable: false,

      loading: false,
      session: null,
      mutedA: false,
      mutedV: false,
      sharing: false,
      paused: false,
      startClicked: false,
      muted: false,
      volumeDrag: false,
      videoElement: null,
      volumeProgress: null,
      volumeBar: null,
      sponsor_carousel_settings: {
        arrows: true,
        dots: false,
        slidesToShow: 4,
        infinite: false,
        cssEase: 'ease-in-out',
        focusOnSelect: true,
      },
      sponsorsList: [],
      presentersListExpanded: false,

      controlMenu: '',
      surveyMenu: '',
      managementSelected: null,
      usersList: [],
      usersAdded: {},
      usersObj: {},
      chatMessages: [],
      chatHiddenMessages: [],
      chatMessageValue: '',
      isPresenterStreamStart: false,
      avalInterval: false,
      streamLoading: true,
      visitorsCount: false,
      reconnectInterval: null,
      reconnectCount: 0,
      editSurvey: {
        question: '',
        answers: ['', '', '', ''],
        duration: '',
        public: true,
        timestamp: null
      },
      surveysList: [],
      qAList: [],
      chatTab: 'public',
      qaInput: '',
      resultSurvey: null,
      modalMsg: '',
      qaPlaceholder: '',
      qaTimeout: false,
      newHiddenMessage: false,
      newPublicMessage: false,
      streamSession: null,
      playSession: null,
      activeRecord: '',
      videoQuality: 'PERFECT',
      videoStats: {},
      audioStats: {},
      inboundVideoStats: {},
      inboundAudioStats: {},
      sharedVideoStats: {},
      sharedAudioStats: {},
      showQuality: false,
      selectedMediaProfile: {},
      showQualityInterval: null,
      signedActivityRecords: [],
    }
  },
  methods: {
    ...mapActions([
      'setLocale',
      'getEventPromos',
      'apiGetSignedVideoLink',
    ]),
    forceUpdate() {
      this.$forceUpdate();
    },
    setActiveRecord(record) {
      this.activeRecord = record;
      this.paused = true;
    },
    createQA() {
      if (!this.qaInput || this.qaTimeout) { return false; }
      this.sendData({
        "content": {
          "type": "qna",
          "text": encodeURIComponent(this.qaInput),
        }
      });
      this.qaPlaceholder = this.tr('vm_survey_asked_qa_ph');
      this.qaInput = '';
      this.qaTimeout = true;

      setTimeout(() => {
        console.log('TIMEOUT ENDED');
        this.qaPlaceholder = this.tr('vm_survey_enter_qa_ph');
        this.qaTimeout = false;
        this.$forceUpdate();
      }, 300000)
    },
    changeChat(type) {
      this.chatTab = type;
      this.newHiddenMessage = this.newPublicMessage = false;
      this.$forceUpdate()
    },
    sendPoolVote(msg) {
      if (!msg.answer) { return false; }
      this.sendData({
        "content": {
          "operation":"vote",
          // "timestamp": msg.timestamp,
          "type": "poll",
          "option": msg.answer
        }
      });

      msg.voted = true;
      this.$forceUpdate();
    },
    surveyResultShow(survey) {
      this.resultSurvey = survey;
      this.resultSurvey.answers = [];
      let totalVoted = 0;
      let winner = 0;
      let topVotes = 0;
      this.resultSurvey.poll.options.forEach((item, index) => {
        let votes = this.resultSurvey['votes_'+(index+1)] ? this.resultSurvey['votes_'+(index+1)] : 0;
        totalVoted += votes;
        this.resultSurvey.answers.push({
          text: item,
          votes: votes,
        });
        if (!index) {
          winner = index;
          topVotes = votes;
        } else {
          if (votes > topVotes) {
            winner = index;
            topVotes = votes;
          }
        }
      })

      this.resultSurvey.answers.forEach(item => {
        item.precent = totalVoted ? item.votes / (totalVoted/100) : 0;
      })

      this.resultSurvey.answers[winner].winner = true;

      this.resultSurveyModalOpen();
    },
    isWinner(survey, index) {
      let winner = 0;
      let topVotes = 0;

      survey.poll.options.forEach((item, index) => {
        let votes = survey['votes_'+(index+1)] ? survey['votes_'+(index+1)] : 0;
        if (!index) {
          winner = index;
          topVotes = votes;
        } else {
          if (votes > topVotes) {
            winner = index;
            topVotes = votes;
          }
        }
      })

      return !survey.poll.is_open && (index == winner);
    },
    createSurvey() {
      if (!this.checkValidation()) { return false; }
      const timestamp = Date.now();
      const answers = [];
      this.editSurvey.answers.forEach(item => {
        if (item) {
          answers.push(encodeURIComponent(item));
        }
      })
      if (answers.length < 2) { return false; }
      const content = {
          // "timestamp": this.editSurvey.timestamp ? this.editSurvey.timestamp : timestamp,
          "type": "poll",
          "text": encodeURIComponent(this.editSurvey.question),
          "userid": this.userData.id,
          "status": this.editSurvey.status,
          "poll": {
              "options": answers,
              "is_count_visible": this.editSurvey.public,
          }
      };

      if (this.editSurvey.timestamp) {
        content.operation = "update";
        content.timestamp = this.editSurvey.timestamp;
      }

      this.sendData({
        "content": content
      });

      this.createSurveyModalClose();
    },
    addPool(survey) {
      let poolIndex = false;
      this.surveysList.forEach((item, index) => {
        if (survey.timestamp == item.timestamp) {
          poolIndex = index;
        }
      });
      let chatIndex = false;
      this.chatMessages.forEach((item, index) => {
        if (item.timestamp == survey.timestamp) {
          chatIndex = index;
        }
      })
      if (survey.operation != 'delete') {
        if (poolIndex !== false) {
          this.surveysList[poolIndex] = survey;
        } else {
          this.surveysList.push(survey);
        }

        if (!survey.status && survey.poll && (poolIndex !== false)) {
          this.surveysList[poolIndex].poll.is_open = survey.poll.is_open;
        }
      } else {
        if (poolIndex !== false) {
          this.surveysList.splice(poolIndex, 1);

          if (chatIndex !== false) {
            this.chatMessages.splice(chatIndex, 1);
          }
        }
      }
      console.log('POOOL');
      console.log('SurveysList', this.surveysList);
      this.$forceUpdate();
    },
    addQa(qa) {
      let qaIndex = false;

      this.qAList.forEach((item, index) => {
        if (qa.timestamp == item.timestamp) {
          qaIndex = index;
        }
      });

      if (qa.operation != 'delete') {
        if (qaIndex !== false) {
          this.qAList[qaIndex] = qa;
        } else {
          this.qAList.push(qa);
        }
      } else {
        if (qaIndex !== false) {
          this.qAList.splice(qaIndex, 1);
        }
      }

      this.$forceUpdate();
    },
    removeQa(qa) {
      let qaIndex = false;

      this.qAList.forEach((item, index) => {
        if (qa.timestamp == item.timestamp) {
          qaIndex = index;
        }
      });

      if (qaIndex !== false) {
        this.qAList.splice(qaIndex, 1);
      }

      this.$forceUpdate();
    },
    deleteSurvey(survey) {
      this.sendData({
        "content": {
          "operation":"delete",
          "timestamp": survey.timestamp,
          "type": "poll"
        }
      })
    },
    deleteQa(qa) {
      this.sendData({
        "content": {
          "operation":"delete",
          "timestamp": qa.timestamp,
          "type": "qna"
        }
      })
    },
    acceptQa(qa) {
      this.sendData({
        "content": {
          "operation":"push",
          "timestamp": qa.timestamp,
          "type": "qna"
        }
      })
    },
    editPool(survey) {
      const answers = [];
      survey.poll.options.forEach(item => {
        answers.push(this.decodeMessage(item));
      })

      this.decodeMessage();

      this.editSurvey = {
        question: this.decodeMessage(survey.text),
        answers: answers,
        duration: '',
        public: survey.poll.is_count_visible,
        timestamp: survey.timestamp,
        status: survey.status
      };
      this.$forceUpdate();
      this.$refs.createSurveyModal.open();
    },
    publishSurvey(survey) {
      this.sendData({
        "content": {
          "operation":"push",
          "timestamp": survey.timestamp,
          "type": "poll"
        }
      })
    },
    stopSurvey(survey) {
      this.sendData({
        "content": {
          "operation":"close",
          "timestamp": survey.timestamp,
          "type": "poll"
        }
      });
    },
    sendData(payload) {
      // if (!this.isAvaliable || !this.startClicked) { return false; }
      if (!payload || !this.session) {return false}
      console.log('payload', payload);
      this.session.sendData(payload);
    },
    muteAudioClick() {
      if (this.mutedA) {
        this.unmuteAudio();
      } else {
        this.muteAudio();
      }
    },
    muteVideoClick() {
      if (this.mutedV) {
        this.unmuteVideo();
      } else {
        this.muteVideo();
      }
    },
    shareScreenClick() {
      if (!this.isAvaliable || !this.startClicked) { return false; }
      if (this.sharing) {
        this.unsharingDesktop();
      } else {
        this.sharingDesktop();
      }
    },
    unsharingDesktop() {
      if (!this.isAvaliable || !this.startClicked) { return false; }
      if (this.shareStream) {
        this.shareStream.stop();
      }
      this.sharing = false;
    },
    sharingDesktop() {
      if (!this.isAvaliable || !this.startClicked) { return false; }
      this.sharing = true;
      var roomName = this.getRoomName();
      var login = this.userData.name+' '+this.userData.surname;
      // var login = 'desktop'; + '#desktop'
      var streamName = login + "#" + roomName + '#desktop?label=+';
      console.log("stream preparation", streamName);
      if (this.streamSession) {
        let constraints = {
          audio: false,
          video: {
            ...this.configs.constraints.screen_sharing.video,
            type: 'screen',
//              mediaSource: 'screen',
            withoutExtension: true,
          }
        };

        let options = {
          name: streamName,
          display: this.localVideo,
          receiveVideo: false,
          receiveAudio: false,
          constraints: constraints
        }

        if (FlashphonerUtils.Browser.isSafari()) {
          options.disableConstraintsNormalization = true;
        }

        options.constraints.video.frameRate = {};
        options.constraints.video.frameRate.ideal = 15;

        this.shareStream = this.streamSession.createStream(options)
          .on(this.STREAM_STATUS.PUBLISHING, (publishStream) => {
            console.log("sharing started");
          // this.playStream(session);
        }).on(this.STREAM_STATUS.UNPUBLISHED, (stream) => {
          this.onStopped(stream);
        }).on(this.STREAM_STATUS.FAILED, (stream) => {
          this.setStatus(this.STREAM_STATUS.FAILED, "This login is already in use. Please change login");
          // this.onStopped(stream);
        }).on(this.CONNECTION_QUALITY.UPDATE, (quality) => {
          this.videoQuality = quality;
        });
        this.shareStream.publish();
      }
    },
    muteAudio() {
      this.mutedA = true;
      if (this.publishStream) {
        this.publishStream.muteAudio()
      }
    },
    unmuteAudio() {
      this.mutedA = false;
      if (this.publishStream) {
        this.publishStream.unmuteAudio()
      }
    },
    muteVideo() {
      this.mutedV = true;
      if (this.publishStream) {
        this.publishStream.muteVideo()
      }
    },
    unmuteVideo() {
      this.mutedV = false;
      if (this.publishStream) {
        this.publishStream.unmuteVideo();
      }
    },
    volDown(evt) {
      this.volumeDrag = true;
      this.videoElement.muted = false;
      this.muted = this.videoElement.muted;
      this.setVolume(evt.layerX, evt);
    },
    volUp(evt) {
      if((!this.isAvaliable || !this.conferenceStream) && !this.activeRecord) { return false; }
      if (this.volumeDrag) {
        this.volumeDrag = false;
        this.setVolume(evt.layerX, evt);
      }
    },
    volMove(evt) {
      if((!this.isAvaliable || !this.conferenceStream) && !this.activeRecord) { return false; }
      if(this.volumeDrag){
        this.setVolume(evt.layerX, evt);
     }
    },
    volumeClick() {
      if((!this.isAvaliable || !this.conferenceStream) && !this.activeRecord) { return false; }
      this.videoElement.muted = !this.videoElement.muted;
      this.muted = this.videoElement.muted;
    },
    playClick() {
      if (this.activeRecord && this.videoElement) {
        this.videoElement.play()
        this.paused = false;
      }

      if(!this.isAvaliable || !this.conferenceStream) { return false; }
      if (!this.startClicked) {
        if (this.isPresenter) {
          this.startClicked = true;
          this.start();
        }
      } else {
        if (!this.videoElement) { return false; }
        this.videoElement.play();
      }
      this.paused = false;
    },
    pauseClick() {
      if (!this.videoElement) { return false; }
      this.videoElement.pause();
      this.paused = true;
    },
    setVolume(x, evt, vol) {
      var percentage;
      if (!this.volumeBar || !this.volumeProgress || !this.videoElement) { return false; }

      if (vol) {
          percentage = vol * 100;
      } else {
          var position = x - this.volumeBar.offsetLeft;
          percentage = 100 * position / this.volumeBar.clientWidth;
      }

      if (percentage > 100) {
          percentage = 100;
      }
      if (percentage < 0) {
          percentage = 0;
      }
      this.volumeProgress.style.width = percentage +'%';
      this.videoElement.volume = percentage / 100;
    },
    toggleFullScreen() {
      if (!this.isAvaliable && !this.activeRecord) { return false; }
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      } else if (this.videoElement.webkitRequestFullscreen) {
        this.videoElement.webkitRequestFullscreen();
      } else {
        this.videoElement.requestFullscreen();
      }
    },
    async toggleMiniScreen() {
      if (!this.isAvaliable && !this.activeRecord) { return false; }
      if (this.videoElement !== document.pictureInPictureElement) {
        await this.videoElement.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    },
    selectControlMenu(menu) {
      if (menu && menu != this.controlMenu) {
        this.controlMenu = menu;
      } else {
        this.controlMenu = false;
      }
      this.surveyMenu = '';
    },
    selectSurveyMenu(menu) {
      // if (!this.isAvaliable) { return false; }
      if (menu && menu != this.surveyMenu) {
        this.surveyMenu = menu;
      } else {
        this.surveyMenu = '';
      }

    },
    createSurveyClick() {
      this.$refs.createSurveyModal.open()
    },
    createSurveyModalClose() {
      this.editSurvey = {
        question: '',
        answers: ['', '', '', ''],
        duration: '',
        public: true,
        timestamp: null,
      };

      this.$refs.createSurveyModal.close()
    },

    resultSurveyModalOpen() {
      this.$refs.resultSurveyModal.open()
    },
    resultSurveyModalClose() {
      this.$refs.resultSurveyModal.close()
      this.resultSurvey = null;
    },

    selectManagementUser(id) {
      if (!this.isAvaliable) { return false; }
      if (this.managementSelected == id) {
        this.managementSelected = null;
      } else {
        this.managementSelected = id;
      }
    },
    muteClick(user) {
      if (!this.isAvaliable) { return false; }
      this.$forceUpdate();
      if (user) {
        console.log('muteClick', user.mute);

        if (user.mute) {
          this.sendData({
            "usermute": {
              "audio": [ user.id ]
            }
          });
        } else {
          this.sendData({
            "userunmute": {
              "audio": [ user.id ]
            }
          });
        }
      }
    },

    disableVideoClick(user) {
      if (!this.isAvaliable) { return false; }
      this.$forceUpdate();
      if (user) {
        console.log('disableVideoClick', user.disable_video);

        if (user.disable_video) {
          this.sendData({
            "usermute": {
              "video": [ user.id ]
            }
          });
        } else {
          this.sendData({
            "userunmute": {
              "video": [ user.id ]
            }
          });
        }
      }
    },

    banUser(id) {
      if (!this.isAvaliable) { return false; }
      if (id) {
        this.sendData({
          "userban": [ id ]
        });
      }
    },

    sendChatMessage() {
      // if (!this.isAvaliable) { return false; }
      console.log(this.chatMessageValue);
      if (!this.chatMessageValue) { return false; }
      // const timestamp = Date.now();
      const status = this.chatTab == 'public' ? 'pushed' : 'hidden';
      this.sendData({
        "content": {
          // "timestamp": timestamp,
          "type": "history",
          "text": encodeURIComponent(this.chatMessageValue),
          "status": status,
          "userid": this.userData.id
        }
      })

      this.chatMessageValue = '';
    },
    deleteMessage(msg) {
      msg.deleting = true;
      this.$forceUpdate();
      this.sendData({
        "content": {
          "timestamp": msg.timestamp,
          "type": "history",
          "operation":"delete",
        }
      })
    },

    onStarted() {
      this.started = true;
      // this.previewStream = previewStream;
      this.conferenceStream.setVolume(this.currentVolumeValue);
    },

    onStopped(stream) {
      this.started = false;
      // this.previewStream = null;
      if (stream) {
        stream.stop();
      } else {
        this.stopStreams();
      }
    },

    stopStreams() {
      console.log('stopStreams me');
      if (this.streamLoading) { return false; }
        if(this.conferenceStream) {
            this.conferenceStream.stop();
        }
        if(this.publishStream) {
            this.publishStream.stop();
        }
    },

    streamStartClick() {
      if (this.isPresenterStreamStart || this.streamLoading) { return false; }
      if (this.avalInterval) { clearInterval(this.avalInterval); }
      this.streamLoading = true;
      // this.stopStreams();
      this.isPresenterStreamStart = true;
      // this.startStreaming(this.session);
      this.startClicked = true;
      this.start();
    },

    streamStopClick() {
      if (!this.isPresenterStreamStart || this.streamLoading) { return false; }
      if (this.avalInterval) { clearInterval(this.avalInterval); }
      this.streamLoading = true;
      // this.stopStreams();
      this.publishStream.stop();
      if (this.shareStream) { this.shareStream.stop() }
      this.sharing = false;
      this.isPresenterStreamStart = false;
      this.controlMenu = false;
      this.startClicked = false;
      this.start();
    },

    setStatus(status, stream) {
      this.statusFieldValue = status;
      if (status == "PUBLISHING") {
        this.statusFieldClass = "text-success";
        this.infoFieldValue="";
      } else if (status == "DISCONNECTED" || status == "UNPUBLISHED") {
        this.statusFieldClass = "text-muted";
      } else if (status == "FAILED") {
        this.statusFieldClass = "text-danger";
        if (stream) {
          // this.infoFieldValue=stream.getInfo();
          this.infoFieldClass = "text-muted";
        }
      }
    },

    start() {
      //check if we already have session
      console.log('start');
      let needToExit = false;
      if (Flashphoner.getSessions().length > 0) {
        console.log('Flashphoner.getSessions()', Flashphoner.getSessions());
        if (this.isPast) { return false }
        Flashphoner.getSessions().forEach(session => {
          console.log('ftSession', session);
          const serverUrl = session.getServerUrl();
          if (serverUrl != this.streamUrl && serverUrl != this.playStreamUrl) {
            session.on(this.SESSION_STATUS.DISCONNECTED, function(){});
            session.on(this.SESSION_STATUS.FAILED, function(){});
            session.disconnect();
          } else {
            if (serverUrl == this.playStreamUrl && !this.isPresenterStreamStart) {
              needToExit = true;
              this.playStream(session);
            } else if (serverUrl == this.streamUrl && this.isPresenterStreamStart) {
              needToExit = true;
              this.startStreaming(session);
            }
          }
        });
      }
      if (needToExit) { return };
      this.loading = true;
      //create session
      console.log("Create new session with url " + this.streamUrl);
      // return ( this.userData || (this.getAuthUser && this.getSignedIn) || this.$store.getters.getUser || Auth.user )
      console.log("Create new session with url ", this.getAuthUser, this.$store);

      console.log('PRESENTER ?' , this.isPresenter, this.isPresenterStreamStart);
      if (this.isPresenterStreamStart) {
        this.startStreamSession();
      } else {
        this.startPlaySession();
      }
    },

    startStreamSession() {
      this.startSession(this.streamUrl, 'streamSession');
    },
    startPlaySession() {
      this.startSession(this.playStreamUrl, 'playSession');
    },
    startSession(url, sessionName) {
      console.log('Flashphoner', Flashphoner.getSessions());
      let user = this.getAuthUser ? this.getAuthUser : this.$store.getters.getUser;
      if (!user) {
        return false;
      }
      console.log("Create new session with url ", user, this.$store);
      this[sessionName] = Flashphoner.createSession({
        urlServer: url,
        appKey: this.configs.videoAppKey,
        custom: {
          token: user.signInUserSession.idToken.jwtToken,
          userid: this.userData.id,
          activityid: this.activity.id,
          reason: sessionName == 'streamSession' ? 'translate' : 'play',
        },
      }).on(this.SESSION_STATUS.ESTABLISHED, session => {
        this.setStatus(session.status());
        console.log('STATUS ESTABLISHED')
        //session connected, start playback
        console.log('PRESENTER ?' , this.isPresenter, this.isPresenterStreamStart);
        if (this.isPast) { return false }
        if (sessionName == 'playSession') {
          this.playStream(session);
        } else {
          this.startStreaming(session);
        }
      }).on(this.SESSION_STATUS.DISCONNECTED, (some) => {
        this.setStatus(this.SESSION_STATUS.DISCONNECTED);
        this.onStopped();
      }).on(this.SESSION_STATUS.FAILED, (stream) => {
        this.setStatus(this.SESSION_STATUS.FAILED);
        this.onStopped();
      }).on(this.CONNECTION_QUALITY.UPDATE, (quality) => {
        this.videoQuality = quality;
      }).on(this.SESSION_STATUS.APP_DATA, (data) => {
        this.parseAppData(data);
      });
    },

    parseAppData(data) {
      console.log('got payload', data);
      if (!data.payload) { return false; }
      if (data.payload.useradd) {
        this.addUsers(data.payload.useradd);
      }
      if (data.payload.userdel) {
        this.deleteUsers(data.payload.userdel);
      }
      if (data.payload.viewers !== undefined) {
        this.visitorsCount = data.payload.viewers;
        this.$forceUpdate();
        console.log(this.visitorsCount);
      }
      if (data.payload.content) {
        if (data.payload.content.type == 'poll') {
          this.addPool(data.payload.content);
        }
        if (data.payload.content.type == 'qa') {
          this.addQa(data.payload.content)
        }
        if (data.payload.content.type == 'history') {
          this.chatMessages.push(data.payload.content.text);
          this.$forceUpdate();
        }
      }
      if (data.payload.history) {
        data.payload.history.forEach( item => {
          if (item.type == 'poll') {

            if (item.status == 'pushed') {
              item.answer = item.poll.voted ? item.poll.voted : '';

              let chatIndex = false;
              this.chatMessages.forEach((msg, index) => {
                if (msg.timestamp == item.timestamp) {
                  chatIndex = index;
                }
              });

              if (chatIndex !== false) {
                if (item.stats_update) {
                  for (let i = 1; i < 5; i++) {
                    if (item['votes_'+i]) { this.chatMessages[chatIndex]['votes_'+i] = item['votes_'+i]; }
                  }

                } else {
                  this.chatMessages[chatIndex] = item;
                }

              } else {
                if (this.chatTab == 'technical') {
                  this.newPublicMessage = true;
                }
                this.chatMessages.push(item);
              }
            }

            this.addPool(item);

          }
          if (item.type == 'qna') {

            if (item.status == 'hidden') {
              let chatIndex = false;
              this.chatHiddenMessages.forEach((msg, index) => {
                if (msg.timestamp == item.timestamp) {
                  chatIndex = index;
                }
              });

              if (chatIndex !== false) {
                this.chatHiddenMessages[chatIndex] = item;
              } else {
                this.chatHiddenMessages.push(item);

                if (this.chatTab == 'public') {
                  this.newHiddenMessage = true;
                }
              }

              this.removeQa(item);
            } else {
              this.addQa(item)
            }

          }
          if (item.type == 'history') {
            if (item.operation == 'delete') {

              let chatIndex = false;
              let chatHiddenIndex = false;

              this.chatMessages.forEach((msg, index) => {
                if (msg.timestamp == item.timestamp) {
                  chatIndex = index;
                }
              });

              this.chatHiddenMessages.forEach((msg, index) => {
                if (msg.timestamp == item.timestamp) {
                  chatHiddenIndex = index;
                }
              });

              if (chatIndex !== false) {
                this.chatMessages.splice(chatIndex, 1);
              }
              if (chatHiddenIndex !== false) {
                this.chatHiddenMessages.splice(chatHiddenIndex, 1);
              }

            } else {
              if (item.status == 'hidden') {
                this.chatHiddenMessages.push(item);

                if (this.chatTab == 'public') {
                  this.newHiddenMessage = true;
                }
              } else {
                this.chatMessages.push(item);

                if (this.chatTab == 'technical') {
                  this.newPublicMessage = true;
                }
                this.$forceUpdate();
              }
            }

            this.$forceUpdate();
          }
        });
      }
    },
    decodeMessage(msg) {
      return decodeURIComponent(msg);
    },
    addUsers(usersList) {
      console.log('usersList',usersList);
      usersList.forEach(item => {
        if (!this.usersObj[item.id]) {
          this.usersObj[item.id] = item;
        }

        if (!this.usersAdded[item.id]) {
          this.usersList.push(item);
          this.usersAdded[item.id] = true;
        }
      });
      this.$forceUpdate();
    },
    deleteUsers(idList) {
      idList.forEach(id => {
        this.usersList = this.usersList.filter(item => {
          return item.id != id
        });
        this.usersAdded[id] = false;
      })
      this.$forceUpdate();
    },

    startStreaming(session) {
      // var roomName = 'asdf';
      var roomName = this.getRoomName();
      var fullname = this.userData.name+' '+this.userData.surname;
      // var streamName = fullname + "#" + roomName;
      var streamName = 'user'+this.userData.id + '#' + roomName + '?label=' + fullname;
      console.log(streamName);
      this.publishStream = session.createStream({
          name: streamName,
          display: this.localVideo,
          receiveVideo: false,
          receiveAudio: false,
          constraints: this.selectedMediaProfile
      }).on(this.STREAM_STATUS.PUBLISHING, (publishStream) => {
          //play preview
          if (this.playSession) {
            this.playStream(this.playSession);
          } else {
            this.startPlaySession();
          }

          this.streamSession = session;

          if (this.mutedA) {
            publishStream.muteAudio()
          }
          if (this.mutedV) {
            publishStream.muteVideo()
          }
      }).on(this.STREAM_STATUS.UNPUBLISHED, () => {
          this.streamSession = null;
          this.onStopped();
      }).on(this.STREAM_STATUS.FAILED, (stream) => {
          this.streamSession = null;
          this.setStatus(this.STREAM_STATUS.FAILED, "This login is already in use. Please change login");
          this.onStopped(stream);
          console.log('stream FAILED')
      }).on(this.CONNECTION_QUALITY.UPDATE, (quality) => {
        this.videoQuality = quality;
      });
      this.publishStream.publish();
    },

    playStream(session) {
      var roomName = this.playStreamName;
      // var login = this.userData.name+' '+this.userData.surname;
      var login = 'user'+this.userData.id;

      if (this.isPresenterStreamStart) {
        var streamName = roomName + "-" + login + roomName;
      } else {
        var streamName = roomName;
      }

      console.log('playStream', streamName);

      this.session = session;
      this.conferenceStream = session.createStream({
          name: streamName,
          display: this.remoteVideo,
          remoteVideo: this.videoControls,
          constraints: this.selectedMediaProfile,
          flashShowFullScreenButton: true
      }).on(this.STREAM_STATUS.PENDING, (stream) =>  {
        this.preload = true;
      }).on(this.STREAM_STATUS.PLAYING, (stream) =>  {
          this.preload = false;
          this.loading = false;
          this.setStatus(stream.status());
          this.onStarted();

          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
            this.reconnectCount = 0;
          }
      }).on(this.STREAM_STATUS.STOPPED, ()  => {
          this.preload = false;
          this.setStatus(this.STREAM_STATUS.STOPPED);
          this.onStopped();
      }).on(this.STREAM_STATUS.FAILED, (stream) =>  {
        console.log('preview FAILED')
          this.preload = false;
          this.setStatus(this.STREAM_STATUS.FAILED, stream);
          this.playStream(this.session);
          this.loading = true;
      }).on(this.STREAM_STATUS.NOT_ENOUGH_BANDWIDTH, (stream) =>  {
          console.log("Not enough bandwidth, consider using lower video resolution or bitrate. Bandwidth " + (Math.round(stream.getNetworkBandwidth() / 1000)) + " bitrate " + (Math.round(stream.getRemoteBitrate() / 1000)));
      }).on(this.CONNECTION_QUALITY.UPDATE, (quality) => {
        this.videoQuality = quality;
      }).on(this.STREAM_EVENT, (streamEvent) => {
        console.log('streamEvent: ', streamEvent);
        if (streamEvent.type === this.STREAM_EVENT_TYPE.DATA) {
          this.parseAppData(streamEvent);
        }
      });

      if (!this.isPast) {
        this.isStreamAvaliable();
        this.setAvaliableInterval();
      }
    },

    setAvaliableInterval() {
      if (this.avalInterval) { clearInterval(this.avalInterval); }
      this.avalInterval = setInterval(() => {
        if (this.isPast) {
          clearInterval(this.avalInterval);
          return false;
        }

        this.isStreamAvaliable();
      }, 3000);
    },

    isStreamAvaliable() {
      this.conferenceStream.available().then((stream) => {
        this.streamLoading = false;
        this.isAvaliable = true;
        clearInterval(this.avalInterval);
        this.conferenceStream.play();
      }, (stream) => {
          this.streamLoading = false;
          this.isAvaliable = false;
      });
    },

    getRoomName() {
      return this.streamName;
    },

    openModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },

    messageModalClose() {
      this.$refs.messageModal.close();
    },

    url64(url) {
      return func.url_64x64('https://'+this.configs.binary+'/'+url);
    },

    urlAvatarBig(url) {
      return func.url_302x211('https://'+this.configs.binary+'/'+url);
    },

    checkValidation() {
      const errorsArr = [];
      if (!this.editSurvey.question) {
        errorsArr.push(this.tr('vm_validation_question_req'));
      }
      if (!this.editSurvey.answers[0]) {
        errorsArr.push(this.tr('vm_validation_answer1_req'));
      }
      if (!this.editSurvey.answers[1]) {
        errorsArr.push(this.tr('vm_validation_answer2_req'));
      }

      if (!errorsArr.length) {
        return true;
      } else {
        this.openModal(errorsArr);
        return false;
      }
    },
    getQuality() {
      if (!this.isAvaliable || !this.startClicked) { return false; }
      if (this.publishStream || this.conferenceStream || this.shareStream) {
        if (this.showQualityInterval) {
          clearInterval(this.showQualityInterval)
        }
        this.getMediaStats();
        this.showQualityInterval = setInterval(this.getMediaStats, 1000);
      }
    },
    getMediaStats() {
      if (this.publishStream) {
        this.publishStream.getStats((stats) => {
          console.log('outbound: ', stats);
          if (stats.outboundStream.video) {
            this.videoStats = stats.outboundStream.video;
          }

          if (stats.outboundStream.audio) {
            this.audioStats = stats.outboundStream.audio;
          }
        });
      }
      if (this.conferenceStream) {
        this.conferenceStream.getStats((stats) => {
          console.log('inbound: ', stats);
          if (stats.inboundStream.video) {
            this.inboundVideoStats = stats.inboundStream.video;
          }

          if (stats.inboundStream.audio) {
            this.inboundAudioStats = stats.inboundStream.audio;
          }
        });
      }
      if (this.shareStream) {
        this.shareStream.getStats((stats) => {
          console.log('shared: ', stats);
          if (stats.inboundStream.video) {
            this.sharedVideoStats = stats.inboundStream.video;
          }

          if (stats.inboundStream.audio) {
            this.sharedAudioStats = stats.inboundStream.audio;
          }
        });
      }
    },
    parseKeyName(key) {
      const capKey = key.charAt(0).toUpperCase() + key.slice(1);
      const arr = capKey.split(/(?=[A-Z])/);
      return arr.join(' ');
    },
    showQualityPanel() {
      if (!this.isAvaliable || !this.startClicked) { return false; }
      this.getQuality();
      this.showQuality = !this.showQuality;
    },
    goToStream() {
      this.$router.push(`/${this.routes.mymeetings}/${this.routes.mymeetings_video}/${this.activity.id}`);
    },
    hideQualityPanel() {
      this.showQuality = false;
      clearInterval(this.showQualityInterval);
    },
  },
  computed: {
    ...mapGetters([
      'routes',
      'tr',
      'configs',
      'getAuthUser'
    ]),
    ...mapState([
      'userData',
    ]),
    isPresenter() {
      if (this.activity.visibility == 'private_meeting') { return true; }
      let result = false;
      if (this.activity.attendees && this.activity.attendees.length) {
        this.activity.attendees.forEach(item => {
          if (item.isYou) {
            result = true;
          }
        })
      }
      return result && !this.iframe;
    },
    isModerator() {
      let result = false;
      if (this.activity.attendees && this.activity.attendees.length) {
        this.activity.attendees.forEach(item => {
          if (item.role == 'moderator' && item.isYou) {
            result = true;
          }
        })
      }
      return result && !this.iframe;
    },
    volumeVal() {
      return this.videoElement ? this.videoElement.volume : 0;
    },
    todUserName() {
      return this.userData.name + ' ' + this.userData.surname
    },
    controlsExpanded() {
      return false;
    },
    presentersIdList() {
      let presentersList = [];
      this.usersList.forEach(item => {
        presentersList.push(item.id);
      });

      return presentersList;
    },
    resultSurveyCount() {
      if (!this.resultSurvey) { return false; }
      let result = 0;
      this.resultSurvey.answers.forEach(item => {
        result += item.votes;
      })

      return result;
    },
    isPast() {
      if (!this.activity || !this.mainObj) { return false; }
      const now = new Date().toISOString();
      const eventEnd = this.activity.end || this.activity.dateEnd;

      return now > eventEnd;
    },
    activityName() {
      if (this.activity && this.activity.sessionTitle) {
        return this.activity.sessionTitle;
      }
      let result = '';
      if (this.activity && this.activity.strings && this.activity.strings.length) {
        this.activity.strings.forEach(str => {
          if (str.category == 'name') {
            result = str.value
          }
        })
      }
      return result;
    },
    activityRecords() {
      if (this.activity.records && this.activity.records.length) {
        return this.activity.records
      }

      return false;
    },
    eventBackgroundStyle() {
      return `background: ${this.mainObj ? this.mainObj.color : ''}`;
    },
    streamStartedForViewers() {
      if (this.isAvaliable && this.startClicked) return true;

      const userIsAttendee = this.activity.attendees.find(att => att.id === this.userData.id);

      return !!userIsAttendee;
    },
  },
  destroyed() {
    if (this.videoElement !== document.pictureInPictureElement) {
      this.stopStreams();
    }
  },
  watch: {
    'mainObj.id': async function(newVal, oldVal) {
      if (newVal && this.activityRecords) {
        this.signedActivityRecords = await Promise.all(this.activity.records.map(record => {
          if (record.match(/^s3:\/\//gm)) {
            const parsedUrl = record.split('s3://')[1];
            return this.apiGetSignedVideoLink({
              activityid: this.activity.id,
              url: parsedUrl
            });
          } else {
            return record;
          }
        }));

        this.activeRecord = this.signedActivityRecords[0];
        this.paused = true;
      }
    }
  }
}
