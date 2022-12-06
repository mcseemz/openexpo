import { mapGetters } from 'vuex'

export default {
  name: 'CustomUserFields',
  props: {
    customFields: Array,
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
    ]),
  }
}
