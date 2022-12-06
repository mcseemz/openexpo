import { mapGetters } from 'vuex';

export default {
  name: 'AddCustomFields',
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
