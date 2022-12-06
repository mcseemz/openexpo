import func from '@/others/functions.js';
import { mapActions, mapGetters, mapState } from 'vuex'
import {UiProgressCircular} from 'keen-ui';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "acceptinvitation" */ '@/../locales/accept_invitation/'+lang+'.json')
};

export default {
  name: 'AcceptStandInvitation',
  components: {
    UiProgressCircular
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('invitation') : 'Accept invitation',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('invitation') : 'Accept invitation' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('invitation') : 'Accept invitation' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('invitation') : 'Accept invitation' },
      ],
    }
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });
  },
  created(){
    // this.refreshUserCompany();
    console.log('query', this.$route.query);
    if ( this.$route.query.email && this.$route.query.invitationId && this.$route.query.type == 'company' ) {
      this.preload = true;
      this.acceptInvitation({
        invitation_id: this.$route.query.invitationId,
        callback: (response) => {
          console.log("Invitation accepted ", response);
          this.statusCode = response.data.statusCode;
          if ( response.data.statusCode == "200") {

            this.type = 'accept_company_personnel';
            setTimeout(() => {
              this.refreshUserCompany();
            }, 2000);

            this.preload = false;
            this.$forceUpdate();
          } else {
            this.errorMessage = response.data.body.replace(response.data.statusCode, '');
            this.$refs.errorModal.open();
            this.preload = false;
            this.forceUpdate();
          }
        },
      });
    } else if ( this.$route.query.email && this.$route.query.invitationId && (this.$route.query.type == 'eventGuest' || this.$route.query.type == 'standGuest') ) {
      this.preload = true;
      this.acceptInvitation({
        invitation_id: this.$route.query.invitationId,
        callback: (response) => {
          console.log("Invitation accepted ", response);
          this.statusCode = response.data.statusCode;
          if ( response.data.statusCode == "200") {

            // this.type = 'accept_company_personnel';
            // setTimeout(() => {
            //   this.refreshUserCompany();
            // }, 2000);
            this.type = this.$route.query.type == 'eventGuest' ? 'accept_event_personnel' : 'accept_stand_personnel';

            this.preload = false;
            this.$forceUpdate();
          } else {
            this.errorMessage = response.data.body.replace(response.data.statusCode, '');
            this.$refs.errorModal.open();
            this.preload = false;
            this.forceUpdate();
          }
        },
      });
    } else if ( this.$route.query.email && this.$route.query.invitationId && this.$route.query.type == 'activity' ) {
      this.preload = true;
      this.rejectInvitation({
        invitation_id: this.$route.query.invitationId,
        callback: (response) => {
          console.log("Invitation rejected ", response);
          this.statusCode = response.data.statusCode;
          if ( response.data.statusCode == "200") {
            this.type = 'reject_activity';
            this.preload = false;
            this.$forceUpdate();
          } else {
            this.errorMessage = response.data.body.replace(response.data.statusCode, '');
            this.$refs.errorModal.open();
            this.preload = false;
            this.forceUpdate();
          }
        },
      });
    } else if ( this.$route.query.email && this.$route.query.invitationId ) {
      this.acceptStandInvitation({
        invitation_id: this.$route.query.invitationId,
        callback: (response) => {
          console.log("AcceptStandInvitation created ", response);
          this.statusCode = response.data.statusCode;
          if ( response.data.statusCode == "200" && response.data.body.id ) {
            this.standId = response.data.body.id;
          } else {
            this.errorMessage = response.data.body.replace(response.data.statusCode, '');
            this.$refs.errorModal.open();
            this.preload = false;
            this.forceUpdate();
          }

          // if (response.data.statusCode == "404") {

          // }
        },
      })
    }
  },
  data: function () {
    return {
      standId: false,
      statusCode: null,
      type: false,
      preload: false,
      localesLoaded: false,
      errorMessage: '',
    }
  },
  methods: {
    ...mapActions([
      'acceptStandInvitation',
      'rejectInvitation',
      'acceptInvitation',
      'apiGetUser'
    ]),
    errorModalClose() {
      this.$router.push('/');
    },
    refreshUserCompany() {
      this.apiGetUser({
        id: '@me',
        callback: (resp) => {
          if (resp.data.statusCode == '200' && resp.data.body) {
            if (resp.data.body.company) {
              this.userData.company = resp.data.body.company;
              this.$forceUpdate();
            }

          }
        }
      });
    },
  },

  computed: {
    signedIn(){
      return this.$store.state.signedIn;
    },

    ...mapGetters([
      'tr',
      'routes',
      'getLocale',
      'configs'
    ]),
    ...mapState([
      'userData',
    ]),
  }
}
