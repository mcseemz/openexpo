import func from '@/others/functions.js';
import PersonalInfo from './PersonalInfo/PersonalInfo.vue'
import Languages from './Languages/Languages.vue'
import userMixin from '@/mixins/user.js';
import Sponsorship from '@/components/Sponsorship/Sponsorship.vue'

import keenui from '@/plugins/keenUi';

import { mapActions, mapGetters } from 'vuex'

import { I18n } from 'aws-amplify';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "myaccount" */ '@/../locales/myaccount/'+lang+'.json')
};

export default {
  name: 'MyAccount',
  mixins: [userMixin],
  provide(){
    return {
      saveClick: this.saveClick,
    }
  },
  components: {
    PersonalInfo,
    Languages,
    Sponsorship,
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('my_account') : 'My account',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('my_account') : 'My account' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('my_account') : 'My account' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('my_account') : 'My account' },
      ],
    }
  },
  mounted() {

    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });

    this.getFormattedUser('@me', ( response ) => {

      this.getCustomUsersField({
        callback: (response) => {
          console.log('getCustomUsersField', response);
          if (response.data && response.data.statusCode == '200') {

            this.customFields = response.data.body;

            this.customFields.forEach(item => {
              if (this.userObj.fields[item.fieldname]) {
                if (!item.allowedValues.length) {
                  this.userObj.customFields[item.fieldname] = this.userObj.fields[item.fieldname];
                } else {
                  if (item.value.type == 'ListOfIds') {
                    let result = [];
                    this.userObj.fields[item.fieldname].forEach(field => {

                      item.allowedValues.forEach(val => {
                        if (val.value == field) {
                          result.push({
                            label: val.name,
                            value: val.value
                          })
                        }
                      })

                    })
                    this.userObj.customFields[item.fieldname] = result;
                  } else {
                    item.allowedValues.forEach(val => {
                      if (val.value == this.userObj.fields[item.fieldname]) {
                        this.userObj.customFields[item.fieldname] = {
                          label: val.name,
                          value: val.value
                        };
                      }

                    })
                  }

                }
              } else {
                if (item.allowedValues.length && item.value.type == 'ListOfIds') {
                  this.userObj.customFields[item.fieldname] = [];
                } else {
                  this.userObj.customFields[item.fieldname] = '';
                }

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

            this.$forceUpdate();

          }
        }
      })

      this.getLanguages(response => {
        if ( response.data.statusCode == 200 ) {
          response.data.body.forEach(item => {
            this.langList.push({
              label: item.value,
              value: item.language
            });

            if (item.language == this.userObj.language) {
              this.userObj.selectedLang = {
                label: item.value,
                value: item.language
              };
              this.$forceUpdate();
            }
          });

          this.getCountries(response => {
            if ( response.data.statusCode == 200 ) {
              response.data.body.forEach(item => {
                this.countryList.push({
                  label: item.value,
                  value: item.id
                });

                if (item.id == this.userObj.addressesObj.country) {
                  this.userObj.selectedCountry = item;
                }
              });
            }
          });
        }
      });

      this.apiGetSponsorsByType({
        type: 'user',
        id: this.userObj.id,
        callback: (response) => {
          console.log('apiGetSponsorsByType', response);
          if (response.data.statusCode == '200') {
            this.sponsorshipList = response.data.body;

            this.sponsorshipList.forEach(item => {
              if (item.strings.length) {
                item.strings.forEach(str => {
                  if (str.category == 'name') {
                    item.name = str.value;
                  }
                })
              }

              func.parseBrandings(item);

            })
            this.$forceUpdate();
          }
        }
      });
    });

  },
  created(){

  },
  data: function () {
    return {
      selectedMenu: 'personal_info',
      localesLoaded: false,
      modalMsg: '',
      modalTitle: '',
      langList: [],
      countryList: [],
      preload: false,
      sponsorshipList: [],
      customFields: [],
      // userObj: {
      //   selectedLang: '',
      // }
    }
  },

  methods: {

    ...mapActions([
      'findUser',
      'apiUpdateUser',
      'getLanguages',
      'getCountries',
      'apiGetSponsorsByType',
      'getCustomUsersField'
    ]),

    openModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },

    saveClick() {
      if (!this.checkValidation()) {
        return false;
      }

      this.preload = true;
      console.log('save');
      if (!this.userBranding.logo.cropped) {
        this.userBranding.logo.new = [];
      }
      this.userObj.addressesObj.country = this.userObj.selectedCountry.value;
      this.userObj.address = {...this.userObj.addressesObj};//JSON.stringify(this.userObj.addressesObj);
      this.userObj.language = this.userObj.selectedLang.value;

      Object.keys(this.userObj.customFields).forEach(item => {
        if (this.userObj.customFields[item] || this.userObj.fields[item]) {
          this.userObj.fields[item] = this.userObj.customFields[item];

          if (typeof this.userObj.fields[item] == 'string') {
            if (!this.userObj.fields[item]) {
              delete this.userObj.fields[item];
            }
          } else if (Array.isArray(this.userObj.fields[item])) {
            if (!this.userObj.fields[item].length) {
              delete this.userObj.fields[item];
            } else {
              const valuesList = [];
              this.userObj.fields[item].forEach(val => {
                valuesList.push(val.value);
              })
              this.userObj.fields[item] = valuesList;
            }
          } else if (typeof this.userObj.fields[item] == 'object') {
            this.userObj.fields[item] = this.userObj.fields[item].value;
          }

        }
      })

      delete this.userObj.timezone;

      this.apiUpdateUser({
        id : this.userObj.id,
        body: this.userObj,
        branding: this.userBranding,
        callback: (response) => {
          console.log('userUpdated', response);

          setTimeout(() => {
            window.location.reload();
          }, 2000);
          // this.preload = false;
        }
      });
    },

    messageModalClose() {
      this.$refs.messageModal.close();
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    checkValidation() {
      const errorsArr = [];


      if (this.userObj.name.length > 50) {
        errorsArr.push(this.tr('myacc_personal_info')+': First name max. length is 50');
      }

      if (/[<>$;.,'\"\\\/\(\)\{\}]/.test(this.userObj.name)) {
        errorsArr.push(this.tr('myacc_personal_info')+': First name should not contain: <>$;.,\'"\\/(){}');
      }

      if (this.userObj.surname.length > 30) {
        errorsArr.push(this.tr('myacc_personal_info')+': Last name max. length is 30');
      }

      if (/[<>$;.,'\"\\\/\(\)\{\}]/.test(this.userObj.surname)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Last name should not contain: <>$;.,\'"\\/(){}');
      }

      if (!this.userObj.email) {
        errorsArr.push(this.tr('myacc_personal_info')+': Email is required');
      }

      if (this.userObj.email && !this.validateEmail(this.userObj.email)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Email is incorrect');
      }

      if (this.userObj.addressesObj.phone && this.userObj.addressesObj.phone.length > 20) {
        errorsArr.push(this.tr('myacc_personal_info')+': Phone number max. length is 20');
      }
      if (this.userObj.addressesObj.phone && !/^[\d()\-#+\s]*$/.test(this.userObj.addressesObj.phone)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Phone number must contain only numbers and "()-# "');
      }

      if (this.userObj.addressesObj.prefix && this.userObj.addressesObj.prefix.length > 5) {
        errorsArr.push(this.tr('myacc_personal_info')+': Prefix max. length is 5');
      }
      if (this.userObj.addressesObj.prefix && !/^[\d+]*$/.test(this.userObj.addressesObj.prefix)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Prefix must contain only numbers and "+"');
      }

      if (this.userObj.addressesObj.address1 && this.userObj.addressesObj.address1.length > 40) {
        errorsArr.push(this.tr('myacc_personal_info')+': Address 1 max. length is 40');
      }
      if (this.userObj.addressesObj.address1 && /[<>;$]/.test(this.userObj.addressesObj.address1)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Address 1 should not contain: <>;$');
      }

      if (this.userObj.addressesObj.address2 && this.userObj.addressesObj.address2.length > 40) {
        errorsArr.push(this.tr('myacc_personal_info')+': Address 2 max. length is 40');
      }
      if (this.userObj.addressesObj.address2 && /[<>;$]/.test(this.userObj.addressesObj.address2)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Address 2 should not contain: <>;$');
      }

      if (this.userObj.addressesObj.city && this.userObj.addressesObj.city.length > 20) {
        errorsArr.push(this.tr('myacc_personal_info')+': City max. length is 20');
      }
      if (this.userObj.addressesObj.city && /[<>;$()]/.test(this.userObj.addressesObj.city)) {
        errorsArr.push(this.tr('myacc_personal_info')+': City should not contain: <>;$()');
      }

      if (this.userObj.addressesObj.state && this.userObj.addressesObj.state.length > 20) {
        errorsArr.push(this.tr('myacc_personal_info')+': State max. length is 20');
      }
      if (this.userObj.addressesObj.state && /[<>;$()]/.test(this.userObj.addressesObj.state)) {
        errorsArr.push(this.tr('myacc_personal_info')+': State should not contain: <>;$()');
      }

      if (this.userObj.addressesObj.postcode && this.userObj.addressesObj.postcode.length > 10) {
        errorsArr.push(this.tr('myacc_personal_info')+': Postcode max. length is 10');
      }
      if (this.userObj.addressesObj.postcode && !/^[\d]*$/.test(this.userObj.addressesObj.postcode)) {
        errorsArr.push(this.tr('myacc_personal_info')+': Postcode must contain only numbers');
      }

      if (this.userObj.addressesObj.facebook && this.userObj.addressesObj.facebook.length > 100) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_fb_max_length'));
      }
      if (this.userObj.addressesObj.facebook && !/^(https?:\/\/)?((w{3}\.)?)facebook.com\/.*/i.test(this.userObj.addressesObj.facebook)) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_fb_incorrect'));
      }

      if (this.userObj.addressesObj.linkedin && this.userObj.addressesObj.linkedin.length > 100) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_linkedin_max_length'));
      }
      if (this.userObj.addressesObj.linkedin && !/^(https?:\/\/)?((w{3}\.)?)linkedin.com\/.*/i.test(this.userObj.addressesObj.linkedin)) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_linkedin_incorrect'));
      }

      if (this.userObj.addressesObj.instagram && this.userObj.addressesObj.instagram.length > 100) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_instagram_max_length'));
      }
      if (this.userObj.addressesObj.instagram && !/^(https?:\/\/)?((w{3}\.)?)instagram.com\/.*/i.test(this.userObj.addressesObj.instagram)) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_instagram_incorrect'));
      }

      if (this.userObj.addressesObj.twitter && this.userObj.addressesObj.twitter.length > 100) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_twitter_max_length'));
      }

      if (this.userObj.addressesObj.twitter &&
        ( !/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(this.userObj.addressesObj.twitter) &&
          !/^(@)[-a-zA-Z0-9@:%._\+~#=]*/g.test(this.userObj.addressesObj.twitter) ) ) {
        errorsArr.push(this.tr('myacc_personal_info')+': '+this.tr('myacc_valid_twitter_incorrect'));
      }



      if (!errorsArr.length) {
        return true;
      } else {
        this.openModal(errorsArr);
        return false;
      }
    },





  },
  computed: {
    ...mapGetters([
      'getAuthUser',
      'tr',
      'routes',
      'getLocale',
      'features'
    ])
  },
}
