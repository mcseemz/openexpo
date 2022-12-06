import Flashphoner from '@/assets/flashphoner.js';

import { mapActions, mapGetters } from 'vuex';


export default {
  name: 'Webinar',
  components: {

  },
  props: {
    url: String,
  },
  mounted() {
    console.log('WEBINAR URL', this.url);

    this.streamUrl = this.url;
    this.streamName = this.url.split('/')[3];
    
    let jqueryScript = document.createElement('script');
    jqueryScript.setAttribute('src', 'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js');
    document.head.appendChild(jqueryScript);

    Flashphoner.init({});
    this.localVideo = document.getElementById("localVideo");
    this.remoteVideo = document.getElementById("remoteVideo");

    this.remoteVideoControls = document.getElementById("remoteVideoControls")
    this.start();

  },
  data: function () {
    return {
      SESSION_STATUS: Flashphoner.constants.SESSION_STATUS,
      STREAM_STATUS: Flashphoner.constants.STREAM_STATUS,
      localVideo: null,
      remoteVideo: null,
      remoteVideoControls: null,
      urlVideo: '',
      started: false,
      sharing: false,
      previewStream: null,
      publishStream: null,
      statusFieldValue: '',
      statusFieldClass: '',
      infoFieldValue: '',
      infoFieldClass: '',
      streamUrl: '',
      streamName: '',
    }
  },

  methods: {
    start() {
      //check if we already have session
      if (Flashphoner.getSessions().length > 0) {
        this.startStreaming(Flashphoner.getSessions()[0]);
      } else {
        //create session
        console.log("Create new session with url " + this.streamUrl);
        Flashphoner.createSession({urlServer: this.streamUrl}).on(this.SESSION_STATUS.ESTABLISHED, session => {
            //session connected, start streaming
            this.startStreaming(session);
        }).on(this.SESSION_STATUS.DISCONNECTED, () => {
            this.setStatus(this.SESSION_STATUS.DISCONNECTED);
            this.onStopped();
        }).on(this.SESSION_STATUS.FAILED, () => {
            setStatus(this.SESSION_STATUS.FAILED);
            this.onStopped();
        });
      }
    },

    stop() {
      this.previewStream.stop();
    },

    onStarted(publishStream, previewStream) {
      this.started = true;
      this.previewStream = previewStream;
      this.publishStream = publishStream;
    },

    onStopped(publishStream, previewStream) {
      this.started = false;
      this.previewStream = null;
      this.publishStream = null;
    },

    unsharingClick() {
      this.sharing = false;
      this.publishStream.switchToCam()
    },
    sharingClick() {
      this.sharing = true;
      this.publishStream.switchToScreen('screen', true)
    },
    startStreaming(session) {
      var streamName = this.streamUrl.split('/')[3];
      session.createStream({
          name: streamName,
          display: this.localVideo,
          cacheLocalResources: true,
          receiveVideo: false,
          receiveAudio: false,
      }).on(this.STREAM_STATUS.PUBLISHING, publishStream => {
        this.setStatus(this.STREAM_STATUS.PUBLISHING);
        //play preview
        session.createStream({
            name: streamName,
            display: this.remoteVideo,
            remoteVideo: this.remoteVideoControls
        }).on(this.STREAM_STATUS.PLAYING, previewStream => {
            //enable stop button
            this.onStarted(publishStream, previewStream);
        }).on(this.STREAM_STATUS.STOPPED, () => {
            publishStream.stop();
        }).on(this.STREAM_STATUS.FAILED, stream => {
            //preview failed, stop publishStream
            if (publishStream.status() == this.STREAM_STATUS.PUBLISHING) {
                this.setStatus(this.STREAM_STATUS.FAILED, stream);
                publishStream.stop();
            }
        }).play();
      }).on(this.STREAM_STATUS.UNPUBLISHED, () => {
          this.setStatus(this.STREAM_STATUS.UNPUBLISHED);
          //enable start button
          this.onStopped();
      }).on(this.STREAM_STATUS.FAILED, stream => {
          this.setStatus(this.STREAM_STATUS.FAILED, stream);
          //enable start button
          this.onStopped();
      }).publish();
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
          this.infoFieldValue=stream.getInfo();
          this.infoFieldClass = "text-muted";
        }
      }
    },

  },

  computed: {
    ...mapGetters([
      'tr'
    ]),
  }
}
