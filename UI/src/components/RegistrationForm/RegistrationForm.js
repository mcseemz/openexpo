import { Auth } from 'aws-amplify'
import { AmplifyEventBus } from 'aws-amplify-vue';
import { components } from 'aws-amplify-vue'
import keenui from '@/plugins/keenUi';
import 'keen-ui/dist/keen-ui.css';
import func from '@/others/functions.js';
import * as AmazonCognitoIdentity from 'amazon-cognito-identity-js';

import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'

export default {
  name: 'RegistrationForm',
  components: {
    Auth,
    ...components
  },
  props: {
    eventObj: Object,
    customFields: Array,
    withoutFox: Boolean,
    withoutSocials: Boolean,
    onlySignIn: Boolean,
    triggerLoginEvent: Boolean,
    fixedEmail: String,
    customMsg: String,
  },
  created(){
    if ( this.$route.query.email && this.$route.query.invitationId ) {
      this.login = this.reg_login = this.$route.query.email;
      this.fixed_email = true;
    } else if (this.fixedEmail) {
      this.login = this.reg_login = this.fixedEmail;
      this.fixed_email = true;
    }

    if (this.fixedEmail) {
      this.login = this.reg_login = this.fixedEmail;
      this.fixed_email = true;
    }

    if (this.$route.query.email && this.$route.query.reason === 'challenge') {
      this.login = this.reg_login = this.$route.query.email;
    }

    this.findUser();
    AmplifyEventBus.$on('authState', info => {
      if(info === "signedIn") {
        this.findUser();
      } else {
        this.$store.state.signedIn = false;
        this.$store.state.user = null;
      }
    });

    if (this.userData && this.customFields && this.customFields.length) {
      this.preload = true;
      this.parsedCustomField = this.customFields;
      this.setAdditionalFieldsData();
    } else {
      if (this.userData) {
        this.userLoggedIn = true;
        this.prepareCustomFields();
      }
    }

  },
  mounted() {
    if (this.$route.query.email && this.$route.query.reason === 'challenge') {
      this.errorMessage = this.tr('failed_registration');
      this.openErrorCodeModal();
      this.$router.replace({'query': null}).catch(err => {});
    }
  },
  watch: {
    login (val) {
      if(this.errorEmail ) {
        this.validEmail(val) ? this.errorEmail = false : this.errorEmail = true
      }
    },
    reg_login (val) {
      if(this.errorEmail ) {
        this.validEmail(val) ? this.errorEmail = false : this.errorEmail = true
      }
    }
  },
  data() {
    return {
      preload: false,
      modalMsg: '',
      modalTitle: '',

      fixed_email: false,

      currentForm: 'signinForm',
      login: '',
      password: '',
      email: '',
      rememberCheck: false,
      userFields: [],
      parsedCustomField: [],

      reg_login: '',
      reg_password: '',
      reg_password_repeat: '',
      reg_email: '',
      code: '',
      user: '',
      name: '',
      forgotCode: '',
      forgotCodeSent: false,

      pwd_validation: {
        dirty: false,
        length: false,
        number: false,
        upper: false,
        special: false,
        valid: false,
      },

      userLoggedIn: false,
      newPasswordUser: null,
      newPassword: '',
      emailForCode: '',
      initiatedUser: null,
      codeFromEmail: '',
      codeInterval: null,
      codeExpiredTime: null,
      errorMessage: '',
      errorEmail: false
    }
  },

  methods: {
    ...mapActions([
      'findUser',
      'authConfirm',
      'authSubmit',
      'authSignIn',
      'authSignInLinkedin',
      'authSignOut',
      'setLocale',
      'apiGetUser',
      'getCustomUsersField',
      'apiUpdateUser',
    ]),

    ...mapMutations([
      'setUser',
      'setSignedIn'
    ]),
    validEmail: function (itemLogin) {
      var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if(!re.test(itemLogin)) this.errorEmail = true
      return re.test(itemLogin);
    },
    forceUpdate() {
      this.$forceUpdate();
    },
    goToRegister() {
      this.resetError()
      this.currentForm = 'registerForm'
    },
    goToSignin() {
      this.resetError()
      this.resetSigninFields();
      this.currentForm = 'signinForm'
    },
    goToResetPass() {
      this.resetError()
      this.resetSigninFields();
      this.currentForm = 'resetPassForm'
    },
    goToCustomFieldsStep() {
      this.resetError()
      this.currentForm = 'customFields'
    },
    resetSigninFields() {
      this.resetError()
      this.forgotCode = this.password = '';
      if (!this.fixed_email) {
        this.login = '';
      }
    },
    resetError() {
      this.errorEmail = false
    },
    passValidation(password) {
      this.pwd_validation.dirty = true;

      this.pwd_validation.length = password.length < 8 ? false : true;
      this.pwd_validation.upper = password.match(/[A-Z]/);
      this.pwd_validation.number = password.match(/[0-9]/);
      this.pwd_validation.special = password.match(/[-!$%^&*()_+|~=`{}\[\]:\/;<>?,.@#]/);

      this.pwd_validation.valid = this.pwd_validation.length
                                  && this.pwd_validation.number
                                  && this.pwd_validation.upper
                                  && this.pwd_validation.special;

    },
    signIn(){
      if(this.validEmail(this.login)) {
        this.errorEmail = false
        this.preload = true;
        Auth.signIn(this.login, this.password)
          .then(user => {
            if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
              this.newPasswordUser = user;
              this.resetSigninFields();
              this.currentForm = 'newPasswordRequired';
              this.preload = false;
            } else {
              this.afterSignInAction(user);
            }

          })
          .catch(err => {
            this.preload = false;

            if (err.code == 'PasswordResetRequiredException') {
              this.reg_login = this.login;
              this.fixed_email = true;
              this.goToResetPass();
            } else {
              this.openModal(err.message);
            }
          });
      } else {
        this.errorEmail = true
      }

    },
    afterSignInAction(user) {
      this.$store.state.signedIn = !!user;
      this.$store.state.user = user;

      if (this.eventObj) {
        this.userDataForProfile(() => {
          this.prepareCustomFields();
        })
      } else if (this.triggerLoginEvent) {
        this.userDataForProfile(() => {
          this.preload = false;
          this.$emit('login');
        })
      } else if (this.$route.query.rd) {

          if (this.$route.query.type == 'company') {
            window.location = window.location.origin+`${this.$route.query.rd}?invitationId=${this.$route.query.invitationId}&roleId=${this.$route.query.roleId}&type=${this.$route.query.type}&email=${this.$route.query.email.split(' ').join('+')}`;
          } else if (this.$route.query.type == 'eventGuest') {
            window.location = window.location.origin+`${this.$route.query.rd}?invitationId=${this.$route.query.invitationId}&roleId=${this.$route.query.roleId}&type=${this.$route.query.type}&email=${this.$route.query.email.split(' ').join('+')}`;
          } else {
            window.location = window.location.origin+`${this.$route.query.rd}`;
          }

      } else {
        if (this.$route.path == '/emailconfirm') {
          window.location = window.location.origin;
        } else {
          window.location = window.location.origin+'/'+this.routes.myevents+'/'+this.routes.myevents_vistors;
          // this.$router.go();
        }
      }
    },
    newPasswordRequiredSubmit() {
      this.preload = true;
      const { requiredAttributes } = this.newPasswordUser.challengeParam; // the array of required attributes, e.g ['email', 'phone_number']
      Auth.completeNewPassword(
        this.newPasswordUser,               // the Cognito User Object
        this.newPassword,       // the new password
      ).then(user => {
        this.afterSignInAction(this.newPasswordUser); // at this time the user is logged in if no MFA required
      }).catch(err => {
        this.preload = false;
        this.openModal(err.message);
      });
    },
    openModal(msg) {
      this.modalMsg = msg;
      this.$refs.regSBModal.open();
    },
    regSBModalClose() {
      this.$refs.regSBModal.close();
    },

    submit(){

      if(this.validEmail(this.reg_login)) {
        if ( !this.pwd_validation.valid ) {
          return false;
        }
        if (this.reg_password != this.reg_password_repeat) {
          this.openModal(this.tr('auth_pwd_missmatch_msg'));
          return false;
        }
        this.preload = true;
        const currentHostname = window.location.hostname

        const attributes = {
          email: this.reg_email,
          'custom:domain': currentHostname,
        };
        if (this.$route.query.invitationId) {
          attributes['custom:invitationId'] = this.$route.query.invitationId;
        }
        if (this.$route.query.type) {
          attributes['custom:invitationType'] = this.$route.query.type;
        }
        if (this.eventObj) {
          attributes['custom:invitationId'] = String(this.eventObj.id);
          attributes['custom:invitationType'] = 'event_invitation';
        }

        Auth.signUp({
          username: this.reg_login,
          password: this.reg_password,
          attributes: attributes,
          validationData: [],
        })
          .then(data => {
            this.user = data.user;
            this.preload = false;
          })
          .catch(err => {
            this.preload = false;
            this.openModal(err.message);
          });
      }

    },

    prepareCustomFields() {
      if (this.eventObj.userfields.length) {
        this.getCustomUsersField({
          callback: (response) => {
            if (response.data && response.data.statusCode == '200') {
              const result = [];
              if (response.data.body && response.data.body.length) {
                response.data.body.forEach(field => {
                  if (this.eventObj.userfields.includes(field.fieldname)) {
                    result.push(field);
                  }
                });
              }

              this.parsedCustomField = result;

              this.setAdditionalFieldsData();
            }


            this.$forceUpdate();
          }
        })
      } else {
        this.$emit('user-can-buy-ticket');
      }
    },

    setAdditionalFieldsData() {
      const requiredFields = [];
      this.parsedCustomField.forEach(field => {
        if (this.userData && !this.userData.fields[field.fieldname]) {
          requiredFields.push(field);
        }

        this.userFields = requiredFields;
        this.userData.customFields = [];

        this.userFields.forEach(item => {

          if (item.allowedValues.length && item.value.type == 'ListOfIds') {
            this.userData.customFields[item.fieldname] = [];
          } else {
            this.userData.customFields[item.fieldname] = '';
          }

          if (item.allowedValues.length) {
            if (item.value.type == 'ListOfIds') {
              item.type = 'multiselect';
            } else {
              item.type = 'select'
            }

            item.options = [];
            item.allowedValues.forEach(opt => {
              item.options.push({
                label: opt.name,
                value: opt.value
              })
            })

          } else {
            item.type = 'text';
          }

        })


      })
      this.preload = false;
      if (this.userFields.length) {
        this.goToCustomFieldsStep();
      } else {
        this.$emit('user-can-buy-ticket');
      }
    },


    saveProfileFields() {
      let error = false;
      this.userFields.forEach(field => {
        if (!this.userData.customFields[field.fieldname]) {
          error = true;
        }
      });
      if (error) {
        this.openErrorModal();
        return false;
      }
      if (!this.userData.fields) { this.userData.fields = {} }
      this.preload = true;
      Object.keys(this.userData.customFields).forEach(item => {
        if (this.userData.customFields[item]) {
          this.userData.fields[item] = this.userData.customFields[item];

          if (Array.isArray(this.userData.fields[item])) {
            if (!this.userData.fields[item].length) {
              delete this.userData.fields[item];
            } else {
              const valuesList = [];
              this.userData.fields[item].forEach(val => {
                valuesList.push(val.value);
              })
              this.userData.fields[item] = valuesList;
            }
          } else if (typeof this.userData.fields[item] == 'object') {
            this.userData.fields[item] = this.userData.fields[item].value;
          }

        }
      })

      this.apiUpdateUser({
        id : this.userData.id,
        body: this.userData,
        callback: (response) => {
          this.$emit('user-can-buy-ticket');
        }
      });

    },

    openErrorModal() {
      this.$refs.errorModal.open();
    },
    closeErrorModal() {
      this.$refs.errorModal.close();
    },
    closeErrorCodeModal() {
      this.$refs.errorCodeModal.close();
    },
    openErrorCodeModal() {
      this.$refs.errorCodeModal.open();
    },

    signInLinkedin() {
      Auth.federatedSignIn({provider: 'Auth0'});
    },
    signInGoogle() {
      // if user logging trying to buy tickets we need to prepare event id for callback from google
      if (this.eventObj) {
        localStorage.setItem('eventRegistrationId', this.eventObj.customName);
      }
      Auth.federatedSignIn({provider: 'Google'});
    },
    auth0Login(){
      this.$store.dispatch('auth0Login');
    },
    signOut() {
      Auth.signOut()
        .then(data =>{
          this.$store.state.signedIn = !!data;
        } )
        .catch(err => console.log(err));
    },
    forgotPassword() {
      if(this.validEmail(this.login)){
        if (!this.login) {
          return false;
        }
        this.preload = true;
        Auth.forgotPassword(this.login)
          .then(data =>{
            this.preload = false;
            this.pwd_validation.valid = this.pwd_validation.length = this.pwd_validation.number = this.pwd_validation.upper = this.pwd_validation.special = false;
            this.forgotCodeSent = true;
          } )
          .catch(err => {
            this.preload = false;
            this.openModal(err.message);
            console.log(err)
          });
      }
    },
    forgotPasswordSubmit() {
      if ( !this.login || !this.forgotCode || !this.password || !this.pwd_validation.valid ) {
        return false;
      }
      this.preload = true;
      Auth.forgotPasswordSubmit(this.login, this.forgotCode, this.password)
        .then(data =>{
          this.preload = false;
          this.goToSignin();
        } )
        .catch(err => {
          this.preload = false;
          this.openModal(err.message);
          console.log(err)
        });
    },
    async findUser() {
      try {
        const user = await Auth.currentAuthenticatedUser();
        this.$store.state.signedIn = true;
        this.$store.state.user = user;
      } catch(err) {
        this.$store.state.signedIn = false;
        this.$store.state.user = null;
      }
    },

    userDataForProfile(loginCallback) {
      this.apiGetUser({
        id: '@me',
        callback: (resp) => {

          this.$store.state.userFetched = true;
          if (resp.data.statusCode == '200' && resp.data.body) {
            this.$store.state.userData = resp.data.body;
            this.$store.state.userData.addressesObj = this.$store.state.userData.address ? this.$store.state.userData.address : {};
            this.$store.state.userData.userBranding = {
              logo: {
                new: [],
                url: '',
              },
              logo_preview_url: false,
              exist: [],
              new:[],
              maps: {},
            };
            if ( this.$store.state.userData.branding && this.$store.state.userData.branding.length ) {

              this.$store.state.userData.branding.forEach(item => {
                if (!item.strings && !item.strings.length) {
                  return false;
                }

                let baseUrl = this.configs.binary ? this.configs.binary : 'binary-dev.openexpo.com';
                let itemFullUrl = func.url_64x64('https://'+this.configs.binary+'/'+item.url);

                this.$store.state.userData.userBranding.exist.push(itemFullUrl);

                item.strings.forEach(str => {

                  if (str.category == 'description_long') {

                    if (str.value == 'logo_image') {
                      this.$store.state.userData.userBranding.logo.url = itemFullUrl;
                      this.$store.state.userData.userBranding.maps.logo = item.id;
                    }

                  }
                });

              });

            }
          }
          if (loginCallback) {
            loginCallback();
          }
        }
      });
    },
    signInWithEmailOnly() {
      this.currentForm = 'passwordless';
    },
    async sendOneTimeCode() {
      if (!func.validateEmail(this.emailForCode)) {
        this.errorMessage = this.tr('wrong_email');
        this.openErrorCodeModal();
        return;
      }
      this.preload = true;
      const loginDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: this.emailForCode });
      const preAuthCognitoUser = this.createCognitoUser(this.emailForCode);
      preAuthCognitoUser.setAuthenticationFlowType('CUSTOM_AUTH');
      const initiatedUser = new Promise((resolve, reject) =>
        preAuthCognitoUser.initiateAuth(loginDetails, {
          onSuccess: resolve,
          onFailure: reject,
          customChallenge: async (data) => {
            this.initiatedUser = {
              email: data.email,
              session: preAuthCognitoUser.Session,
            }
            resolve();
          }
        })
      );
      initiatedUser.then(this.handleUserData).catch(error => {
        console.log('ERROR: ', error);
        this.preload = false;
      });
    },
    async confirmOneTimeCode() {
      this.preload = true;
      const preAuthCognitoUser = this.createCognitoUser(this.initiatedUser.email, this.initiatedUser.session);
      const initiatedUser = new Promise((resolve, reject) =>
        preAuthCognitoUser.sendCustomChallengeAnswer(this.codeFromEmail, {
          onSuccess: resolve,
          onFailure: reject,
          customChallenge: async () => {
            this.initiatedUser = {
              email: preAuthCognitoUser.username,
              session: preAuthCognitoUser.Session,
            }
            const error = new Error("Code not valid, try again");
            error.code = "CodeValidationFail";
            this.errorMessage = this.tr('invalid_code');
            this.openErrorCodeModal();
            reject(error);
          }
        })
      );
      initiatedUser.then( async (data) => {
        this.afterSignInAction(data);
      }).catch(error => {
        console.log('ERROR: ', error);
        this.preload = false;
      });
    },
    signInWithEmailAndPass() {
      this.currentForm = 'signinForm';
    },
    createCognitoUser(email, session) {
      const poolData = {
        UserPoolId: this.configs.amplify.aws_user_pools_id,
        ClientId: this.configs.amplify.aws_user_pools_web_client_id,
      };
      const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData)
      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });
      if (session) {
        cognitoUser.Session = session;
      }
      return cognitoUser;
    },
    handleUserData() {
      this.preload = false;
      this.currentForm = 'passwordlessSecondStep';
      setTimeout(() => {
        this.$refs.codeFromEmail.focus();
      }, 100);
      this.startCodeInterval();
    },
    startCodeInterval() {
      if (!this.codeInterval) {
        this.codeExpiredTime = 180;
        this.codeInterval = setInterval( () => {
          this.codeExpiredTime--;
          if (this.codeExpiredTime < 1) {
            clearInterval(this.codeInterval);
          }
        }, 1000);
      }
    },
  },
  computed: {
    ...mapGetters([
      'getAuthUser',
      'getSignedIn',
      'getLocaleName',
      'tr',
      'configs',
      'routes'
    ]),
    ...mapState([
      'userData',
    ]),
    signedIn(){
      return this.$store.state.signedIn;
    },
    getExpiredTime() {
      if (!this.codeExpiredTime) return false;

      const minutes = Math.floor(this.codeExpiredTime / 60);
      let seconds = this.codeExpiredTime % 60;
      seconds = seconds < 10 ? `0${seconds}` : seconds;

      return `${minutes}:${seconds} left`;
    }
  },
}
