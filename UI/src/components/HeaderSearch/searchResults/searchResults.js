import { mapGetters } from 'vuex'

export default {
  name: 'searchResults',
  props: ['searchResult'],
  components: {

  },
  mounted() {
    
  },
  created() {
    console.log('searchResult');
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
      'routes',
      'configs'
    ]),

    
  },
}
