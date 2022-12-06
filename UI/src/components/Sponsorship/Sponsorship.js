import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Sponsorship',
  props: {
    companyObj: Object,
    sponsorshipList: Array,
  },
  components: {

  },
  mounted() {
    
  },
  data: function () {
    return {
      eventList: [
        {
          title: 'Event Title',
          organizer: 'Name Surname',
          email: 'mail@mail.mail',
          phone: '+3456789012',
          id: 1
        },
        {
          title: 'Event 2',
          organizer: 'Name Surname',
          email: 'mail@mail.mail',
          phone: '+3456789012',
          id: 2
        },
        {
          title: 'Event',
          organizer: 'Name Surname',
          email: 'mail@mail.mail',
          phone: '+3456789012',
          id: 3
        }
      ],
    }
  },

  methods: {
    ...mapActions([
      'getUploadFileUrl',
      'uploadFiles',
    ]),
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes'
    ]),
  }
}
