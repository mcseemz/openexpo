import { mapGetters, mapState, mapMutations } from 'vuex'

export default {
	name: 'ErrorNotification',
	created() {

	},
	data () {
		return {
			detailsOpened: false,
			notificationOpened: false
		}
	},
	methods: {
		...mapMutations([
			'clearApiErrors',
    ]),
    closeModal() {
      this.detailsOpened = this.notificationOpened = false;
      this.clearApiErrors();
    }
	},
	computed: {
		...mapGetters([
      'tr',
    ]),
    ...mapState([
      'apiError'
		]),
	}
}