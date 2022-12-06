import RegistrationForm from '@/components/RegistrationForm/RegistrationForm.vue';

import { mapGetters, mapState } from 'vuex'

export default {
  name: 'Register',
  components: {
    RegistrationForm
  },
  created(){
    if (this.userData) {
      this.$router.push('/');
    }
  },
  data: function () {
    return {

    }
  },
  methods: {
    afterLoginAction() {
      this.$emit('signed');
    },
  },
  
  computed: {
    ...mapGetters([
      'tr',
    ]),
    ...mapState([
      'userData',
    ]),
  }
}
