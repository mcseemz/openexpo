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
// {
//     "id": 2,
//     "name": "The great company",
//     "email": "another@mail.com",
//     "website": "www.someth.com",
//     "tags": ["cool", "tech", "it"],
//     "vat": "1234",
//     "address": {
//     }
//   }
      companyObj: {
        // id: null, // req
        name: '',
        email: '',
        timezone: null,
        website: 'en_GB',
        addresses: '{}',
        addressesObj: {
          country: '',
          address1: '',
        },
        selectedCountry: {},
        tags: ["cool", "tech", "it"],
        industryArr: [],
        vat: '',

      },


      companyDownloadables: {
        exist: [],
        new: []
      },
      companyBranding: {
        logo: {
          new: [],
          url: '',
        },
        logo_preview_url: false,
        exist: [],
        new:[],
        maps: {},
      },

    }
  },
   methods: {
    ...mapActions([
      'apiUpdateCompany',
      'findUser',
      'apiGetCompany',
      'getDownloadFileUrl',
    ]),


    getFormattedCompanyCallback(response, callback) {
      console.log('get user resp ', response)

      if ( response.data.statusCode == 200 ) {
        this.companyObj = response.data.body;

        this.companyObj.selectedCountry = {};
        this.companyObj.industryArr = [];
        // this.companyObj.industryArr = Auth.user.attributes.email;
        if (this.companyObj.address) {
          // this.companyObj.addressesObj = JSON.parse(this.companyObj.addresses);
          this.companyObj.addressesObj = this.companyObj.address;
        } else {
          this.companyObj.addressesObj = {};
        }


        this.getCompanyBranding();

        this.getCompanyDownloadables();

      }

      if (callback) {
        callback(response);
      }

    },

    getFormattedCompany(id, callback) {

      let companyID = id ? id : '@me';

      if (Auth.user || this.isLinkedinSignin) {
        this.apiGetCompany({
          id: companyID,
          callback: (response) => {
            this.getFormattedCompanyCallback(response, callback);
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

    getCompanyBranding() {
      if ( this.companyObj.branding && this.companyObj.branding.length ) {

        this.companyObj.branding.forEach(item => {
          if (!item.strings && !item.strings.length) {
            return false;
          }

          let itemFullUrl = func.url_560x315('https://'+this.configs.binary+'/'+item.url);
console.log('THIS CONFIGS', this.configs)                ;
          this.companyBranding.exist.push(itemFullUrl);

          item.strings.forEach(str => {

            if (str.category == 'description_long') {

              if (str.value == 'logo_image') {
                this.companyBranding.logo.url = itemFullUrl;
                this.companyBranding.maps.logo = item.id;
              }

            }
          });

        });

      }
    },

    getCompanyDownloadables() {
      this.companyDownloadables.exist = {};
      this.companyDownloadables.maps = {};

      let exist = {};
      let maps = {};
      let index = 0;
      console.log('DOWNL', this.companyObj);
      if (this.companyObj.standMaterials) {
        this.companyObj.standMaterials.forEach((item, i) => {

          this.getDownloadFileUrl({
            id: item.id,

            callback: (response) => {

              if (response.data.body.url) {

                exist[item.id] = {
                  url: response.data.body.url,
                };

                item.strings.forEach(str => {
                  if (str.category == 'description_long') {
                    exist[item.id].description = str.value;
                  }
                  if (str.category == 'name') {
                    exist[item.id].name = str.value;
                  }
                });

                if (!exist[item.id].name) {
                  exist[item.id].name = 'Noname';
                }
                exist[item.id].id = item.id;

                exist[item.id].size = Math.round(item.size/1024);
                exist[item.id].fileType = item.filetype
                maps[item.id] = true;

                if ( (this.companyObj.standMaterials.length - 1) == index ) {
                  this.companyDownloadables.exist = exist;
                  this.companyDownloadables.maps = maps;
                }

                index++;
              }


              // console.log('getEventDownloadables', response);
            }
          });

        });
      }

    }

  },
  computed: {
    ...mapGetters([
      'configs',
      'isLinkedinSignin'
    ]),
  }
}
