import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Languages',
  props: {
    langList: Array,
    userObj: Object,
  },
  components: {

  },
  mounted() {
    
  },
  data: function () {
    return {
      
    }
  },

  methods: {
    forceUpdate() {
      this.$forceUpdate()
    }

    
 
  },
  computed: {
     ...mapGetters([
      'tr',
    ]),
    
  }
}
