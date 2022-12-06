<template>
  <div>
    finalizing authentication...
  </div>
</template>

<script>
import store from './store';
import { mapActions, mapGetters } from 'vuex'

export default {
	name: 'callback',
	mounted() {
		// console.log('STORE',store);
		// this.auth0HandleAuthentication();
		// this.$auth.handleAuthentication().then((data) => {
			// this.$router.push({ name: 'home' })
		// })
	},
	data () {
		return {
		  
		}
	},
	methods: {
		...mapActions([
	      'auth0HandleAuthentication',
	    ]),
	}
}
</script>