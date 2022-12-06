import func from '@/others/functions.js';
import CompanyInfo from './CompanyInfo/CompanyInfo.vue'
import Users from './Users/Users.vue'
import Downloadables from './Downloadables/Downloadables.vue'
import Sponsorship from '@/components/Sponsorship/Sponsorship.vue'
import ContactInfo from './ContactInfo/ContactInfo.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import companyMixin from '@/mixins/company.js';


const dict = {
  importLang: (lang) => import( /* webpackChunkName: "mycompany" */ '@/../locales/mycompany/'+lang+'.json')
};

export default {
  name: 'MyCompany',
  mixins: [companyMixin],
  components: {
    CompanyInfo,
    Users,
    Downloadables,
    Sponsorship,
    ContactInfo
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('mycomp_title') : 'My company',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('mycomp_title') : 'My company' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('mycomp_title') : 'My company' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('mycomp_title') : 'My company' },
      ],
    }
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });

    this.getFormattedCompany('@me', ( response ) => {
      setTimeout(() => {
        this.preload = false;
      }, 1000);

      if (response.data.statusCode == '404') {
        this.companyNotFound = true;
      }

      this.getIndustries(response => {
        if ( response.data.statusCode == 200 ) {
          response.data.body.forEach(item => {
            this.industryList.push({
              label: item.value,
              value: item.id
            });

            if (this.companyObj.tags.includes(item.id)) {
              this.companyObj.industryArr.push({
                label: item.value,
                value: item.id
              });
            }
          });
        }

        this.getCountries(response => {

          if ( response.data.statusCode == 200 ) {
            response.data.body.forEach(item => {
              this.countryList.push({
                label: item.value,
                value: item.id
              });

              if (item.id == this.companyObj.addressesObj.country) {
                this.companyObj.selectedCountry = item;
              }
            });

          }
        });

      });

      this.apiGetSponsorsByType({
        type: 'company',
        id: this.companyObj.id,
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
  created(){},
  data: function () {
    return {
      localesLoaded: false,
      selectedMenu: 'company_info',
      modalMsg: '',
      modalTitle: '',
      downloadables: {},
      industryList: [],
      countryList: [],
      preload: true,
      sponsorshipList: [],
      companyNotFound: false,
    }
  },

  methods: {

    ...mapActions([
      'findUser',
      'apiUpdateCompany',
      'getIndustries',
      'apiGetSponsorsByType'
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
      this.companyObj.addressesObj.country = this.companyObj.selectedCountry.value;
      this.companyObj.address = JSON.stringify(this.companyObj.addressesObj);

      this.apiUpdateCompany({
        id : this.companyObj.id,
        body: this.companyObj,
        downloadables: this.companyDownloadables,
        branding: this.companyBranding,
        callback: (response) => {
          console.log('companyUpdated', response);
          this.companyObj = {
            // id: null, // req
            name: '',
            email: '',
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

          };

          this.companyDownloadables = {
            exist: [],
            new: []
          };
          this.companyBranding = {
            logo: {
              new: [],
              url: '',
            },
            logo_preview_url: false,
            exist: [],
            new:[],
            maps: {},
          };

          setTimeout(() => {
            this.getFormattedCompany('@me', ( response ) => {

              this.preload = false;

              this.getIndustries(response => {
                if ( response.data.statusCode == 200 ) {
                  response.data.body.forEach(item => {
                    this.industryList.push({
                      label: item.value,
                      value: item.id
                    });

                    if (this.companyObj.tags.includes(item.id)) {
                      this.companyObj.industryArr.push({
                        label: item.value,
                        value: item.id
                      });
                    }
                  });
                }

                this.getCountries(response => {
                  if ( response.data.statusCode == 200 ) {
                    response.data.body.forEach(item => {
                      this.countryList.push({
                        label: item.value,
                        value: item.id
                      });

                      if (item.id == this.companyObj.addressesObj.country) {
                        this.companyObj.selectedCountry = item;
                      }
                    });
                  }
                });

              });

            });
          }, 3000);

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

      if (this.companyObj.name.length > 100) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_name_length'));
      }

      if (/[<>$;]/.test(this.companyObj.name)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_name_chars'));
      }

      if (this.companyObj.vat && this.companyObj.vat.length > 20) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_vat_maxlength'));
      }

      if (this.companyObj.vat && this.companyObj.vat.length && !/[a-zA-Z0-9]+/.test(this.companyObj.vat)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_vat_chars'));
      }

      if (this.companyObj.addressesObj.address1 && this.companyObj.addressesObj.address1.length > 40) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_address1_maxlength'));
      }
      if (this.companyObj.addressesObj.address1 && /[<>;$]/.test(this.companyObj.addressesObj.address1)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_address1_chars'));
      }

      if (this.companyObj.addressesObj.address2 && this.companyObj.addressesObj.address2.length > 40) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_address2_maxlength'));
      }
      if (this.companyObj.addressesObj.address2 && /[<>;$]/.test(this.companyObj.addressesObj.address2)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_address2_chars'));
      }

      if (this.companyObj.addressesObj.city && this.companyObj.addressesObj.city.length > 20) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_city_maxlength'));
      }
      if (this.companyObj.addressesObj.city && /[<>;$()]/.test(this.companyObj.addressesObj.city)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_city_chars'));
      }

      if (this.companyObj.addressesObj.state && this.companyObj.addressesObj.state.length > 20) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_state_maxlength'));
      }
      if (this.companyObj.addressesObj.state && /[<>;$()]/.test(this.companyObj.addressesObj.state)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_state_chars'));
      }

      if (this.companyObj.addressesObj.code && this.companyObj.addressesObj.code.length > 10) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_postcode_maxlength'));
      }
      if (this.companyObj.addressesObj.code && !/^[\d]*$/.test(this.companyObj.addressesObj.code)) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_postcode_onlynums'));
      }

      if (!this.companyObj.addressesObj.code && this.companyObj.addressesObj.use_as_billing) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_postcode_req'));
      }
      if (!this.companyObj.addressesObj.state && this.companyObj.addressesObj.use_as_billing) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_state_req'));
      }
      if (!this.companyObj.addressesObj.city && this.companyObj.addressesObj.use_as_billing) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_city_req'));
      }
      if (!this.companyObj.addressesObj.address1 && this.companyObj.addressesObj.use_as_billing) {
        errorsArr.push(this.tr('mycomp_comp_info')+': '+this.tr('mycomp_valid_address_req'));
      }

      if (this.companyObj.addressesObj.phone && this.companyObj.addressesObj.phone.length > 20) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_phone_max_length'));
      }
      if (this.companyObj.addressesObj.phone && !/^[\d()\-#+\s]*$/.test(this.companyObj.addressesObj.phone)) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_phone_symb'));
      }

      if (this.companyObj.addressesObj.facebook && this.companyObj.addressesObj.facebook.length > 100) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_fb_max_length'));
      }
      if (this.companyObj.addressesObj.facebook && !/^(https?:\/\/)?((w{3}\.)?)facebook.com\/.*/i.test(this.companyObj.addressesObj.facebook)) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_fb_incorrect'));
      }

      if (this.companyObj.addressesObj.linkedin && this.companyObj.addressesObj.linkedin.length > 100) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_linkedin_max_length'));
      }
      if (this.companyObj.addressesObj.linkedin && !/^(https?:\/\/)?((w{3}\.)?)linkedin.com\/.*/i.test(this.companyObj.addressesObj.linkedin)) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_linkedin_incorrect'));
      }

      if (this.companyObj.addressesObj.instagram && this.companyObj.addressesObj.instagram.length > 100) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_instagram_max_length'));
      }
      if (this.companyObj.addressesObj.instagram && !/^(https?:\/\/)?((w{3}\.)?)instagram.com\/.*/i.test(this.companyObj.addressesObj.instagram)) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_instagram_incorrect'));
      }

      if (this.companyObj.addressesObj.twitter && this.companyObj.addressesObj.twitter.length > 100) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_twitter_max_length'));
      }

      if (this.companyObj.addressesObj.twitter &&
        ( !/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(this.companyObj.addressesObj.twitter) &&
          !/^(@)[-a-zA-Z0-9@:%._\+~#=]*/g.test(this.companyObj.addressesObj.twitter) ) ) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_twitter_incorrect'));
      }

      if (this.companyObj.addressesObj.website && this.companyObj.addressesObj.website.length > 400) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_website_max'));
      }
      if (this.companyObj.addressesObj.website && !/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(this.companyObj.addressesObj.website)) {
        errorsArr.push(this.tr('contact_info')+': '+this.tr('mycomp_valid_website_format'));
      }

      if (!errorsArr.length) {
        return true;
      } else {
        this.openModal(errorsArr);
        return false;
      }
    },
    userCan(grant) {
      return this.userGrants.includes(grant);
    }

  },
  computed: {
    ...mapGetters([
      'getAuthUser',
      'tr',
      'routes',
      'getLocale',
      'features'
    ]),
    ...mapState([
      'userData'
    ]),
    userGrants() {
      return this.userData.grants;
    }
  },
}
