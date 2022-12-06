import { mapGetters } from 'vuex';

export default {
  name: 'EngageSponsors',
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
