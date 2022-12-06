import Details from './Details/Details.vue'
import MainPage from '@/components/SettingsComponents/MainPage/MainPage.vue'
import Downloadables from '@/components/SettingsComponents/Downloadables/Downloadables.vue'
import Personnel from '@/components/SettingsComponents/Personnel/Personnel.vue'
import Agenda from '@/components/SettingsComponents/Agenda/Agenda.vue'
import Collections from '@/pages/EditEvent/sections/SetupEvent/Collections/Collections.vue'

import {mapActions, mapGetters} from 'vuex'

export default {
  name: 'SetupStand',
  props: {
    downloadables: Object,
    standObj: Object,
    eventObj: Object,
    standBranding: Object,
    agenda: Object,
    evtDayList: Array,
    imagePlaceholders: Object,
    selectedMenu: Object,
    preload: Boolean,
  },
  components: {
    Details,
    MainPage,
    Downloadables,
    Personnel,
    Agenda,
    Collections,
  },
  data: () => ({
    productsToUpdate: [],
  }),
  mounted() {
    if(this.$route.params.name == 'agenda') {
      setTimeout(() => {this.getSelectedMenu()},1500);
    } else this.getSelectedMenu();

  },
  methods: {
    goActiveEvent() {
      this.$router.push({ path: '/edit-event/'+this.eventObj.id});
    },
    getSelectedMenu() {
      if(this.$route.params.name) this.selectedMenu.value = this.$route.params.name;
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
    test() {
      console.log(this.standObj);
    },
    userCan(grant) {
      return this.standObj.grants ? this.standObj.grants.includes(grant) : false;
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
    ]),
    downloadablesArray() {
      return Object.values(this.downloadables.exist);
    },

  }
}
