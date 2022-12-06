import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Visitor',
  components: {
    

  },
  data: function () {
    return {
      notFound: true,
      events_list: ['ev', 'ev'],
      date_val: new Date(),
      datepicker_lang: {
        months: {
          full: ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },
        days: {
          full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          initials: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        }
      },
      expand_filter: false,
    }
  },

  methods: {
    ...mapGetters([
      'tr',
      'routes',
    ]),
     triggerFilter() {
       this.expand_filter = !this.expand_filter;
     }
  }
}
