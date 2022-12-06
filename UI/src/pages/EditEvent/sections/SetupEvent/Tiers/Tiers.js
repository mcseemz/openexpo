import func from '@/others/functions.js';
import datepicker_lang from '@/others/datepicker_lang.js';
import VueUploadComponent from 'vue-upload-component';
import { mapActions, mapGetters } from 'vuex'
import { ToggleButton } from 'vue-js-toggle-button'
import Survey from '../Survey/Survey.vue'

export default {
  name: 'Tiers',
  props: {
    eventObj: Object,
  },
  components: {
    ToggleButton,
    VueUploadComponent,
    Survey
  },
  created() {
    const eventDate = new Date(this.eventObj.dateStart);
    const now = new Date();
    this.wofPublishDate = eventDate > now ? eventDate : now;

    this.getTiersList();
  },
  data: function () {
    return {
      search_stand_owners: '',
      email_addresses: '',
      mailtext: '',
      preload: true,
      addressTouched: false,
      tiers: [],
      currentSection: 'tiers_list',
      editItem: null,
      editSponsor: null,
      modalMsg: '',
      datepicker_lang: datepicker_lang,
      wofPublishDate: null,
      wofPublishTime: {
        label: '09:00 am',
        value: '9:00',
      },
    }
  },

  methods: {
    ...mapActions([
      'apiGetTiers',
      'apiCreateTier',
      'getTierPricing',
      'apiUpdateTier',
      'uploadFiles',
      'apiSponsorRefund',
      'apiDeletePromo',
      'apiUpdateSponsor'
    ]),
    requestToRefundAction(sponsor) {
      this.preload = true;
      this.apiSponsorRefund({
        id: sponsor.id,
        callback: () => {
          this.preload = false;
          this.backToTier();
        }
      });
    },
    goToSurvey() {
      this.currentSection = 'edit_sponsor_survey';
    },
    exitSurvey() {
      this.currentSection = 'edit_sponsor';
    },
    addOptionRow() {
      this.editSponsor.wof.options.push({
        label: '',
        amount: 0,
        infinite: false,
      })
      this.forceUpdate();
    },
    getTiersList() {
      this.apiGetTiers({
        eventId: this.eventObj.id,
        callback: (response) => {
          this.tiers = response.data.body;

          this.tiers.forEach((item, index) => {

            if (item.strings.length) {
              item.strings.forEach(str => {
                if (str.category == 'name') {
                  item.title = str.value;
                }
              })
            }

            item.price = {
              ticket_name: '',
              ticket_price: '',
              ticket_qty: '',
              ticket_descr: '',

              ticket_nameTouched: false,
              ticket_priceTouched: false,
              tick0et_qtyTouched: false,
              ticket_descrTouched: false,
              exist: false,
              updated: false,
              tierId : item.id,
              currency: this.configs.currency,
            };

            item.sponsors.forEach(sponsor => {
              if (!sponsor.parameter.lottery) {
                sponsor.parameter.lottery = {};
              }

              sponsor.parameter.lottery.name = sponsor.parameter.lottery.name ? sponsor.parameter.lottery.name : '';
              sponsor.parameter.lottery.description = sponsor.parameter.lottery.description ? sponsor.parameter.lottery.description : '';
              sponsor.parameter.lottery.start = sponsor.parameter.lottery.start ? sponsor.parameter.lottery.start : '';
              sponsor.parameter.lottery.publishDate = sponsor.parameter.lottery.publishDate ? sponsor.parameter.lottery.publishDate : null;
              sponsor.parameter.lottery.publishTime = sponsor.parameter.lottery.publishTime ? sponsor.parameter.lottery.publishTime : '';
              sponsor.parameter.lottery.options = sponsor.parameter.lottery.options ? sponsor.parameter.lottery.options : [
                                                                                                                            {
                                                                                                                              label: '',
                                                                                                                              amount: 0,
                                                                                                                              infinite: false,
                                                                                                                            }
                                                                                                                          ];

              if (!sponsor.parameter.survey) {
                sponsor.parameter.survey = {
                  name: '',
                  description: '',
                  start: '',
                  publishDate: null,
                  publishTime: '',
                  questions: [
                    {
                      label: '',
                      type: 'one-choice',
                      options: [''],
                    }
                  ],
                };
              }
              Object.assign({
                name: '',
                description: '',
                start: '',
                publishDate: null,
                publishTime: '',
                questions: [
                  {
                    label: '',
                    type: 'one-choice',
                    options: [''],
                  }
                ],
              }, sponsor.parameter.survey);

              Object.assign(sponsor, {
                name: 'Name',
                email: 'email@mail.mail',
                phone: '+0123456789',
                sponsorBranding: {
                  imageLogo: {
                    new: [],
                    url: '',
                  },
                  videoLogo: {
                    new: [],
                    url: '',
                  },
                  banner: {
                    new: [],
                    url: '',
                  },
                  surveyThumb: {
                    new: [],
                    url: ''
                  },
                  maps: {},
                },
                placeholders: {
                  logoPlaceholder: sponsor.parameter.logo ? sponsor.parameter.logo : false,
                  videoPlaceholder: sponsor.parameter.video ? sponsor.parameter.video : false,
                  bannerPlaceholder: sponsor.parameter.banner ? sponsor.parameter.banner : false,
                  surveyPlaceholder: sponsor.parameter.survey_thumb ? sponsor.parameter.survey_thumb : false,
                },
                bannerTarget: sponsor.parameter.bannerUrl ? sponsor.parameter.bannerUrl : '',
                logoTarget: sponsor.parameter.logoUrl ? sponsor.parameter.logoUrl : '',
                videoTarget: sponsor.parameter.videoUrl ? sponsor.parameter.videoUrl : '',
                wof: sponsor.parameter.lottery,
                survey: sponsor.parameter.survey,
                pool: [
                  {
                    question: '',
                    options: [''],
                  }
                ],
              })
            })

            if (item.pricing) {              
              this.getTierPricing({
                id: item.id,
                callback: (resp) => {
                  if (resp.data.statusCode == '200' && resp.data.body) {

                      item.price.exist = true;
                      item.price.ticket_price = resp.data.body.access_price;
                      item.price.ticket_qty = resp.data.body.quantity;
                      item.price.currency = resp.data.body.access_currency;


                      if (resp.data.body.strings && resp.data.body.strings.length) {
                        resp.data.body.strings.forEach(string => {
                          if (string.category == 'name') {
                            item.price.ticket_name = string.value;
                          }
                          if (string.category == 'description_long') {
                            item.price.ticket_descr = string.value;
                          }
                        })
                      }
                        
                      
                  }
                  this.$forceUpdate();
                  if (index == (this.tiers.length - 1)) {
                    this.preload = false;
                  }
                }
              })
            } else {
              if (index == (this.tiers.length - 1)) {
                this.preload = false;
              }
            }

            item.branding = {
              logo: {
                new: [],
                url: '',
              },
              maps: {},
            };

            item.placeholders = {
              logoPlaceholder: false,
            };
          });
          
        }
      })
    },
    formatPriceObj(priceObj) {
      let newStrings = [];

      if ( priceObj.ticket_name ) {
          newStrings.push({
            category: 'name',
            value: priceObj.ticket_name
          });
      }

      if ( priceObj.ticket_descr ) {
          newStrings.push({
            category: 'description_long',
            value: priceObj.ticket_descr
          });
      }

      return {
        access_currency: this.configs.currency,
        access_price: priceObj.ticket_price,
        description_long: priceObj.ticket_descr,
        event: this.eventObj.id,
        name: priceObj.ticket_name,
        newStrings: newStrings,
        pricing_plan: 'sponsorship_price',
        quantity: priceObj.ticket_qty,
        tierId: priceObj.tierId
      }
    },
    forceUpdate() {
      this.$forceUpdate();
    },
    openModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageTiersModal.open();
    },
    tiersModalClose() {
      this.$refs.messageTiersModal.close();
    },
    isTierValid(item) {
      const errorsArr = [];

      if (!item.price.ticket_price && item.price.ticket_price !== 0) {
        errorsArr.push(this.tr('adev_tiers_valid_price_req'));
      }
      if (item.price.ticket_price.length > 10) {
        errorsArr.push(this.tr('adev_tiers_valid_price_max'));
      }
      if (item.price.ticket_price < 0) {
        errorsArr.push(this.tr('adev_tiers_valid_price_min'));
      }
      
      if (!item.price.ticket_qty) {
        errorsArr.push(this.tr('adev_tiers_valid_qty_req'));
      }
      if (item.price.ticket_qty.length > 5) {
        errorsArr.push(this.tr('adev_tiers_valid_qty_max'));
      }
      if (item.price.ticket_qty < 1) {
        errorsArr.push(this.tr('adev_tiers_valid_qty_min'));
      }

      if (errorsArr.length) {
        this.openModal(errorsArr);
        return false;
      }

      return true;
      
    },
    saveTier(item) {
      if (!this.isTierValid(item)) { return false; }
      this.preload = true;
      const body = {
        event: this.eventObj.id,
        is_enabled: item.is_enabled,
        pricing: item.pricing,
        switches: item.switches,
      }
      const price = this.formatPriceObj(item.price);
      if (item.default_id) {
        body.default_id = item.default_id;
        body.id = item.id;
        this.apiUpdateTier({
          body: body,
          price: price,
          callback: (response) => {
            console.log('tier created', response);
            this.getTiersList();
            this.goToList();
          }
        })
      } else {
        body.default_id = item.id;
        body.pricing = price;
        body.pricing.strings = body.pricing.newStrings;
        this.apiCreateTier({
          body: body,
          price: price,
          callback: (response) => {
            console.log('tier created', response);
            this.getTiersList();
            this.goToList();
          }
        })
      }
      
        
    },
    dayListToDatestring(date, time) {

      let year = date.getFullYear();
      let month = date.getMonth()+1;
      if (month < 10) {
        month = '0'+month;
      }
      let day = date.getDate();
      if (day < 10) {
        day = '0'+day;
      }

      date.setUTCHours(time.split(":")[0]);
      date.setMinutes(time.split(":")[1]);

      return date.toISOString()

    },
    calcDate(index) {
      if (this.wofPublishDate && this.wofPublishTime.value) {

        this.editSponsor.wof.start = this.dayListToDatestring(this.wofPublishDate, this.wofPublishTime.value);
        console.log('SSSTART', this.editSponsor.wof.start);
      }
      this.$forceUpdate();
    },
    editTier(item) {
      if (!item) { return false; }
      this.editItem = item;
      this.currentSection = 'edit_tier';
      this.$forceUpdate()
    },
    goToEditSponsor(sponsor) {
      if (!sponsor) { return false; }
      this.editSponsor = sponsor;
      this.currentSection = 'edit_sponsor';
      this.$forceUpdate();
    },
    backToTier() {
      this.editSponsor = null;
      this.currentSection = 'edit_tier';
      this.$forceUpdate();
    },
    goToList() {
      this.editItem = null;
      this.currentSection = 'tiers_list';
    },
    statusToggleChange(item) {
      if (this.editItem.status == 'disabled') {
        this.editItem.status = 'enabled'
      } else {
        this.editItem.status = 'disabled'
      }
      console.log(this.editItem);
    },
    send() {

    },
    inputFile(newFile, oldFile) {
      if ( !newFile ) {this.editSponsor.placeholders.videoPlaceholder = false;
        this.editSponsor.placeholders.videoPlaceholder = false;
        return false;
      }
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editSponsor.placeholders.videoPlaceholder = reader.result;
        this.$forceUpdate();
      }
this.$forceUpdate();
      let url =  reader.readAsDataURL(newFile.file);
    },
    inputImageLogoFile(newFile, oldFile) {
      if ( !newFile ) {this.editSponsor.placeholders.logoPlaceholder = false;
        this.editSponsor.placeholders.logoPlaceholder = false;
        return false;
      }
console.log('bbbb', newFile, oldFile);
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editSponsor.placeholders.logoPlaceholder = reader.result;
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },
    inputTierLogoFile(newFile, oldFile) {
      if ( !newFile ) {
        this.editItem.placeholders.logoPlaceholder = false;
        return false;
      }
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editItem.placeholders.logoPlaceholder = reader.result;
        this.forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },
    inputBannerFile(newFile, oldFile) {
      if ( !newFile ) {this.editSponsor.placeholders.bannerPlaceholder = false;
        this.editSponsor.placeholders.bannerPlaceholder = false;
        return false;
      }

      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editSponsor.placeholders.bannerPlaceholder = reader.result;
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    inputTierLogoFilter(newFile, old, prevent) {
      newFile.imagetype="tierLogo";
    },
    inputImageLogoFilter(newFile, old, prevent) {
      newFile.imagetype="imageLogo";
    },
    inputBannerFilter(newFile, old, prevent) {
      newFile.imagetype="banner";
    },

    removeImage(type) {
      if (type == 'imageLogo') {
        this.editSponsor.sponsorBranding.imageLogo.url = this.editSponsor.placeholders.logoPlaceholder = false;
        this.editSponsor.sponsorBranding.imageLogo.new = [];
        this.editSponsor.sponsorBranding.imageLogo.todelete = true;
      } else if (type == 'banner') {
        this.editSponsor.sponsorBranding.banner.url = this.editSponsor.placeholders.bannerPlaceholder = false;
        this.editSponsor.sponsorBranding.banner.new = [];
        this.editSponsor.sponsorBranding.banner.todelete = true;
      } else if (type == 'tierLogo') {
        this.editItem.placeholders.logoPlaceholder = this.editItem.branding.logo.url = false;
        this.editItem.branding.logo.new = [];
        this.editItem.branding.logo.todelete = true;
      } else {
        this.editSponsor.sponsorBranding.videoLogo.url = this.editSponsor.placeholders.videoPlaceholder = false;
        this.editSponsor.sponsorBranding.videoLogo.new = [];
        this.editSponsor.sponsorBranding.videoLogo.todelete = true;
      }
      this.$forceUpdate();

    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    addQuestion() {
      this.editSponsor.pool.push({
        question: '',
        options: [''],
      });
    },
    addOption(question) {
      question.options.push('');
    },
    removeOption(question, index) {
      if (question.options.length  < 2) { return false }
      question.options.splice(index, 1);
    },
    formattedPrice(price, currency) {
      return func.price(price, currency); 
    },
    saveSponsor() {
      this.preload = true;
      this.editSponsor.wof.options.forEach((item, index) => {
        this.calcDate();
        if (item.infinite) {
          item.amount = -1
        }
        if (!item.id) {
          item.id = func.makeIdString(7);
        }
      });
      this.editSponsor.survey.questions.forEach((item, index) => {
        if (!item.id) {
          item.id = func.makeIdString(7);
        }
      });
      
      this.apiUpdateSponsor({
        id: this.editSponsor.id,
        body: {
          lottery: this.editSponsor.wof,
          survey: this.editSponsor.survey
        },
        callback: (response) => {

        }
      })
      const query = {
        logo: true,
        banner: true,
        video: true,
        survey: true,
      };
      
      if (this.editSponsor.sponsorBranding.imageLogo.new.length) {
        this.uploadFiles({
          id: this.eventObj.id,
          post_type: 'event',
          files: this.editSponsor.sponsorBranding.imageLogo.new,
          category: 'sponsor',
          description: 'logo',
          url: this.editSponsor.logoTarget,
          relationid: this.editSponsor.id,
          callback: (url) => {
            console.log('logo upld', url);
            query.logo = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }
          }
        });
      } else if (this.editSponsor.sponsorBranding.imageLogo.todelete) {
        this.apiDeletePromo({
          relationId: this.editSponsor.id,
          placeId: 'logo',
          callback: () => {
            query.logo = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }            
          }
        });
        
      } else { query.logo = false; }
      if (this.editSponsor.sponsorBranding.banner.new.length) {
        this.uploadFiles({
          id: this.eventObj.id,
          post_type: 'event',
          files: this.editSponsor.sponsorBranding.banner.new,
          category: 'sponsor',
          description: 'banner',
          url: this.editSponsor.bannerTarget,
          relationid: this.editSponsor.id,
          callback: (url) => {
            console.log('banner upld', url);
            query.banner = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }
          }
        });
      } else if (this.editSponsor.sponsorBranding.banner.todelete) {
        this.apiDeletePromo({
          relationId: this.editSponsor.id,
          placeId: 'banner',
          callback: () => {
            query.banner = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }            
          }
        });
        
      } else { query.banner = false; }
      if (this.editSponsor.sponsorBranding.videoLogo.new.length) {
        this.uploadFiles({
          id: this.eventObj.id,
          post_type: 'event',
          files: this.editSponsor.sponsorBranding.videoLogo.new,
          category: 'sponsor',
          description: 'video',
          url: this.editSponsor.videoTarget,
          relationid: this.editSponsor.id,
          callback: (url) => {
            console.log('video upld', url);
            query.video = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }
          }
        });
      } else if (this.editSponsor.sponsorBranding.videoLogo.todelete) {
        this.apiDeletePromo({
          relationId: this.editSponsor.id,
          placeId: 'video',
          callback: () => {
            query.video = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }            
          }
        });
        
      } else { query.video = false; }

      if (this.editSponsor.sponsorBranding.surveyThumb.new.length) {
        this.uploadFiles({
          id: this.eventObj.id,
          post_type: 'event',
          files: this.editSponsor.sponsorBranding.surveyThumb.new,
          category: 'sponsor',
          description: 'survey_thumb',
          relationid: this.editSponsor.id,
          callback: (url) => {
            console.log('video upld', url);
            query.survey = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }
          }
        });
      } else if (this.editSponsor.sponsorBranding.surveyThumb.todelete) {
        this.apiDeletePromo({
          relationId: this.editSponsor.id,
          placeId: 'survey_thumb',
          callback: () => {
            query.survey = false;
            if (!query.logo && !query.banner && !query.video && !query.survey) {
              this.preload = false;
              this.backToTier();
            }            
          }
        });
        
      } else { query.survey = false; }

      if (!query.logo && !query.banner && !query.video && !query.survey) {
        this.preload = false;
        this.backToTier();
      }

    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs'
    ]),
    
    currentTierLogo() {
      return this.editItem.placeholders.logoPlaceholder ? this.editItem.placeholders.logoPlaceholder : this.editItem.branding.logo.url;
    },
    imageLogoUrl() {
      return this.editSponsor.placeholders.logoPlaceholder ? this.editSponsor.placeholders.logoPlaceholder : this.editSponsor.sponsorBranding.imageLogo.url;
    },
    videoLogoUrl() {
      return this.editSponsor.placeholders.videoPlaceholder ? this.editSponsor.placeholders.videoPlaceholder : this.editSponsor.sponsorBranding.videoLogo.url;
    },
    bannerUrl() {
      return this.editSponsor.placeholders.bannerPlaceholder ? this.editSponsor.placeholders.bannerPlaceholder : this.editSponsor.sponsorBranding.banner.url;
    },
    curSymbol() {
      return this.configs.currencySign;
    },
    emailsValidation() {
      if (!this.email_addresses) {
        return false;
      }
      const email_arr = this.email_addresses.split(',');
      let valid = true;
      email_arr.forEach(item => {
        if (!func.validateEmail(item.trim())) {
          valid = false;
        }
      });
      return valid;
    },
    minFromDate() {
      const eventDate = new Date(this.eventObj.dateStart);
      const now = new Date();
      return eventDate > now ? eventDate : now;
    },
    maxFromDate() {
      let date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date;
    },

    timeList() {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 12 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        original_time = original_time < 10 ? original_time : original_time;

        arr.push({ label: ''+time+':00 '+add, value: ''+original_time+':00' })
        arr.push({ label: ''+time+':15 '+add, value: ''+original_time+':15' })
        arr.push({ label: ''+time+':30 '+add, value: ''+original_time+':30' })
        arr.push({ label: ''+time+':45 '+add, value: ''+original_time+':45' })
      }

      return arr;
    },
  }
}
