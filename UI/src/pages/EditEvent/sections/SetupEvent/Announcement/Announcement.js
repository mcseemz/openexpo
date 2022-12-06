import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Announcement',
  props: {
    eventObj: Object,
  },

  components: {

  },

  mounted() {
    this.oldAnnouncement = this.announcement = this.eventObj.announcement ? this.eventObj.announcement.message : '';
    this.announcementDate = this.eventObj.announcement ? this.eventObj.announcement.date : null;

    this.$nextTick(() => {
      this.$refs.announcementText.refreshSize();
    });
    this.$forceUpdate();
  },

  data() {
    return {
      eventAnnounsTouched: false,
      announcement: '',
      announcementDate: null,
      oldAnnouncement: '',
      statusModalSuccess: false,
      modalTitle:'',
      modalMsg: '',
      updateIsAvailable: false,
      isLoading: false,
    }
  },

  methods: {
    ...mapActions([
      'apiEventUpdateAnnouncementById'
    ]),
    updateAnnouncement() {
      if (this.announcement === this.oldAnnouncement) {
        return;
      }
      this.isLoading = true;
      this.apiEventUpdateAnnouncementById({
        eventId: this.eventObj.id,
        message: this.announcement,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.oldAnnouncement = this.announcement = response.data.body ? response.data.body.announcement.message : '';
            this.announcementDate = response.data.body ? response.data.body.announcement.date : null;
            this.updateIsAvailable = false; 
            const msg = !!this.announcement ? [this.tr('announcementUpdated_modal_msg')] : ['announcementDeleted_modal_msg'];
            const title = !!this.announcement ? this.tr('announcementUpdated_modal_title') : this.tr('announcementDeleted_modal_title');
            this.isLoading = false;
            this.openModal(msg, title);
          }
        }
      })

    },
    openModal(msg, title) {
      this.modalMsg = '';
      this.modalTitle = title;
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
    },
  },

  computed: {
    ...mapGetters([
      'tr'
    ]),
    lastEdited(){
      if (!this.announcementDate) {return ''};

      let backDate = new Date(this.announcementDate);
      backDate.setHours(backDate.getHours()+this.eventObj.timezoneObj.value);

      return `Last edited ${backDate.toLocaleString()}`;
    }
  },

  watch: {
    announcement(val, oldVal){
      this.updateIsAvailable = (!!val || !!oldVal) && this.oldAnnouncement !== val;  
    }
  }
}
