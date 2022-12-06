import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js'

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'CustomizeTabs',
  props: {
    eventObj: Object,
  },
  components: {

  },
  created() {
    if (this.eventObj.theme) {
      this.themeList.forEach(item => {
        if (item.value == this.eventObj.theme) {
          this.theme = item;
        }
      });
    }

    if (this.eventObj.hidden) {
      this.tabsList.forEach(tab => {
        if (this.eventObj.hidden.includes(tab.id)) {
          tab.hidden = true;
        }
      })
    }

    this.$forceUpdate();
  },
  data: function () {
    return {
      toggle: false,
      
      themeList: [
        {
          value: 'default',
          label: 'Default',
        },
        {
          value: 'filmfestival',
          label: 'Film Festival',
        },
        {
          value: 'concert',
          label: 'Concert',
        },
        {
          value: 'webinar',
          label: 'Webinar',
        },
        {
          value: 'conference',
          label: 'Conference',
        }
      ],
      theme: {
        value: 'default',
        label: 'Default',
      },
      tabsList: [
        {
          id: 'stream',
          hidden: false,
        },
        {
          id: 'articles',
          hidden: false,
        },
        {
          id: 'downloads',
          hidden: false,
        },
        {
          id: 'tickets',
          hidden: false,
          disableHide: true,
        },
        {
          id: 'staff',
          hidden: false,
        },
        {
          id: 'about',
          hidden: false,
        },
        {
          id: 'sponsors',
          hidden: false,
        },
        {
          id: 'agenda',
          hidden: false,
        },
        {
          id: 'collections',
          hidden: false,
        }
      ],
    }
  },

  methods: {
    ...mapActions([
      'getTimezones',
    ]),
    selectTheme() {
      this.eventObj.theme = this.theme.value;
    },
    hiddenClick() {
      this.eventObj.hidden = [];
      this.tabsList.forEach(item => {
        if (item.hidden) {
          this.eventObj.hidden.push(item.id);
        }
      })
      this.$forceUpdate();
    }
  },
  computed: {
     ...mapGetters([
      'tr',
    ]),
  }
}
