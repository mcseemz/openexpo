import Customize from './Customize/Customize.vue'
import CustomizeTabs from './CustomizeTabs/CustomizeTabs.vue'
import MainPage from '@/components/SettingsComponents/MainPage/MainPage.vue'
import ContactInfo from './ContactInfo/ContactInfo.vue'
import PrivacySettings from './PrivacySettings/PrivacySettings.vue'
import Tickets from './Tickets/Tickets.vue'
import Downloadables from '@/components/SettingsComponents/Downloadables/Downloadables.vue'
import Personnel from '@/components/SettingsComponents/Personnel/Personnel.vue'
import Visitors from './Visitors/Visitors.vue';
import CustomUserFields from './CustomUserFields/CustomUserFields.vue';
import Invitations from './Invitations/Invitations.vue'
import BasicInformation from './BasicInformation/BasicInformation.vue'
import Agenda from '@/components/SettingsComponents/Agenda/Agenda.vue'
import Stands from './Stands/Stands.vue';
import Articles from './Articles/Articles.vue';
import ArticlesList from './ArticlesList/ArticlesList.vue';
import Tiers from './Tiers/Tiers.vue';
import SponsorsCustom from './SponsorsCustom/SponsorCustom.vue';
import SponsorsReport from './SponsorsReport/SponsorsReport.vue';
import Collections from './Collections/Collections.vue';
import Announcement from './Announcement/Announcement.vue'

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'SetupEvent',
  props: {
    currentStep: Number,
    eventObj: Object,
    evtDownloadables: Object,
    categoriesList: Array,
    timeZoneList: Array,
    eventBranding: Object,
    dayList: Array,
    langList: Array,
    agenda: Object,
    tickets: Object,
    imagePlaceholders: Object,
    customNameAvaliable: Boolean,
    articleData: Object,
    selectedMenu: Object,
    customFields: Array,
  },
  components: {
    BasicInformation,

    Customize,
    MainPage,
    ContactInfo,
    PrivacySettings,
    CustomizeTabs,

    Tickets,
    Downloadables,
    Personnel,
    Visitors,
    CustomUserFields,
    Invitations,
    Stands,

    Agenda,
    Articles,
    ArticlesList,

    Tiers,
    SponsorsCustom,
    SponsorsReport,
    Collections,

    Announcement,

  },
  created() {
    window.addEventListener('scroll', (evt) => {
      if (window.scrollY > 120) {
        this.isScrolled = true;
      } else {
        this.isScrolled = false;
      }

      const anchors = document.querySelectorAll('.main_sections_anchor');

      if (anchors && anchors.length) {
        anchors.forEach(item => {
          const top = window.pageYOffset;
          const distance = top - item.offsetTop - item.closest('.main_sections_wrapper').offsetTop;
          const hash = item.getAttribute('id');

          if (distance < 30 && distance > -30 && this.selectedMenu.customizeAnchor != hash) {
            if (window.history.pushState) {
              window.history.pushState(null, null, '#'+hash);
            } else {
              window.location.hash = ('#'+hash);
            }
            this.selectedMenu.customizeAnchor = hash;
          }
        })
      }

    });
  },
  data: function () {
    return {
      isScrolled: false,
      downloadables: {
        files: [],
      },
    }
  },
  methods: {
    ...mapActions([
      'enableFeach'
    ]),
    changeDayList(val,id) {
      this.dayList.map( (item,i) => { if(item.id == id)  this.dayList[i].edtDateVal = val.edtDateVal } )
    },
    selectTab(name, anchor) {
      this.selectedMenu.value = name;
      if (anchor) {
        this.selectedMenu.customizeAnchor = anchor;
      }
      const splittedRoute = this.$route.path.split('/');
      const newPath = '/'+splittedRoute[1]+'/'+splittedRoute[2]+'/'+name;
      this.$router.replace(newPath).catch(err => {});
      this.$forceUpdate();
    },
    openCustomizeList() {
      this.selectTab('customize')
    },
    checkCustomName() {
      this.$emit('custom-name-change');
    },
    forceUpdate() {
      this.forceUpdate();
    },
    showErrorMessage(msg) {
      this.$emit('show_error_message', msg);
    },
    userCan(grant) {
      return this.eventObj.grants ? this.eventObj.grants.includes(grant) : [];
    },
    collectionsUpdated(collections) {
      this.$emit('collections-updated', collections);
    },
    productsUpdated(products) {
      this.$emit('products-updated', products);
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'features'
    ]),
    downloadablesArray() {
      return Object.values(this.evtDownloadables.exist);
    },
    pricingTags() {
      const allTags = this.tickets?.exist?.reduce( (start, ticket) => {
        const tags = ticket.tags.map(tag => {
          return {
            text: tag.replace('pricing:', ''),
            selected: false,
            value: tag,
          };
        });
        return ticket.is_enabled ? [...start, ...tags] : start;
      }, []);
      return  allTags?.filter((value, index, self) =>
        index === self.findIndex((t) => (
          t.value === value.value
        ))
      )

    },
  }

}
