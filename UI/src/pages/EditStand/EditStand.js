import SetupStand from './sections/SetupStand/SetupStand.vue'
import { AmplifyEventBus } from 'aws-amplify-vue';
import { ToggleButton } from 'vue-js-toggle-button'

import func from '@/others/functions.js';

import standMixin from '../../mixins/stand.js';
import eventMixin from '../../mixins/event/event.js';
import keenui from '@/plugins/keenUi';

import { mapActions, mapGetters } from 'vuex';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "editstand" */ '@/../locales/edit_stand/'+lang+'.json')
};

export default {
  name: 'EditStand',
  mixins: [standMixin, eventMixin],
  components: {
  	SetupStand,
    ToggleButton,
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('edst_edit_stand')+' - '+this.standObj.name : 'Edit stand',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('edst_edit_stand')+' - '+this.standObj.description_short : 'Edit stand' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('edst_edit_stand')+' - '+this.standObj.name : 'Edit stand' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('edst_edit_stand')+' - '+this.standObj.description_short : 'Edit stand' },
      ],
    }
  },
  mounted() {
    if (this.$route.params.id) {
      this.getFormattedStand(this.$route.params.id, (res) => {
        this.standObj.mainContent = '';
        this.standObj.edit_status = false;
        this.getFormattedEvent(this.standObj.eventId);
      });

      this.page_status = 'exist_stand'
    }
    this.preload = true;
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });


    setTimeout(() => {this.preload = false},5500)
  },

  created(){
      this.addedCollections = 0;
      this.editedCollections = 0;
      this.removedCollections = 0;
      this.addedDownload = 0;
      this.editedDownload = 0;
      this.removedDownload = 0;


    this.findUser();
    AmplifyEventBus.$on('authState', info => {
      if(info === "signedIn") {
        this.findUser();
      } else {
        this.$store.state.signedIn = false;
        this.$store.state.user = null;
      }
    });
  },
  data: function () {
    return {
      selectedMenu: {
        value: 'details'
      },
      localesLoaded: false,
      modalMsg: '',
      modalTitle: '',
      page_status: 'new_stand',
      preload: true,
      disable_preview: false,
      imagePlaceholders: {
        logo_preview_url: false,
        stand_banner_preview_url: false,
        stand_main_preview_url: false,
        carousel_previews: {
          count: 0,
        },
      },
      collections: {
        save: [],
        delete: [],
      },
      productsToUpdate: [],

      addedCollections: 0,
      editedCollections: 0,
      removedCollections: 0,
      addedDownload: 0,
      editedDownload: 0,
      removedDownload: 0,
    }
  },
  watch: {
    /* control collection changes count */
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

    /* control downloadables and products changes count */
    'standDownloadables.new': function (newVal) {
      this.addedDownload = newVal.length;
    },

    'productsToUpdate': function (newVal) {
      this.editedDownload = newVal.length;
    },
  },
  methods: {

    ...mapActions([
      'findUser',
      'createStand',
      'updateStand',
    ]),
    productsUpdated(products) {
      this.productsToUpdate = [...products];
    },
    backClick() {
      if (this.disable_preview) {
        this.$refs.leavePageModal.open();
      } else {
        this.leavePageAction();
      }
    },
    leavePageAction() {
      this.$router.push('/'+this.routes.mystands);
    },
    leavePageModalClose() {
      this.$refs.leavePageModal.close();
    },
    loadPageListeners() {
      const pageElem = document.querySelector('#edit_stand_page');
      if (pageElem) {
        pageElem.addEventListener("input", () => {
          this.disable_preview = true;
        });
        pageElem.addEventListener("change", () => {
            this.disable_preview = true;
        });
        pageElem.addEventListener("select", () => {
            this.disable_preview = true;
        });
      }
    },
    statusToggleChange(evt) {
      this.standObj.status = this.standObj.status == 'draft' ? 'published' : 'draft';
      this.saveStandClick();
    },
    checkValidation() {
      const errorsArr = [];

      if (!this.standObj.name) {
        errorsArr.push(this.tr('edst_valid_details')+': '+this.tr('edst_valid_name_req'));
      }

      if (this.standObj.name.length > 100) {
        errorsArr.push(this.tr('edst_valid_details')+': '+this.tr('edst_valid_name_length'));
      }

      if (/[<>;{}$]/.test(this.standObj.name)) {
        errorsArr.push(this.tr('edst_valid_details')+': '+this.tr('edst_valid_name_chars'));
      }

      if (this.standObj.description_short.length > 120) {
        errorsArr.push(this.tr('edst_valid_details')+': '+this.tr('edst_valid_description_length'));
      }


      if (this.standObj.description_long.length > 4000) {
        errorsArr.push(this.tr('edst_valid_mainpage')+': '+this.tr('edst_valid_maintext_length'));
      }

      if (this.standObj.contacts.email && !this.validateEmail(this.standObj.contacts.email)) {
        errorsArr.push(this.tr('edst_valid_email_incorrect'));
      }


      if (!errorsArr.length) {
        return true;
      } else {
        this.openModal(errorsArr);
        return false;
      }
    },
    validateEmail(email) {
      return func.validateEmail(email);
    },
    openModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageModal.open();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
    },
    saveStandClick() {

      if (!this.checkValidation()) {
        return false;
      }
      this.preload = true;
      this.standObj.language = this.getLocale;

      let newStrings = [];
      let oldStrings = [];

      let colorTagExist = false;
      if (this.standObj.tags.length) {
        this.standObj.tags.forEach( (tag, index, arr) => {
          let tagarr = tag.split(':');
          if( (tag == 'is:featured' && !this.standObj.featured) ) {
            arr.splice(index, 1);
          }
          if (tagarr[0] == 'color' && this.standObj.colorSelected) {
            colorTagExist = true;
            arr[index] = 'color:'+this.standObj.color;
          }
          if (tagarr[0] == 'tag') {
            arr.splice(index, 1);
          }

        });
      }

      if (!colorTagExist) {
        this.standObj.tags.push('color:'+this.standObj.color);
      }

      if ( this.standObj.featured && !this.standObj.tags.includes('is:featured') ) {
         this.standObj.tags.push('is:featured');
      }

      if (this.standObj.tagsList && this.standObj.tagsList.length) {
        this.standObj.tagsList.forEach(tag => {
          this.standObj.tags.push('tag:'+tag.text);
        })

      }

      if ( this.standObj.name ) {

        if (this.standStringsExist.name) {
          oldStrings.push({
            id: this.standStringsExist.name,
            category: 'name',
            value: this.standObj.name
          });
        } else {
          newStrings.push({
            category: 'name',
            value: this.standObj.name
          });
        }

      }

      if ( this.standObj.description_short ) {

        if (this.standStringsExist.description_short) {
          oldStrings.push({
            id: this.standStringsExist.description_short,
            category: 'description_short',
            value: this.standObj.description_short
          });
        } else {
          newStrings.push({
            category: 'description_short',
            value: this.standObj.description_short
          });
        }

      }

      if ( this.standObj.description_long ) {

        if (this.standStringsExist.description_long) {
          oldStrings.push({
            id: this.standStringsExist.description_long,
            category: 'description_long',
            value: this.standObj.description_long
          });
        } else {
          newStrings.push({
            category: 'description_long',
            value: this.standObj.description_long
          });
        }

      }

      this.prepareAgendaStrings();
      this.prepareCollectionsToSave();
      this.prepareFileStrings();

      this.updateStand({
        body: this.standObj,
        newStrings: newStrings,
        oldStrings: oldStrings,
        mainImage: this.standDownloadables.main_image,
        downloadables: this.standDownloadables,
        standBranding: this.standBranding,
        agenda: this.standObj.saveAgenda ? [this.standAgenda] : [{
                                                            sessions: [],
                                                            toDelete: {}
                                                          }],
        collections: this.collections,
        products: this.productsToUpdate,
        callback: (response) => {
          this.standObj = {
            name: '',
            company: null,
            description_short: '',
            description_long: '',
            about: '',
            description: '',
            color: '#E5843D',
            colorSelected: false,
            language: '',
            ownerId: null,
            event: 24,
            tag: '',
            tags: [],
            status: 'draft',
            featured: false,
            tagsList: [],
          };

          this.$store.commit('setEditedAgenda',0);
          this.$store.commit('setNewAddedAgenda',0);
          this.$store.commit('setRemoveAgenda',0);
          this.addedCollections = 0;
          this.editedCollections = 0;
          this.removedCollections = 0;
          this.addedDownload = 0;
          this.editedDownload = 0;
          this.removedDownload = 0;

          this.standStringsExist = {};

          this.standDownloadables = {
            exist: [],
            new: []
          };
          this.standBranding = {
            templateCover: {
              new: [],
              url: '',
              cropped: false,
            },
            logo: {
              new: [],
              url: '',
              cropped: false,
            },
            templateBanner: {
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
            new:[],
            maps: {},
            carouselArr: [],
            fullCarouselArr: [],
          };

          this.standAgenda = {
            sessions: [],
            toDelete: {}
          };

          this.collections.save = [];
          this.collections.delete = [];
          let payload = {
            newLength : 0,
            total : false
          };
          this.$store.commit('setNewAdded',payload);
          this.$store.commit('setEditedVal',payload);
          this.$store.commit('setRemoveVal',payload);

          setTimeout(() => {

            this.getFormattedStand(this.$route.params.id, (res) => {

              this.preload = false;
              this.disable_preview = false;
              this.standObj.edit_status = false;
              this.standObj.mainContent = '';

            });

          }, 3000);
        }
      });
    },

    prepareAgendaStrings() {
      this.standAgenda.sessions.forEach(item => {
        let newStrings = [];
        let oldStrings = [];

        if ( item.sessionTitle ) {

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

        if ( item.format ) {

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

        if ( item.description ) {

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
    prepareFileStrings() {
      this.standDownloadables.new.forEach(item => {
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

        // get just and ids of selected content
        if(item.content && item.content.isArray) item.content = item.content.filter(subject => subject.selected).map(subject => subject.id);
        // prepare collection tags
        item.tags = item.tagsList.map(tag => tag.text);
        item.priceTags?.forEach(tag => {
          if (tag.selected) {
            item.tags.push(tag.value);
          }
        });
      });
    },
    userCan(grant) {
      return this.standObj.grants ? this.standObj.grants.includes(grant) : false;
    },
    collectionsUpdated(collections) {
      this.collections.save = collections.save.filter(item => item.new || item.edited);
      this.collections.delete = collections.delete;
    },
  },
  computed: {
    ...mapGetters(['getAddedNotSaved','getEditedNotSaved','getRemovedNotSaved']),
    countAdded() {
      return this.addedCollections + this.addedDownload + this.$store.getters.getAddedAgenda;
    },
    countEdited() {
      return this.editedCollections + this.editedDownload + this.$store.getters.getEditedAgenda;
    },
    countDeleted() {
      return this.removedCollections + this.$store.getters.getRemovedDown + this.$store.getters.getRemovedAgenda;
    },
    status() {
      return this.standObj.status;
    },
    userAccessToEditPage() {
      return this.userCan('stand-edit') ||
            this.userCan('stand-manage-staff')
    },
    ...mapGetters([
      'getLocale',
      'getAuthUser',
      'getSignedIn',
      'tr',
      'routes',
    ])
  },
}
