import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'NotFound',
  props: {
    // msg: String
  },
  methods: {
  	...mapActions([    
      'setLocale',
    ]),
  },
  computed: {
  	...mapGetters([
      'getLocaleName',
      'tr',
    ]),
  }
}
