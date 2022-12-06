

export default {
  name: 'Customize',
  components: {


  },
  data: function () {
    return {
      edtTimeZoneVal: '',
      edtTimeZoneList: [
        'UTC+1',
        'UTC+2',
        'UTC+3',
        'UTC+4',
        'UTC+5',

      ],
      edtDateVal: null,
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
      timeFrom: '',
      timeTo: '',
      timeList: [
        '7:00 am',
        '8:00 am',
        '9:00 am',
        '10:00 am',
        '11:00 am',
      ],
    }
  },

  methods: {

  },
  computed: {

  }
}
