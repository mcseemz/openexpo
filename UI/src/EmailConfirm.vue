<template>
  <div class="page_wrapper preloader_wrapper email_confirm_page">
  	<div class="preloader_overlay preload_overlay_white" v-show="preload"><ui-progress-circular color="primary" ></ui-progress-circular></div>
    <div class="container">
    	<div class="image_box flex" v-if="!preload">
    		<img src="@/img/error.svg" alt="" v-if="error">
    		<img src="@/img/fireworks.png" alt="" v-if="!error">
    	</div>
    	<h2 class="title" v-if="title">{{title}}</h2>
    	<p class="big_text" v-if="message && !preload" v-html="message">{{message}}</p>
		<p class="big_text" v-if="secondMmessage">{{secondMmessage}}</p>
    	<div class="button_box flex" v-if="!preload && error">
    		<button class="btn btn_orange" @click="close">{{tr('close')}}</button>
    	</div>
    	<div class="form_box flex">
    		<RegistrationForm v-if="!error && !userData" :triggerLoginEvent="true" :onlySignIn="true" :withoutSocials="true" :withoutFox="true" :fixedEmail="fixedEmail" v-on:login="afterLoginAction"></RegistrationForm>
    	</div>
    </div>
    <ui-modal ref="invitationsModal" class="status_modal" removeHeader size="auto">
        <div class="status_modal_wrapper">
            <div class="content">
                <p class="modal_text big_text" v-html="modalMsg">{{modalMsg}}</p>
                <div class="button_row flex">
                	<router-link class="btn btn_orange" :to="invitationQuery">{{tr('accept')}}</router-link>
                	<button class="btn btn_owhite" @click="close">{{tr('skip')}}</button>
                </div>
            </div>
        </div>

        <span class="status_modal_close" @click="closeModal"><img src="@/img/close_medium.svg" alt=""></span>
    </ui-modal>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import keenui from '@/plugins/keenUi';
import RegistrationForm from '@/components/RegistrationForm/RegistrationForm.vue';

export default {
	name: 'EmailConfirm',
	components: {
		RegistrationForm
	},
	created() {
		console.log('EmailConfirm', this.$route);
		// this.preload = false;

		if (this.$route.query.clientId && this.$route.query.code && this.$route.query.userName) {
			this.confirmEmailAddress({
				clientId: this.$route.query.clientId,
				code: this.$route.query.code,
				userName: this.$route.query.userName,
				callback: (response) => {
					this.preload = false;
					if (response.data.statusCode == '200') {
						this.title = this.tr('email_confirmed_title');
						this.message = '';
					} else {
						this.error = true;
						this.title = this.tr('email_error_title');
						let body = JSON.parse(response.data.body);
						if (body.message) {
							this.message = body.message;
							if (body.code == "ExpiredCodeException") {
								this.secondMmessage = this.tr('email_expired_tooltip')
							}
						} else {
							this.message = response.data.body;
						}

					}
				}
			});
	    } else {
	    	this.error = true;
	    	this.preload = false;
	    	this.title = this.tr('email_error_title');
	    	this.message = this.tr('email_error_message');
	    }
	},
	data () {
		return {
			title: '',
			message: '',
			preload: true,
			error: false,
			modalMsg: '',
			secondMmessage: '',
		}
	},
	methods: {
		...mapActions([
	      'confirmEmailAddress',
	    ]),
	    afterLoginAction() {
	    	if (this.$route.query.invitationId) {
	    		if(!this.$route.query.invitationType) {
	    			this.modalMsg = this.tr('ec_stand_creating_msg');
	    		} else if (this.$route.query.invitationType == 'company') {
	    			this.modalMsg = this.tr('ec_company_invitation_msg');
	    		} else if (this.$route.query.invitationType == 'eventGuest') {
	    			this.modalMsg = this.tr('ec_event_invitation_msg');
	    		} else if (this.$route.query.invitationType == 'standGuest') {
	    			this.modalMsg = this.tr('ec_stand_invitation_msg');
	    		} else if (this.$route.query.invitationType == 'event_invitation') {
	    			this.modalMsg = this.tr('ec_event_registration_msg');
	    		}
	    		this.openModal();
        } else {
        	this.preload = true;
        	window.location = window.location.origin;
        }
	    },
	    close() {
	    	window.location.replace('/');
	    },
	    openModal() {
	    	this.$refs.invitationsModal.open();
	    },
	    closeModal() {
	    	this.$refs.invitationsModal.close();
	    }
	},
	computed: {
		...mapGetters([
	      'tr',
	      'routes',
	    ]),
	    ...mapState([
	      'userData',
	    ]),
	    invitationQuery() {
	    	if (!this.$route.query.invitationId || !this.userData) { return '/'	}

        if (this.$route.query.invitationType === 'event_invitation') {
          return `/event/${this.$route.query.invitationId}/tickets?email=${this.userData.email}`;
        }

	    	let query = '?invitationId='+this.$route.query.invitationId+'&email='+this.userData.email;
	    	if (this.$route.query.invitationType) {
	    		query += '&type='+this.$route.query.invitationType;
	      }

	      return '/'+this.routes.acceptinvitation+query;
	    },
	    fixedEmail() {
	    	return this.$route.query.userName ? this.$route.query.userName : '';
	    }
	}
}
</script>
