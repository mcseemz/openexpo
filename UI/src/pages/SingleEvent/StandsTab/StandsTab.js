import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'StandsTab',
	props: {
		standsList: Array,
		eventObj: Object,
	},
	created() {
		if (this.$route.query.s) {
			this.searchVal = this.$route.query.s;
		}
	},
	data: function () {
		return {
			currentStand: null,
			searchVal: '',
			searchFilter: '',
			showMoreClicked: false,
		}
	},
	methods: {
		searchAction() {
			this.searchFilter = this.searchVal;
		},
		openModal(stand) {
			this.currentStand = stand;
			this.$refs.standModal.open();
		},
		modalClose() {
			this.$refs.standModal.close();
			this.currentStand = null;
		},
		showMoreAction() {
			this.showMoreClicked = true;
			this.$forceUpdate();
		}
  	},
  	computed: {
  		...mapGetters([
  			'tr',
  			'routes',
  		]),
  		featuredStandsListFiltered() {
  			if (!this.searchFilter) { return this.featuredStandsList }
  			let result =  this.featuredStandsList.filter(item => {
  				return item.name.toLowerCase().indexOf(this.searchFilter.toLowerCase()) != -1;
  			});
  		console.log(result);
  			if (!this.showMoreClicked && result.length > 8) {
  				result = result.slice(0, 8)
  			}
  			return result || [];
  		},
  		standsListFiltered() {
  			if (!this.searchFilter) { return this.standsList }
  			let result =  this.standsList.filter(item => {
  				return item.name.toLowerCase().indexOf(this.searchFilter.toLowerCase()) != -1;
  			});
  			return result || [];
  		},
  		featuredNoActiveClass() {
  			return this.featuredStandsList.length < 4
  		}
  	}
}
