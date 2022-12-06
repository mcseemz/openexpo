import SetupEvent from './sections/SetupEvent/SetupEvent.vue'
import {AmplifyEventBus} from 'aws-amplify-vue';
import {ToggleButton} from 'vue-js-toggle-button'
import func from '@/others/functions.js';
import eventMixin from '../../mixins/event/event.js';
import keenui from '@/plugins/keenUi';
import {mapActions, mapGetters} from 'vuex'
import {I18n} from 'aws-amplify';

import {expirationOptions} from '@/store/modules/enum';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "editevent" */ '@/../locales/add_event/' + lang + '.json')
};

const tabsDict = {
  importLang: (lang) => import( /* webpackChunkName: "default" */ '@/../locales/tabs/' + lang + '.json')
};

const availableTabs = [
  'customize', 'customize_tabs', 'tickets', 'personnel', 'visitors', 'custom_user_fields',
  'downloadables', 'invitations', 'stands_list', 'agenda', 'articles', 'articleslist_all',
  'articleslist_draft', 'articleslist_published', 'tiers', 'sponsors_report', 'collections',
  'products', 'sponsors_custom'
]

export default {
  name: 'EditEvent',
  mixins: [eventMixin],
  components: {
    SetupEvent,
    ToggleButton
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('adev_edit_event') + ' - ' + this.eventObj.name : 'Edit event',
      meta: [
        {
          vmid: 'description',
          property: 'description',
          content: this.localesLoaded ? this.tr('adev_edit_event') + ' - ' + this.eventObj.description_short : 'Edit event'
        },
        {
          vmid: 'og:title',
          property: 'og:title',
          content: this.localesLoaded ? this.tr('adev_edit_event') + ' - ' + this.eventObj.name : 'Edit event'
        },
        {
          vmid: 'og:description',
          property: 'og:description',
          content: this.localesLoaded ? this.tr('adev_edit_event') + ' - ' + this.eventObj.description_short : 'Edit event'
        },
      ],
    }
  },
  mounted() {
    this.preload = true;
    if (this.$route.params.tabId) {
      if (availableTabs.includes(this.$route.params.tabId)) {
        this.selectedMenu.value = this.$route.params.tabId;
        this.selectedMenu.customizeAnchor = '';
      }
    } else {
      this.selectedMenu.value = 'customize';
    }
    func.setDictionary(dict, () => {
      func.setDictionary(tabsDict, () => {
        this.localesLoaded = true;
        this.$forceUpdate();
      });
    });

    this.getFormattedEvent(this.$route.params.id, () => {
      let cat_answ = [];
      this.oldCustomName = this.eventObj.customName;

      this.getCategories()
        .then(response => {
          if (response.data && response.data.body && response.data.body.length) {
            for (var i = 0; i < response.data.body.length; i++) {
              cat_answ[i] = {
                label: response.data.body[i].value,
                value: response.data.body[i].id
              };

              if (this.eventObj.category == cat_answ[i].value) {
                this.eventObj.category = cat_answ[i];
              }

            }
            this.categoriesList = cat_answ;
          }
          this.catsLoaded = true;
        })
        .catch(error => console.log(error));

      this.timeZoneList = func.getTimezoneList();

      const myOffset = new Date().getTimezoneOffset();
      const myTimezoneVal = -1 * myOffset / 60

      this.timeZoneList.forEach(item => {
        if (this.eventObj.timezone == item.value) {
          this.eventObj.timezone = item;
        }
      });

      this.getCustomUsersField({
        callback: (response) => {
          if (response.data && response.data.statusCode == '200') {
            const result = [];
            if (response.data.body && response.data.body.length) {
              response.data.body.forEach(field => {
                const fieldExist = this.eventObj.userfields.includes(field.fieldname);
                result.push({
                  fieldname: field.fieldname,
                  label: field.name,
                  value: fieldExist,
                });
              });
            }
            this.customFields = result;
            this.$forceUpdate();
          }
        }
      })

      this.getLanguages(response => {
        if (response.data.statusCode == 200) {
          response.data.body.forEach(item => {
            let label = item.value;
            if (this.configs.lang == item.language) {
              label += ` (${this.tr('default')})`;
            }
            this.langList.push({
              label: label,
              value: item.id,
            });

            if (!this.eventObj.translations[item.id]) {
              this.eventObj.translations[item.id] = {
                description_long: '',
                description_short: '',
                name: ''
              }
            }
          })
          this.$forceUpdate();
        }
      });

    });
    setTimeout(() => {
      this.agenda.sessions.map(item => {
        if (item.presenter) {
          delete item.presenter
        }
      })
      this.customField = JSON.parse(JSON.stringify(this.customFields));
    }, 4000)
    const seen = new Set();
    setTimeout(() => {
      this.agenda.sessions.map(item => {
        if (item.attendees) {
          let filteredArr = item.attendees.map(
            el => {
              const needChecked = el.id;
              if (!seen.has(needChecked)) {
                seen.add(needChecked);
                return el
              }
            }
          )
          filteredArr = filteredArr.filter(function (element) {
            return element !== undefined;
          })
          item.attendees = filteredArr
        }
      })
      this.$store.commit('resetEditedHint');
      let countField = [];
      this.preload = false;
    }, 5000)

  },
  created() {
    this.findUser();
    AmplifyEventBus.$on('authState', info => {
      if (info === "signedIn") {
        this.findUser();
      } else {
        this.$store.state.signedIn = false;
        this.$store.state.user = null;
      }
    });
    this.resetChanges();

  },
  watch: {
    '$route': {
      handler: function (val) {
        if (val.params.tabId == 'tickets') this.selectedMenu.value = 'tickets'
      },
      deep: true,
      immediate: true
    },
    '$store.getters.getEventDataKey': function () {
      this.countEdited;
    },
    'collections.save': function (newVal) {
      let curVal = newVal;
      this.editedCollections = 0;
      this.addedCollections = 0;
      curVal.forEach( item => {
        if (item.edited) {
          this.editedCollections += 1;
        } else if (item.new) {
          this.addedCollections += 1;
        }
      })
    },
    'collections.delete': function (newVal) {
      this.removedCollections = newVal.length ;
    },

    // --------------------------------------------------------------------------------


    /* control downloadables and products changes count */
    'evtDownloadables.new': function (newVal) {
      this.addedDownload = newVal.length;
    },
    'productsToUpdate': function (newVal) {
      this.editedDownload = newVal.length;
    },
    /* control tickets changes count */
    'tickets.list': function (newVal) {
      this.addedTicket = newVal.length;
    },
    'tickets.toDelete': function (newVal) {
      this.removedTicket = newVal.length;
    },
    '$store.getters.getEditedTicket': function () {
      this.countEdited;
    },
    '$store.getters.getRemovedSponsor': function () {
      this.countDeleted;
    },
    customFields: {
      handler: function(newValue) {
        let diffchanges = 0;
        this.customField.forEach((eachField, index) => {
          if (eachField.value !== newValue[index].value) {
            diffchanges++
          }
        })
        this.difCustomFields = diffchanges;
      },
      deep: true
    }
  },
  data: function () {
    return {
      selectedMenu: {
        value: 'customize',
        customizeAnchor: ''
      },
      catsLoaded: false,
      localesLoaded: false,
      modalMsg: '',
      modalTitle: '',
      customFields: [],
      categoriesList: [],
      timeZoneList: [],
      langList: [],
      preload: true,
      status_modal: false,
      disable_preview: false,
      status_policy: false,
      status_modal_step: 1,
      imagePlaceholders: {
        event_left_preview_url: false,
        logo_preview_url: false,
        event_main_preview_url: false,
        event_banner_preview_url: false,
        carousel_previews: {
          count: 0,
        },
      },
      articleData: {
        articleTitle: '',
        articleContent: '',
        articleDescription: '',
        images: [],
        placeholders: {
          article_main_preview_url: false,
          article_banner_preview_url: false,
        },
        articleBranding: {
          articleCover: {
            new: [],
            url: '',
          },
          articleBanner: {
            new: [],
            url: '',
          },
          maps: {},
        },
        instagram: '',
        facebook: '',
        linkedin: '',
        twitter: ''
      },
      currentArticles: [],
      customNameAvaliable: true,
      oldCustomName: '',
      collections: {
        save: [],
        delete: []
      },
      productsToUpdate: [],

      addedCollections: 0,
      editedCollections: 0,
      removedCollections: 0,
      addedDownload: 0,
      editedDownload: 0,
      removedDownload: 0,
      addedTicket: 0,
      editedTicket: 0,
      removedTicket: 0,
      customField: [],
      difCustomFields: 0
    }
  },
  methods: {
    ...mapActions([
      'updateEvent',
      'findUser',
      'getCategories',
      'getTimezones',
      'getLanguages',
      'apiGetEvent',
      'publishEvent',
      'unpublishEvent',
      'apiCheckCustomName',
      'getCustomUsersField'
    ]),
    resetChanges() {
      this.$store.commit('setEditedAgenda',0);
      this.$store.commit('setNewAddedAgenda',0);
      this.$store.commit('setRemoveAgenda',0);
      this.$store.commit('setRemoveValDown',0);
      this.$store.commit('setEditedticket',0);
      this.$store.commit('setRemovedSposnor',0);
      this.$store.commit('curRemCollection');
      this.$store.commit('setRemDownload');
      this.$store.commit('setRemCustSponsor');
      this.addedCollections = 0;
      this.editedCollections = 0;
      this.removedCollections = 0;
      this.addedDownload = 0;
      this.editedDownload = 0;
      this.removedDownload = 0;
      this.difCustomFields = 0;
    },

    backClick() {
      if (this.disable_preview) {
        this.$refs.leavePageModal.open();
      } else {
        this.leavePageAction();
      }
    },
    leavePageAction() {
      this.$router.push('/' + this.routes.myevents);
    },
    toPriceTypes() {
      this.$router.replace({name: 'priceTypes', params: {id: this.$route.params.id, tabId: 'tickets'}}).catch(err => {
      });
    },
    toEventEmail() {
      this.selectedMenu.value = 'customize';
      this.selectedMenu.customizeAnchor = 'contact_info';
      this.$router.push({name: 'priceTypes', params: {id: this.$route.params.id, tabId: 'contact_info'}});
      setTimeout(() => {
        window.scrollTo({left: 0, top: document.body.scrollHeight, behavior: "smooth"});
      }, 300)
      this.$forceUpdate()
    },
    leavePageModalClose() {
      this.$refs.leavePageModal.close();
    },
    loadPageListeners() {
      const pageElem = document.querySelector('#edit_event_page');
      if (pageElem) {
        pageElem.addEventListener("input", (evt) => {
          if (!evt.target.classList.contains('ngl') && !evt.target.closest('.ngl')) {
            this.disable_preview = true;
          }
        });
        pageElem.addEventListener("change", (evt) => {
          if (!evt.target.classList.contains('ngl') && !evt.target.closest('.ngl')) {
            this.disable_preview = true;
          }
        });
        pageElem.addEventListener("select", (evt) => {
          if (!evt.target.classList.contains('ngl') && !evt.target.closest('.ngl')) {
            this.disable_preview = true;
          }
        });
      }
    },
    checkCustomName() {
      if (this.eventObj.customName == this.oldCustomName) {
        this.customNameAvaliable;
        return false;
      }
      this.apiCheckCustomName({
        type: 'event',
        customName: this.eventObj.customName,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.customNameAvaliable = true
          } else {
            this.customNameAvaliable = false;
          }
        }
      })
    },
    statusToggleChange(evt) {
      if ((!this.tickets.list.length && (!this.tickets.exist || !this.tickets.exist.length)) || (this.tickets.exist && this.tickets.exist.length && this.tickets.toDelete.length && !this.tickets.list.length)) {
        this.openModal(["Event can't be published without price type"]);
        this.toPriceTypes();
        return false;
      }

      if (!this.checkValidation()) {
        return false;
      }
      if (this.eventObj.status == 'draft') {
        if (!this.eventObj.wasPublished) {
          this.$refs.statusModal.open();
        } else {
          this.eventObj.status = this.eventObj.wasPublished;
          // this.unpublish();
        }
      } else {
        this.eventObj.wasPublished = this.eventObj.status;
        this.eventObj.status = 'draft';
        // this.unpublish();
      }
    },
    changeStep(showStep) {
      if (this.steps[showStep]) {
        this.currentStep = showStep;
      }
    },
    checkValidation() {
      const errorsArr = [];
      let errorsLink = '';
      if (!this.eventObj.name) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventname_req'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (this.eventObj.name.length > 60) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventname_max_length'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (/[<>;{}$]/.test(this.eventObj.name)) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventname_symb'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (/^\d+$/.test(this.eventObj.name)) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventname_notnum'));
      }

      if (this.eventObj.customNameWanted) {
        if (!this.eventObj.customName) {
          errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_customname_req'));
          if (!errorsLink) {
            errorsLink = 'basic_information'
          }
        }

        if (this.eventObj.customName.length > 60) {
          errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_customname_max_length'));
          if (!errorsLink) {
            errorsLink = 'basic_information'
          }
        }

        if (/[<>;{}$]/.test(this.eventObj.customName)) {
          errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_customname_symb'));
          if (!errorsLink) {
            errorsLink = 'basic_information'
          }
        }

        if (/^\d+$/.test(this.eventObj.customName)) {
          errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_customname_notnum'));
        }

        if (!this.customNameAvaliable) {
          errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_customname_exist'));
          if (!errorsLink) {
            errorsLink = 'basic_information'
          }
        }
      }

      if (!this.eventObj.description_short) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventdesc_req'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (this.eventObj.description_short.length > 60) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventdesc_max_length'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (/[<>;{}$]/.test(this.eventObj.description_short)) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_eventdesc_symb'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (!this.eventObj.category) {
        errorsArr.push(this.tr('adev_basic_information') + ': ' + this.tr('adev_valid_category_req'));
        if (!errorsLink) {
          errorsLink = 'basic_information'
        }
      }

      if (!this.eventObj.timezone) {
        errorsArr.push(this.tr('customize') + ': ' + this.tr('adev_valid_timezone_req'));
        if (!errorsLink) {
          errorsLink = 'customize'
        }
      }

      if (!this.evtDayList.length) {
        errorsArr.push(this.tr('customize') + ': ' + this.tr('adev_valid_days_min'));
        if (!errorsLink) {
          errorsLink = 'customize'
        }
      } else {
        let dayExist = false;
        this.evtDayList.forEach(item => {
          if ((item.dateEnd && item.dateStart) || (item.oldvalEnd && item.oldvalStart)) {
            dayExist = true;
          }
        });
        if (!dayExist) {
          errorsArr.push(this.tr('customize') + ': ' + this.tr('adev_valid_days_min'));
          if (!errorsLink) {
            errorsLink = 'customize'
          }
        }
      }

      if (this.eventObj.description_long.length > 4000) {
        errorsArr.push(this.tr('adev_event_page') + ': ' + this.tr('adev_valid_maintext_max_length'));
        if (!errorsLink) {
          errorsLink = 'event_page'
        }
      }

      if (!this.eventObj.langs.length) {
        errorsArr.push(this.tr('adev_event_page') + ': ' + this.tr('adev_valid_lang_required'));
        if (!errorsLink) {
          errorsLink = 'event_page'
        }
      }

      if (!this.eventObj.contacts.email) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_email_required'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.email && !this.validateEmail(this.eventObj.contacts.email)) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_email_incorrect'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.phone && this.eventObj.contacts.phone.length > 20) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_phone_max_length'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }
      if (this.eventObj.contacts.phone && !/^[\d()\-#+\s]*$/.test(this.eventObj.contacts.phone)) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_phone_symb'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.facebook && this.eventObj.contacts.facebook.length > 100) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_fb_max_length'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }
      if (this.eventObj.contacts.facebook && !/^(https?:\/\/)?((w{3}\.)?)facebook.com\/.*/i.test(this.eventObj.contacts.facebook)) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_fb_incorrect'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.linkedin && this.eventObj.contacts.linkedin.length > 100) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_linkedin_max_length'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }
      if (this.eventObj.contacts.linkedin && !/^(https?:\/\/)?((w{3}\.)?)linkedin.com\/.*/i.test(this.eventObj.contacts.linkedin)) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_linkedin_incorrect'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.instagram && this.eventObj.contacts.instagram.length > 100) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_instagram_max_length'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }
      if (this.eventObj.contacts.instagram && !/^(https?:\/\/)?((w{3}\.)?)instagram.com\/.*/i.test(this.eventObj.contacts.instagram)) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_instagram_incorrect'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.twitter && this.eventObj.contacts.twitter.length > 100) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_twitter_max_length'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.twitter &&
        (!/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(this.eventObj.contacts.twitter) &&
          !/^(@)[-a-zA-Z0-9@:%._\+~#=]*/g.test(this.eventObj.contacts.twitter))) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_twitter_incorrect'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }

      if (this.eventObj.contacts.website && this.eventObj.contacts.website.length > 400) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_website_max'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }
      if (this.eventObj.contacts.website && !/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(this.eventObj.contacts.website)) {
        errorsArr.push(this.tr('contact_info') + ': ' + this.tr('adev_valid_website_format'));
        if (!errorsLink) {
          errorsLink = 'contact_info'
        }
      }


      if (!errorsArr.length) {
        return true;
      } else {
        this.openModal(errorsArr);
        return false;
      }
    },
    showErrorMessage(msg) {
      this.openModal([msg]);
    },
    openModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>' + item + '</p>';
      });
      this.$refs.messageModal.open();
    },
    statusModalClose() {
      this.$refs.statusModal.close();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
      if (this.eventObj.contacts.email && !this.validateEmail(this.eventObj.contacts.email)) {
        this.toEventEmail();
      }
    },
    unpublish() {
      this.unpublishEvent({
        id: this.eventObj.id,
        callback: (response) => {
          this.eventObj.status = 'draft';
          this.saveEventClick()
        }
      })
    },
    publishClick() {
      this.publishEvent({
        id: this.eventObj.id,
        callback: (response) => {
          this.saveEventClick(() => {
            this.status_modal_step = 2;
          })

          this.eventObj.status = 'active';
        }
      })
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    saveEventClick(glCallback) {
      if (this.dateLeft == 'Past') {
        return false;
      }
      if (!this.checkValidation()) {
        return false;
      }
      this.preload = true;
      if (!this.eventBranding.templateCover.cropped) {
        this.eventBranding.templateCover.new = [];
      }

      let event = Object.assign({}, this.eventObj);

      event.timezone = event.timezone.value;
      event.category = event.category.value;

      event.userfields = [];
      this.customFields.forEach(field => {
        if (field.value) {
          event.userfields.push(field.fieldname);
        }
      })

      let colorTagExist = false;
      let showVisitorsTagExist = false;
      if (event.tags.length) {
        event.tags.forEach((tag, index, arr) => {
          let tagarr = tag.split(':');
          if (tagarr[0] == 'category') {
            arr[index] = 'category:' + event.category;
          }
          if ((tag == 'is:featured' && !event.featured) ||
            (tagarr[0] == 'lang' && !event.langs.includes(tagarr[1]))) {
            arr.splice(index, 1);
          }
          if (tagarr[0] == 'color' && event.colorSelected) {
            colorTagExist = true;
            arr[index] = 'color:' + event.color;
          }
          if (tagarr[0] == 'show_visitors') {
            showVisitorsTagExist = true;
            arr[index] = 'show_visitors:' + (event.showVisitorsCounter ? event.showVisitorsCounter : '');
          }


          if (tagarr[0] == 'tag') {
            arr.splice(index, 1);
          }

        });
      }

      if (!colorTagExist) {
        event.tags.push('color:' + event.color);
      }

      if (!showVisitorsTagExist) {
        event.tags.push('show_visitors:' + (event.showVisitorsCounter ? event.showVisitorsCounter : ''));
      }

      if (event.featured && !event.tags.includes('is:featured')) {
        event.tags.push('is:featured');
      }


      event.langs.forEach(item => {
        if (!event.tags.includes('lang:' + item)) {
          event.tags.push('lang:' + item.value);
        }
      });

      if (event.tagsList && event.tagsList.length) {
        event.tagsList.forEach(tag => {
          event.tags.push('tag:' + tag.text);
        })

      }

      let newStrings = [];
      let oldStrings = [];

      if (event.description_short) {

        if (this.evtStringsExist.description_short) {
          oldStrings.push({
            id: this.evtStringsExist.description_short,
            category: 'description_short',
            value: event.description_short
          });
        } else {
          newStrings.push({
            category: 'description_short',
            value: event.description_short
          });
        }

      }

      if (event.name) {

        if (this.evtStringsExist.name) {
          oldStrings.push({
            id: this.evtStringsExist.name,
            category: 'name',
            value: event.name
          });
        } else {
          newStrings.push({
            category: 'name',
            value: event.name
          });
        }

      }

      if (event.description_long) {

        if (this.evtStringsExist.description_long) {
          oldStrings.push({
            id: this.evtStringsExist.description_long,
            category: 'description_long',
            value: event.description_long
          });
        } else {
          newStrings.push({
            category: 'description_long',
            value: event.description_long
          });
        }

      }

      const sortedDays = this.evtDayList.sort((a, b) => {
        const dateStartA = a.dateStart || a.oldvalStart;
        const dateStartB = b.dateStart || b.oldvalStart;
        return (dateStartA > dateStartB) ? 1 : ((dateStartB > dateStartA) ? -1 : 0);
      });
      const eventStart = sortedDays[0].dateStart || sortedDays[0].oldvalStart;
      const eventEnd = sortedDays[sortedDays.length - 1].dateEnd || sortedDays[sortedDays.length - 1].oldvalEnd;

      if (eventStart && eventEnd) {
        event.dateStart = eventStart;
        event.dateEnd = eventEnd;
      }
      this.prepareAgendaStrings();
      this.preparePricingStrings();
      this.prepareCollectionsToSave();
      this.prepareFileStrings();
      this.$store.commit('setAgendaData', this.agenda.sessions)
      this.eventObj.saveAgenda = true;

      if (this.productsToUpdate.some(obj => obj.tags.includes('type:sponsor'))) {
        this.productsToUpdate = this.productsToUpdate.map(pr => {
          if(pr.tags.includes('type:sponsor')){
            pr.tags = ['type:sponsor'],
              pr.tagsList.map(tag => pr.tags.push(tag.text))
            return pr
          }
          return pr
        });
      }

      const pricing = {};
      Object.keys(this.tickets).forEach(tiketType => {
        pricing[tiketType] = this.tickets[tiketType]?.map(el=>{
          const res = {...el};
          if (!!res['expirationDuration'] && res['expirationType']['value'] !== expirationOptions.NONE) {
            const type = (res['expirationType']['value'] || '').slice(0,1).toLowerCase();
            const duration = res['expirationDuration'] || 0;
            res['expiration'] = type && duration ? `${duration}${type}` : '';
          }else{
            res['expiration'] = '';
          }

          delete res['expirationDuration'];
          delete res['expirationType'];

          return res;
        })
      });

      this.updateEvent({
        event: event,
        newStrings: newStrings,
        oldStrings: oldStrings,
        downloadables: this.evtDownloadables,
        eventBranding: this.eventBranding,
        evtDayList: this.evtDayList,
        agenda: this.eventObj.saveAgenda ? [this.agenda] : [{
          sessions: [],
          toDelete: {}
        }],
        collections: this.collections,
        products: this.productsToUpdate,
        pricing: pricing,
        callback: (response) => {
          this.eventObj = {
            id: '',
            name: '',
            description_short: '',
            description_long: '',
            company: 0,
            dateEnd: '',
            dateStart: '',
            category: '',
            color: '#E5843D',
            colorSelected: false,
            tag: '',
            tags: [],
            langs: [],
            offline: false,
            online: true,
            address: '',
            timezone: '',
            status: '',
            featured: false,
            tagsList: [],
          };

          this.evtStringsExist = {};

          this.evtDownloadables = {
            exist: {},
            new: [],
            maps: {},
          };

          this.eventBranding = {
            templateCover: {
              new: [],
              url: '',
              cropped: false,
            },
            templateBanner: {
              new: [],
              url: '',
            },
            logo: {
              new: [],
              url: '',
            },
            mainContent: {
              new: [],
              url: '',
            },
            mainCarousel: {
              new: [
                {
                  image: [],
                  preview_url: false,
                  index: 0,
                },
                {
                  image: [],
                  preview_url: false,
                  index: 1,
                },
                {
                  image: [],
                  preview_url: false,
                  index: 2,
                }
              ],
              exist: {},
              todelete: [],
            },
            exist: [],
            new: [],
            maps: {},
            carouselArr: [],
            fullCarouselArr: [],
          };

          this.evtDayList = [];

          this.evtItemDate = null;
          this.agenda = {
            sessions: [],
            toDelete: {}
          };

          this.tickets = {
            list: [],
            exist: null,
            toDelete: [],
          };
          this.collections.save = [];
          this.collections.delete = [];
          this.productsToUpdate = [];

          let payload = {
            newLength : 0,
            total : false
          };
          this.resetChanges();

          this.categoriesList = [];
          this.timeZoneList = [];
          this.langList = [];
          this.catsLoaded = false;
          this.$store.commit('resetEditedHint');
          setTimeout(() => {
            if (['agenda', 'products', 'collections'].includes(this.selectedMenu.value)) {
              this.selectedMenu.value = 'customize';
            }
            this.getFormattedEvent(this.$route.params.id, () => {

              let cat_answ = [];
              this.getCategories()
                .then(response => {
                  if (response.data && response.data.body && response.data.body.length) {
                    for (var i = 0; i < response.data.body.length; i++) {
                      cat_answ[i] = {
                        label: response.data.body[i].value,
                        value: response.data.body[i].id
                      };

                      if (this.eventObj.category == cat_answ[i].value) {
                        this.eventObj.category = cat_answ[i];
                        this.catsLoaded = true;
                      }

                    }
                    this.categoriesList = cat_answ;
                  }
                })
                .catch(error => console.log(error));

              let timzone_answ = [];

              this.getTimezones()
                .then(response => {

                  if (response.data && response.data.body && response.data.body.length) {
                    for (var i = 0; i < response.data.body.length; i++) {
                      timzone_answ[i] = {
                        label: response.data.body[i].value,
                        value: response.data.body[i].id
                      };
                      if (this.eventObj.timezone == timzone_answ[i].value) {
                        this.eventObj.timezone = timzone_answ[i];
                      }
                    }
                    this.timeZoneList = timzone_answ;
                  }
                })
                .catch(error => console.log(error));

              this.getLanguages(response => {
                if (response.data.statusCode == 200) {
                  response.data.body.forEach(item => {
                    this.langList.push({
                      label: item.value,
                      value: item.id
                    });
                  })
                }
              });
              if (this.$store.getters.getAgendaError) {
                this.agenda.sessions = this.$store.getters.getAgendaData;
                this.agenda.sessions.map(item => {
                  if (item.sessionTitle == this.$store.getters.getAgendaName) {
                    item.DoesntSave = true;
                  }
                })
                this.$router.push({name: 'priceTypes', params: {id: this.$route.params.id, tabId: 'agenda'}});
                this.selectedMenu.value = 'agenda';
              }
              this.selectedMenu.value = this.$route.params.tabId;
              this.preload = false;
              this.disable_preview = false;
              if (glCallback) {
                glCallback();
              }

            });
          }, 3000);

        }
      });

    },

    prepareAgendaStrings() {

      this.agenda.sessions.forEach(item => {
        let newStrings = [];
        let oldStrings = [];

        if (item.sessionTitle) {

          if (item.stringExist && item.stringExist.name) {
            oldStrings.push({
              id: item.stringExist.name,
              category: 'name',
              value: item.sessionTitle
            });
          } else {
            newStrings.push({
              category: 'name',
              value: item.sessionTitle
            });
          }

        }

        if (item.format) {

          if (item.stringExist && item.stringExist.description_short) {
            oldStrings.push({
              id: item.stringExist.description_short,
              category: 'description_short',
              value: item.format
            });
          } else {
            newStrings.push({
              category: 'description_short',
              value: item.format
            });
          }

        }

        if (item.description) {

          if (item.stringExist && item.stringExist.description_long) {
            oldStrings.push({
              id: item.stringExist.description_long,
              category: 'description_long',
              value: item.description
            });
          } else {
            newStrings.push({
              category: 'description_long',
              value: item.description
            });
          }

        }

        item.newStrings = newStrings;
        item.oldStrings = oldStrings;

      })
    },

    preparePricingStrings() {
      let list = this.tickets.list;
      let all = list.concat(this.tickets.exist);
      this.tickets.list.forEach(item => {
        let newStrings = [];

        if (item.name) {
          newStrings.push({
            category: 'name',
            value: item.name
          });
        }

        if (item.description_long) {
          newStrings.push({
            category: 'description_long',
            value: item.description_long
          });
        }

        if (item.email_content) {
          newStrings.push({
            category: 'email_content',
            value: item.email_content
          });
        }

        item.newStrings = newStrings;

      })

      if (this.tickets.exist && this.tickets.exist.length) {

        this.tickets.exist.forEach(item => {
          let newStrings = [];
          let oldStrings = [];

          if (item.name) {

            if (item.stringExist && item.stringExist.name) {
              oldStrings.push({
                id: item.stringExist.name,
                category: 'name',
                value: item.name
              });
            } else {
              newStrings.push({
                category: 'name',
                value: item.name
              });
            }

          }

          if (item.description_long) {

            if (item.stringExist && item.stringExist.description_long) {
              oldStrings.push({
                id: item.stringExist.description_long,
                category: 'description_long',
                value: item.description_long
              });
            } else {
              newStrings.push({
                category: 'description_long',
                value: item.description_long
              });
            }

          }

          if (item.email_content) {

            if (item.stringExist && item.stringExist.email_content) {
              oldStrings.push({
                id: item.stringExist.email_content,
                category: 'email_content',
                value: item.email_content
              });
            } else {
              newStrings.push({
                category: 'email_content',
                value: item.email_content
              });
            }

          }

          item.newStrings = newStrings;
          item.oldStrings = oldStrings;

        })
      }

    },
    prepareFileStrings() {
      this.evtDownloadables.new.forEach(item => {
        const strings = [];

        if (item.filmCast) {
          strings.push({
            category: 'description_short',
            value: item.filmCast
          });
        }

        if (item.filmLink) {
          strings.push({
            category: 'email_content',
            value: item.filmLink
          });
        }

        if (item.details) {
          strings.push({
            category: 'about',
            value: item.details
          });
        }

        if (item.releaseDate) {
          strings.push({
            category: 'date',
            value: item.releaseDate
          });
        }

        item.newStrings = strings;
      });

      this.productsToUpdate.forEach(item => {

        const newStrings = [];
        const oldStrings = [];

        if (item.name) {
          const name = item.strings ? item.strings.find(string => string.category === 'name') : null;
          if (name) {
            oldStrings.push({
              id: name.id,
              category: 'name',
              value: item.name
            });
          } else {
            newStrings.push({
              category: 'name',
              value: item.name
            });
          }
        }

        if (item.description) {
          const filmCast = item.strings ? item.strings.find(string => string.category === 'description_long') : null;
          if (filmCast) {
            oldStrings.push({
              id: filmCast.id,
              category: 'description_long',
              value: item.description
            });
          } else {
            newStrings.push({
              category: 'description_long',
              value: item.description
            });
          }
        }

        if (item.filmCast) {
          const name = item.strings ? item.strings.find(string => string.category === 'description_short') : null;
          if (name) {
            oldStrings.push({
              id: name.id,
              category: 'description_short',
              value: item.filmCast
            });
          } else {
            newStrings.push({
              category: 'description_short',
              value: item.filmCast
            });
          }
        }

        if (item.filmLink) {
          const filmLink = item.strings ? item.strings.find(string => string.category === 'email_content') : null;
          if (filmLink) {
            oldStrings.push({
              id: filmLink.id,
              category: 'email_content',
              value: item.filmLink
            });
          } else {
            newStrings.push({
              category: 'email_content',
              value: item.filmLink
            });
          }
        }

        if (item.details) {
          const details = item.strings ? item.strings.find(string => string.category === 'about') : null;
          if (details) {
            oldStrings.push({
              id: details.id,
              category: 'about',
              value: item.details
            });
          } else {
            newStrings.push({
              category: 'about',
              value: item.details
            });
          }
        }

        if (item.releaseDate) {
          const releaseDate = item.strings ? item.strings.find(string => string.category === 'date') : null;
          if (releaseDate) {
            oldStrings.push({
              id: releaseDate.id,
              category: 'date',
              value: item.releaseDate
            });
          } else {
            newStrings.push({
              category: 'date',
              value: item.releaseDate
            });
          }
        }

        item.newStrings = newStrings;
        item.oldStrings = oldStrings;

        if (item.newTags?.length) {
          item.tags = item.newTags.map(tag => tag.text || tag);
          item.tags.push('type:product');
        }
      });
    },
    prepareCollectionsToSave() {
      this.collections.save.forEach(item => {
        const newStrings = [];
        const oldStrings = [];

        if (item.name) {
          const name = item.strings ? item.strings.find(string => string.category === 'name') : null;
          if (name) {
            oldStrings.push({
              id: name.id,
              category: 'name',
              value: item.name
            });
          } else {
            newStrings.push({
              category: 'name',
              value: item.name
            });
          }
        }

        if (item.description) {
          const description = item.strings ? item.strings.find(string => string.category === 'description_long') : null;
          if (name) {
            oldStrings.push({
              id: name.id,
              category: 'description_long',
              value: item.description
            });
          } else {
            newStrings.push({
              category: 'description_long',
              value: item.description
            });
          }
        }

        // old and new localization strings to server
        item.newStrings = newStrings;
        item.oldStrings = oldStrings;

        // prepare collection tags
        item.tags = item.tagsList.map(tag => tag.text);
        item.priceTags?.forEach(tag => {
          if (tag.selected) {
            item.tags.push(tag.value);
          }
        });

        item.customName = item.customNameWanted || item.customName.indexOf('-gen') > -1 ? item.customName : '';
      });
    },
    userCan(grant) {
      return this.eventObj.grants ? this.eventObj.grants.includes(grant) : false;
    },
    collectionsUpdated(collections) {
      this.collections.save = collections.save.filter(item => item.new || item.edited);
      this.collections.delete = collections.delete;
    },
    productsUpdated(products) {
      products.forEach(pr => { if(!this.productsToUpdate.some(upd => upd.id === pr.id)) this.productsToUpdate.push(pr)  })
    },
  },
  computed: {
    ...mapGetters(['getAddedNotSaved','getEditedNotSaved','getRemovedNotSaved']),
    countAdded() {
      return this.addedCollections + this.addedDownload + this.$store.getters.getAddedAgenda + this.addedTicket ;
    },
    countEdited() {
      return this.editedCollections + this.editedDownload + this.$store.getters.getEditedAgenda + this.$store.getters.getEditedTicket + this.difCustomFields;
    },
    countDeleted() {
      return this.removedCollections + this.$store.getters.getRemovedDown + this.$store.getters.getRemovedAgenda + this.$store.getters.getRemovedSponsor;
    },
    status() {
      return this.eventObj.status;
    },
    userAccessToEditPage() {
      return this.userCan('event-edit') ||
        this.userCan('event-manage-news') ||
        this.userCan('event-manage-staff') ||
        this.userCan('event-manage-money') ||
        this.userCan('event-invite-stand')
    },
    dateLeft() {
      return func.dateLeft(this.eventObj);
    },
    ...mapGetters([
      'getLocale',
      'getAuthUser',
      'getSignedIn',
      'tr',
      'routes',
      'configs'
    ]),
  },
}
