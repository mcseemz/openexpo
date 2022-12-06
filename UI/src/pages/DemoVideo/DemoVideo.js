import Webinar from './Webinar/Webinar.vue';

import { mapActions, mapGetters, mapState } from 'vuex';

export default {
  name: 'DemoVideo',
  components: {
    Webinar,
  },
  metaInfo() {
    return {
      title: 'Video demo',
      meta: [
        { name: 'description', property: 'description', content: 'Video demo' },
        { name: 'og:title', property: 'og:title', content: 'Video demo' },
        { name: 'og:description', property: 'og:description', content: 'Video demo' },
      ], 
    }
  },
  created(){      
      // this.url = 'wss://18.158.170.215:8443/b7a94258';
  },
  data: function () {
    return {
      url: 'ws://18.158.170.215:8080/b7a94258',
    }
  },
  methods: {
    ...mapActions([
      'getActivityMeeting',
    ]),
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs',
      'features'
    ]),
    ...mapState([
      'userData'
    ]),
    hostname() {
      return window.location.hostname;
    },

  }
}
