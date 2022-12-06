import VideoMeeting from '@/components/VideoMeeting/VideoMeeting.vue';

import { mapActions, mapGetters, mapState } from 'vuex';

export default {
  name: 'IframeVideo',
  components: {
    VideoMeeting,
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
    if (this.$route.params.activityId) { 
      this.getOpenActivityById({
        id: this.$route.params.activityId, 
        callback: (response) => {
  console.log('getOpenActivityById', response);
          if (response.data.statusCode == '200') {
            console.log(response);
            this.activity = response.data.body;

            if (typeof this.activity.value === 'string') {
              this.activity.value = JSON.parse(this.activity.value);  
            }

            if (this.activity.value.attendees) {
              this.activity.attendees = this.activity.value.attendees;
            }

            if (this.activity.value.meetingType) {
              this.activity.meetingType = this.activity.value.meetingType;
            }

            if (this.activity.meetingUrl) {
              this.activity.glMeetingUrl = this.activity.meetingUrl;
            }
            if (this.activity.value.enableChat) {
              this.activity.enableChat = this.activity.value.enableChat;
            }
            if (this.activity.value.enableQA) {
              this.activity.enableQA = this.activity.value.enableQA;
            }

            if (this.activity.strings && this.activity.strings.length) {
              this.activity.strings.forEach(str => {
                if (str.category == 'name') {
                  this.activity.headerName = str.value.length > 40 ? str.value.substr(0, 37)+'...' : str.value;
                }
              })
            }

            console.log('Activity', this.activity);

          }

        }
      });

    }
  },
  data: function () {
    return {
      activity: null,
    }
  },
  methods: {
    ...mapActions([
      'getOpenActivityById',
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
