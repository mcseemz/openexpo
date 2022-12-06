import { mapGetters } from 'vuex';

export default {
  name: 'Customisation',
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
