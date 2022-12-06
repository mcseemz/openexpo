import func from '@/others/functions.js';
import { mapActions, mapGetters, mapState } from 'vuex'

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "myinvitations" */ '@/../locales/myinvitations/'+lang+'.json')
};

export default {
  name: 'MyInvitations',
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('myinv_title') : 'My Invitations',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('myinv_title') : 'My Invitations' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('myinv_title') : 'My Invitations' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('myinv_title') : 'My Invitations' },
      ],
    }
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();  
    });
    this.getInvitations();
  },
  data: function () {
    return {
      localesLoaded: false,
      preload: true,
      invitations: null,
      modalMsg: '',
    }
  },

  methods: {
    ...mapActions([
      'apiGetMyInvitations',
      'acceptInvitation',
      'rejectInvitation',
      'acceptStandInvitation',
      'rejectStandInvitation'
    ]),
    modalClose() {
      this.$refs.messageModal.close();
    },
    modalOpen(message) {
      this.modalMsg = message;
      this.$refs.messageModal.open();
    },
    getInvitations() {
      this.apiGetMyInvitations({
        callback: (response) => {
          console.log(response);
          if (response.data.body && response.data.statusCode == '200') {
            this.invitations = response.data.body;
          }
          this.preload = false;
        }
      })
    },
    acceptStand(invitation) {
      this.preload = true;
      this.acceptStandInvitation({
        invitation_id: invitation.id,
        callback: (response) => {
          this.actionCallback(response, this.tr('myinv_accept_msg'));
        }
      })
    },
    rejectStand(invitation) {
      this.preload = true;
      this.rejectStandInvitation({
        invitation_id: invitation.id,
        callback: (response) => {
          this.actionCallback(response, this.tr('myinv_reject_msg'));
        }
      })
    },
    accept(invitation) {
      this.preload = true;
      this.acceptInvitation({
        invitation_id: invitation.confirmations.accept.id,
        callback: (response) => {
          this.actionCallback(response, this.tr('myinv_accept_msg'));
        }
      })
    },
    reject(invitation) {
      this.preload = true;
      this.rejectInvitation({
        invitation_id: invitation.confirmations.accept.id,
        callback: (response) => {
          this.actionCallback(response, this.tr('myinv_reject_msg'));
        }
      })
    },
    actionCallback(response, msg) {
      if (response.data.statusCode == '200') {
        this.modalOpen(msg);
      } else {
        this.modalOpen(response.data.body);
      }
      this.getInvitations();
    },
    parseStrings(invitations) {
      invitations.forEach(item => {
        if (item.strings) {
          item.strings.forEach(str => {
            item[str.category] = str.value;
          })
        }
      })
      
      return invitations;
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'getLocale'
    ]),
    ...mapState([
      'userData'
    ]),
    route() {
      return this.$route;
    },
    companyPersonnelInv() {
      return this.invitations && this.invitations.company_personnel ? this.parseStrings(this.invitations.company_personnel) : []
    },
    eventPersonnelInv() {
      return this.invitations && this.invitations.event_personnel ? this.parseStrings(this.invitations.event_personnel) : []
    },
    eventVisitorInv() {
      return this.invitations && this.invitations.event_visitor ? this.parseStrings(this.invitations.event_visitor) : []
    },
    createStandInv() {
      return this.invitations && this.invitations.stand_create ? this.parseStrings(this.invitations.stand_create) : []
    },
    standPersonnelInv() {
      return this.invitations && this.invitations.stand_personnel ? this.parseStrings(this.invitations.stand_personnel) : []
    },
    eventVisitInv() {
      return this.invitations && this.invitations.event_visitor ? this.parseStrings(this.invitations.event_visitor) : []
    },
    notFound() {
      return !(this.companyPersonnelInv.length || this.eventPersonnelInv.length || this.eventVisitorInv.length || this.createStandInv.length || this.eventVisitInv.length)
    }
  }
}
