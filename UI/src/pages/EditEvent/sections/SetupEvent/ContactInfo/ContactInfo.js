import func from '@/others/functions.js';

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'ContactInfo',
  props: {
    eventObj: Object
  },
  components: {


  },
  created() {
    let contacts = this.eventObj.contacts;
    if (contacts) {
      this.emailVal = contacts.email;
      this.phoneVal = contacts.phone;
      this.showContactCheck = contacts.showContacts;
      this.fb = contacts.facebook;
      this.lin = contacts.linkedin;
      this.inst = contacts.instagram;
      this.tw = contacts.twitter;
      this.website = contacts.website;

    }
  },
  data: function () {
    return {
      emailVal: '',
      phoneVal: '',
      showContactCheck: '',
      fb: '',
      lin: '',
      inst: '',
      tw: '',
      website: '',
    }
  },

  methods: {
    validateEmail(email) {
      return func.validateEmail(email);
    },
    forceUpdate() {
      this.$forceUpdate();
    }
  },
  computed: {
    ...mapGetters([
      'tr'
    ]),
  }
}
