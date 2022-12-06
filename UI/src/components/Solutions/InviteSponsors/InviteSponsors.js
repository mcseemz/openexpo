import { mapGetters } from 'vuex';

export default {
  name: 'InviteSponsors',
  props: {
    color: String,
  },
  components: {
    
  },
  data: function () {
    return {

    }
  },

  methods: {
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes'
    ]),
  }
}
