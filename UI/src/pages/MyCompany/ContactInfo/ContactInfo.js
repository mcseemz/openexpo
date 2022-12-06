import func from '@/others/functions.js';

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'ContactInfo',
  props: {
    companyObj: Object,
    canEdit: Boolean,
  },
  components: {
    

  },
  created() {

  },
  data: function () {
    return {
  
    }
  },

  methods: {
    validateEmail(email) {
      return func.validateEmail(email);
    },
    forceUpdate() {
      this.$forceUpdate();
    }
  },
  computed: {
    ...mapGetters([
      'tr'
    ]),
  }
}
