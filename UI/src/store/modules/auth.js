import { Auth } from 'aws-amplify'
import { AmplifyEventBus } from 'aws-amplify-vue';
// import { user } from '@mixins/user.js';

export default {

  actions: {
    async findUser(ctx) {
      try {
        const user = await Auth.currentAuthenticatedUser();

        ctx.commit('setSignedIn', true);
        ctx.commit('setUser', user);
      } catch(err) {
        ctx.commit('setSignedIn', false);
        ctx.commit('setUser', null);
      }
    },
    // setUser(ctx){

    // },
    authConfirm(ctx, data) {
    	if ( !data.login || !data.code ) {
    		return false;
    	}
    	// let callback = data.callback ? data.callback : function (data) { console.log(data) }
    	// let callbackErr = data.callbackErr ? data.callbackErr : function (err) { console.log(err) }
        // After retrieveing the confirmation code from the user
        return Auth.confirmSignUp(data.login, data.code, {
            // Optional. Force user confirmation irrespective of existing alias. By default set to True.
            forceAliasCreation: true
        })
        	// .then(data => this.goToSignin())
         //  	.catch(err => console.log(err));
    },
    authSubmit(ctx, data){
        // if ( !this.pwd_validation.valid ) {
        //   return false;
        // }
        Auth.signUp({
            username: data.login,
            password: data.password,
            // attributes: {
            //     email: data.email
            // },
            validationData: [],  // optional
            })
            .then(data => ctx.commit('setUser', data.user))
            .catch(err => console.log(err));
    },
    authSignIn(ctx, data){
      Auth.signIn(data.login, data.password)
        .then(user =>{
        	ctx.commit('setSignedIn', !!user)
            // this.$store.state.signedIn = !!user;
            ctx.commit('setUser', user)
            // this.$store.state.user = user;
        } )
        .catch(err => console.log(err));
    },
    authSignInLinkedin(ctx) {
      console.log('signInLinkedin')
    },
    authSignOut(ctx) {
      Auth.signOut()
        .then(data =>{
        	ctx.commit('setSignedIn', !!data)
          // this.$store.state.signedIn = !!data;
          window.location.reload();
        } )
        .catch(err => console.log(err));
    },
  },
  mutations: {
    setUser(state, user) {
    	state.user = user;
    },
    setSignedIn(state, signedIn) {
    	state.signedIn = signedIn;
    }
  },
  state: {
    signedIn: false,
    user: null,
  },
  getters: {
    getAuthUser(state) {
    	return state.user;
    },
    getSignedIn(state) {
    	return state.signedIn;
    },
  }
}
