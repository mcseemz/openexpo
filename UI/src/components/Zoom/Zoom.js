import { mapActions, mapGetters, mapState } from 'vuex'
import { ZoomMtg } from '@zoomus/websdk';
import KJUR from 'jsrsasign';

import pjson from './../../../package.json';

console.log("checkSystemRequirements");
console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));

export default {
  name: 'Zoom',
  props: {
    zoomUrl: String,
    activity: Object,
    zoomCredentials: Object,
  },
  created () {
    if (this.isValidCredentials) {
      document.getElementById('zmmtg-root').classList.add('opened');

      let url = this.activity.stand ? '/'+this.routes.stand+'/'+this.activity.stand : '/'+this.routes.event+'/'+this.activity.event
      this.leaveUrl = window.location.origin+url;

      this.ZoomMtg = ZoomMtg;
      this.ZoomMtg.setZoomJSLib(this.JSLibPath, '/av');
      this.ZoomMtg.preLoadWasm();
      this.ZoomMtg.prepareJssdk();

      this.startMeeting();
    }
    
  },
  data () {
    const sdkVersion = (pjson['dependencies']?.['@zoomus/websdk'] || '').replace(/[^\.0-9]/,'').trim();
    
    return {
      leaveUrl: "https://zoom.us",
      ZoomMtg: {},
      sdkVersion,
      JSLibPath: `https://source.zoom.us/${sdkVersion}/lib`,
      JSBootstrapPath: `https://dmogdx0jrul3u.cloudfront.net/${sdkVersion}/css/bootstrap.css`,
      JSSelectPath: `https://dmogdx0jrul3u.cloudfront.net/${sdkVersion}/css/react-select.css`,
    }
  },
  methods: {
    startMeeting() {
      document.getElementById("zmmtg-root").style.display = "block";
      this.ZoomMtg.init({
        leaveUrl: this.leaveUrl,
        isSupportAV: true,
        disableJoinAudio: true,
        success: (success) => {
          console.log(success);
          this.ZoomMtg.join({
            meetingNumber: this.zoomCredentials.id,
            userName: this.userData.name + ' ' + this.userData.surname,
            signature: this.zoomCredentials.secret,
            sdkKey: this.zoomCredentials.sdkKey,
            userEmail: this.userData.email,
            passWord: this.zoomCredentials?.pwd || '',
            success: (success) => {
              console.log('startMeeting -->',success);
            },
            error: (error) => {
              console.log('startMeeting -->', error);
            }
          });
        },
        error: (error) => {
          console.log('startMeeting --> error', error);
        }
      });
    },

  },
  computed: {
     ...mapGetters([
      'tr',
      'configs',
      'routes'
    ]),
    ...mapState([
      'userData',
    ]),
    isValidCredentials() {
      return this.zoomCredentials?.secret && this.zoomCredentials?.sdkKey && this.zoomCredentials?.id;
    }
  },
  destroyed() {
    this.ZoomMtg.leaveMeeting({});
  },
}
