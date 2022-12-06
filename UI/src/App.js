import Header from './components/Header/Header.vue'
import Footer from './components/Footer/Footer.vue'
import ErrorNotification from './components/ErrorNotification/ErrorNotification.vue';
import func from '@/others/functions.js';
import { Auth } from 'aws-amplify'
import { components } from 'aws-amplify-vue'
import { I18n } from 'aws-amplify';
import { mapGetters, mapState } from 'vuex'

const host = window.location.hostname.replace('www.', '');
let meta = [
  { name: 'description', property: 'description', content: 'Our platform allows to host an online event, conference or a festival. We allow event organisers, visitors, exhibitors and sponsors to interact and network in the most fun and easy way.' },
  { name: 'og:title', property: 'og:title', content: 'Welcome to openexpo' },
  { name: 'og:description', property: 'og:description', content: 'Our platform allows to host an online event, conference or a festival. We allow event organisers, visitors, exhibitors and sponsors to interact and network in the most fun and easy way.' },
];
if (host.startsWith('dev.')) {
  meta = [
    { name: 'robots', content: 'noindex' },
    { name: 'description', property: 'description', content: 'Welcome to openexpo' },
    { name: 'og:title', property: 'og:title', content: 'Openexpo' },
    { name: 'og:description', property: 'og:description', content: 'Welcome to Openexpo' },
  ];
}


const dict = {
  importLang: (lang) => import('@/../locales/'+lang+'.json')
};

export default {
  name: 'App',
  metaInfo() {
    return {
      title: "Welcome to Openexpo",
      titleTemplate: "%s  | Openexpo Platform",
      meta: meta,
    }

  },
  components: {
    Header,
    Footer,
    Auth,
    ErrorNotification,
    ...components
  },
  created() {
    func.setDictionary(dict, () => {
      this.globalLocalesLoaded = true;
      this.$forceUpdate();
    });
  },
  mounted() {
    this.$intercom.update({ vertical_padding: 55 });
    let amplifyInfo = {
      aws_user_pools_id: this.configs.amplify.aws_user_pools_id,
      aws_user_pools_web_client_id: this.configs.amplify.aws_user_pools_web_client_id
    };
    this.$store.commit('setAmplifyInfo',amplifyInfo);

  },
  data: function () {
    return {
      isLoggedInG: true,
      customHeader: false,
      globalLocalesLoaded: false,
      changedLogo: null,
      logoEventId: null,
      logoType: 'event',
      headerType: 'default',
      headerTypeData: {},
      agenda: [],
      eventObj: null,
      promoLink: '',
      keyIndex: 0,
      pageType: false,
      pageId: false,
      pageName: false,
    }
  },
  methods: {
    setPageType(obj) {
      this.pageType = obj.type;
      this.pageId = obj.id;
      this.pageName = obj.name;
    },
    changeEventTab(tab) {
      this.$refs.mainRouterView.tabClick(tab);
    },
    agendaLoadedAction(data) {
      this.agenda = data.agenda;
      this.eventObj = data.eventObj;
      this.promoLink = data.promoLink;
      this.$refs.headerComponent.showVideo(data.agenda, data.eventObj, data.promoLink);
      this.$forceUpdate();
    },
    changeLogo(logoUrl, type, eventId) {
      this.changedLogo = logoUrl;
      this.logoType = type ? type : 'event';
      this.logoEventId = eventId;
    },
    setVisitorUi(eventObj) {
      this.headerType = 'event_visitor';
      this.headerTypeData = eventObj;
      // this.keyIndex++;
      this.$forceUpdate();
    }
  },
  watch : {
    getLogo (newValue) {
        this.changedLogo = newValue
    }
  },
  computed: {
    ...mapGetters([
      'getLocale',
      'configs',
      'getLogo'
    ]),
    ...mapState([
      'apiError'
    ]),
    errorNotificationsEnabled() {
      return this.configs.features.errors_notification || this.$route.query.troubleshoot;
    }
  }
}
