import { mapActions, mapGetters } from 'vuex';
import func from '../others/functions.js';
import { Auth } from 'aws-amplify'

export default {
  data() {
    return {
/*
  Strings:
    ref: stand
    category: description_short, description_long, about, name
*/
      userObj: {
        // id: null, // req
        name: '',
        surname: '',
        timezone: null,
        language: 'en_GB',
        addresses: '{}',
        addressesObj: {
          country: '',
          twitter: '',
          facebook: '',
          instagram: '',
          linkedin: ''
        },
        selectedCountry: {},
        email: '',
        selectedLang: {},
        customFields: {},

      },


      // userDownloadables: {
      //   exist: [],
      //   new: []
      // },
      userBranding: {
        logo: {
          new: [],
          url: '',
          cropped: false,
        },
        logo_preview_url: false,
        exist: [],
        new:[],
        maps: {},
        todelete: false,
      },

    }
  },
   methods: {
    ...mapActions([
      'apiUpdateUser',
      'findUser',
      'apiGetUser',
      'getDownloadFileUrl',
    ]),


    getFormattedUserCallback(response, callback) {
      console.log('get user resp ', response)

      if ( response.data.statusCode == 200 ) {
        this.userObj = response.data.body;

        // this.userObj.email = Auth.user.attributes.email;
        // this.userObj.addressesObj = this.userObj.address ? JSON.parse(this.userObj.address) : {};
        // console.log(this.userObj.address)
        this.userObj.addressesObj = this.userObj.address ? {...this.userObj.address} : {};
        this.userObj.selectedCountry = {};
        this.userObj.selectedLang = {};
        this.userObj.customFields = {};

        this.getBranding();

        // this.getStandDownloadables();
        this.$forceUpdate();

        if (callback) {
          callback(response);
        }

      }

    },

    getFormattedUser(id, callback) {

      let userID = id ? id : '@me';

      if (Auth.user || this.isLinkedinSignin) {
        this.apiGetUser({
          id: userID,
          callback: (response) => {
            this.getFormattedUserCallback(response, callback);
          }
        });
      } else {
        // console.log('STAND U');
        // this.apiGetUStand({
        //   id: id,
        //   callback: (response) => {
        //     this.getFormattedStandCallback(response, callback);
        //   }
        // });
      }

    },

    getBranding() {
      if ( this.userObj.branding && this.userObj.branding.length ) {
        this.userObj.branding.forEach(item => {
          let baseUrl = this.configs.binary ? this.configs.binary : 'binary-dev.openexpo.com';
          let itemFullUrl = func.url_64x64('https://'+this.configs.binary+'/'+item.url);
          this.userBranding.exist.push(itemFullUrl);

          item.strings?.forEach(str => {

            if (str.category == 'description_long') {

              if (str.value == 'logo_image') {
                this.userBranding.logo.url = itemFullUrl;
                this.userBranding.maps.logo = item.id;
              }

            }
          });

          if (item.url.indexOf('logo_image') > -1) {
            this.userBranding.logo.url = itemFullUrl;
            this.userBranding.maps.logo = item.id;
          }

        });

      }
    },

  },
  computed: {
    ...mapGetters([
      'configs',
      'isLinkedinSignin'
    ]),
  }
}
