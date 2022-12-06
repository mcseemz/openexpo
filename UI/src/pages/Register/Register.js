import RegistrationForm from '@/components/RegistrationForm/RegistrationForm.vue';

import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  name: 'Register',
  components: {
    RegistrationForm,
  },
  props: ['auth_redirect'],
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('register') : 'Register',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('auth_create_new_account') : 'Create a new account' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('register') : 'Register' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('auth_create_new_account') : 'Create a new account' },
      ],
    }

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

  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
    ]),
    ...mapState([
      'userData',
    ]),

    custom_msg() {
      if ( this.$route.query.msg == 'asim' ) {
        return this.tr('ai_registet_msg');
      }
      if ( this.$route.query.msg == 'aeim' ) {
        return this.tr('ai_event_register_msg');
      }
      if ( this.$route.query.msg == 'acim' ) {
        return this.tr('ai_company_register_msg');
      }
      return false;
    },

    // signedIn(){
    //   return this.$store.state.signedIn;
    // }
  }
}
