import Customize from './Customize/Customize.vue'
import EventPage from './EventPage/EventPage.vue'
import ContactInfo from './ContactInfo/ContactInfo.vue'
import PrivacySettings from './PrivacySettings/PrivacySettings.vue'
// import Tickets from './Tickets/Tickets.vue'
import Invitations from './Invitations/Invitations.vue'

// console.log(this.eventObj);
export default {
  name: 'SetupEvent',
  props: {
    currentStep: Number,
    eventObj: Object,
  },
  components: {

     Customize,
     EventPage,
     ContactInfo,
     PrivacySettings,

     // Tickets,
     Invitations,

  },
  data: function () {
    return {
      selectedMenu: 'customize',

    }
  },

  methods: {
     test() {
       console.log(this.eventObj);
     }
  },
  computed: {

  }
}
