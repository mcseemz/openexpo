import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Invitations',
  props: {
    event_id: Number,
  },
  created() {
   this.getRequests();
  },
  data: function () {
    return {
      email_addresses: '',
      mailtext: '',
      addressTouched: false,
      preload: false,
      search: '',
      timeZoneList: ['sdas','drrer',3,4,5],
      invitations: null,
      timezone: '',
      status: 'All',
      statusList: ['All', 'Pending'],
      orderBy: 'Latest requests first',
      orderByList: ['Latest requests first', 'Latest requests last']
    }
  },

  methods: {
    ...mapActions([
      'sendStandInvitation',
      'eventGetInvitations',
      'cancelStandInvitation'
    ]),

    getRequests() {
      this.eventGetInvitations({
        id: this.event_id,
        callback: (response) => {
          if (response.data.statusCode == '200' && response.data.body.length ) {
            this.invitations = response.data.body;
            this.$forceUpdate();
          }
        }
      })
    },

    send() {
      if (!this.emailsValidation) {
        return false;
      }
      let email_arr = this.email_addresses.split(',');
      this.preload = true;
      email_arr.forEach(item => {
        this.sendStandInvitation({
          event_id: this.event_id,
          email: item.trim(),
          text: this.mailtext,
          callback: (response) => {
            console.log(response);
            this.email_addresses = '';
            this.mailtext = '';
            this.addressTouched = false;
            this.preload = false;
            this.getRequests();
          }
        })
      })
    },

    remove(id) {
      this.cancelStandInvitation({
        invitation_id: id,
        callback: (response) => {
          console.log(response);
          if (response.data.statusCode = "200") {
            this.invitations = this.invitations.filter(item => {
              return item.id != id;
            })
            this.$forceUpdate();
          }
        }
      })
    },
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),

    emailsValidation() {
      if (!this.email_addresses) {
        return false;
      }
      const email_arr = this.email_addresses.split(',');
      let valid = true;
      email_arr.forEach(item => {
        if (!func.validateEmail(item.trim())) {
          valid = false;
        }
      });
      return valid;
    }
  }
}
