import Vue from 'vue'
import Router from 'vue-router'
import VueMeta from 'vue-meta';
import func from '@/others/functions.js'
import Amplify, { Auth, Hub } from 'aws-amplify';
import configs from '../configs';
import * as AmazonCognitoIdentity from 'amazon-cognito-identity-js';

import VueIntercom from 'vue-intercom';

let intercomLoaded = false;
let intercomOpened = false;

const Home = () => import( /* webpackChunkName: "home" */ './pages/Home/Home.vue');
const Discover = () => import( /* webpackChunkName: "discover" */ './pages/Discover/Discover.vue');
const SingleEvent = () => import( /* webpackChunkName: "singleevent" */ './pages/SingleEvent/SingleEvent.vue');
const SingleArticle = () => import( /* webpackChunkName: "singlearticle" */ './pages/SingleArticle/SingleArticle.vue');
const Register = () => import( /* webpackChunkName: "register" */ './pages/Register/Register.vue');
const MyAccount = () => import( /* webpackChunkName: "myaccount" */ './pages/MyAccount/MyAccount.vue');
const MyCompany = () => import( /* webpackChunkName: "mycompany" */ './pages/MyCompany/MyCompany.vue');
const MyEvents = () => import( /* webpackChunkName: "myevents" */ './pages/MyEvents/MyEvents.vue');
const MyInvitations = () => import( /* webpackChunkName: "myinvitations" */ './pages/MyInvitations/MyInvitations.vue');
const MyEventsVisitors = () => import( /* webpackChunkName: "myevents" */ './pages/MyEvents/Visitors/Visitors.vue');
const MyEventsOrganizer = () => import( /* webpackChunkName: "myevents" */ './pages/MyEvents/Organizer/Organizer.vue');
const MyEventsStandOwner = () => import( /* webpackChunkName: "myevents" */ './pages/MyEvents/StandOwner/StandOwner.vue');
const MyStands = () => import( /* webpackChunkName: "mystands" */ './pages/MyStands/MyStands.vue');
const MyStandsVisitor = () => import( /* webpackChunkName: "mystands" */ './pages/MyStands/Visitor/Visitor.vue');
const MyStandsOwner = () => import( /* webpackChunkName: "mystands" */ './pages/MyStands/Owner/Owner.vue');
const MyChats = () => import( /* webpackChunkName: "mychats" */ './pages/MyChats/MyChats.vue');
const MyChatsVisitor = () => import( /* webpackChunkName: "mychats" */ './pages/MyChats/Visitor/Visitor.vue');
const MyChatsOwner = () => import( /* webpackChunkName: "mychats" */ './pages/MyChats/Owner/Owner.vue');
const MyChatsStandOwner = () => import( /* webpackChunkName: "mychats" */ './pages/MyChats/StandOwner/StandOwner.vue');
const MyMeetings = () => import( /* webpackChunkName: "mymeetings" */ './pages/MyMeetings/MyMeetings.vue');
const MyMeetingsVideo = () => import( /* webpackChunkName: "mymeetingsvideo" */ './pages/MyMeetingsVideo/MyMeetingsVideo.vue');
const AddEvent = () => import( /* webpackChunkName: "editevent" */ './pages/AddEvent/AddEvent.vue');
const EditEvent = () => import( /* webpackChunkName: "editevent" */ './pages/EditEvent/EditEvent.vue');
const EditStand = () => import( /* webpackChunkName: "editstand" */ './pages/EditStand/EditStand.vue');
const SingleStand = () => import( /* webpackChunkName: "singlestand" */ './pages/SingleStand/SingleStand.vue');
const AcceptStandInvitation = () => import( /* webpackChunkName: "acceptinvitation" */ './pages/AcceptStandInvitation/AcceptStandInvitation.vue');
const Checkout = () => import( /* webpackChunkName: "checkout" */ './pages/Checkout/Checkout.vue');
const CheckoutSuccess = () => import( /* webpackChunkName: "checkout" */ './pages/CheckoutSuccess/CheckoutSuccess.vue');
const Chat = () => import( /* webpackChunkName: "chat" */ './pages/Chat/Chat.vue');
const Chats = () => import( /* webpackChunkName: "chat" */ './pages/Chats/Chats.vue');
const Contact = () => import( /* webpackChunkName: "contact" */ './pages/Contact/Contact.vue');
const TermsConditions = () => import( /* webpackChunkName: "termsconditions" */ './pages/TermsConditions/TermsConditions.vue');
const PrivacyPolicy = () => import( /* webpackChunkName: "privacypolicy" */ './pages/PrivacyPolicy/PrivacyPolicy.vue');
const Faq = () => import( /* webpackChunkName: "faq" */ './pages/Faq/Faq.vue');
const Cookies = () => import( /* webpackChunkName: "cookies" */ './pages/Cookies/Cookies.vue');
const AboutUs = () => import( /* webpackChunkName: "aboutus" */ './pages/AboutUs/AboutUs.vue');
const HowItWorks = () => import( /* webpackChunkName: "howitworks" */ './pages/HowItWorks/HowItWorks.vue');
const OnlineEventManagement = () => import( /* webpackChunkName: "onleventman" */ './pages/OnlineEventManagement/OnlineEventManagement.vue');
const ConferenceOrganization = () => import( /* webpackChunkName: "conforg" */ './pages/ConferenceOrganization/ConferenceOrganization.vue');
const Agenda = () => import( /* webpackChunkName: "agenda" */ './pages/Agenda/Agenda.vue');
const AdvancedSearch = () => import( /* webpackChunkName: "advsearch" */ './pages/AdvancedSearch/AdvancedSearch.vue');
const AdvancedSponsorships = () => import( /* webpackChunkName: "advsponsors" */ './pages/AdvancedSponsorships/AdvancedSponsorships.vue');
const ChatAtTheEvent = () => import( /* webpackChunkName: "chatatevent" */ './pages/ChatAtTheEvent/ChatAtTheEvent.vue');
const ContentOfTheEvent = () => import( /* webpackChunkName: "contentevent" */ './pages/ContentOfTheEvent/ContentOfTheEvent.vue');
const CustomField = () => import( /* webpackChunkName: "customfields" */ './pages/CustomField/CustomField.vue');
const ListOfFeatures = () => import( /* webpackChunkName: "listoffeaut" */ './pages/ListOfFeatures/ListOfFeatures.vue');
const EventCustomisation = () => import( /* webpackChunkName: "eventcustom" */ './pages/EventCustomisation/EventCustomisation.vue');
const EventPermissionManagement = () => import( /* webpackChunkName: "eventpremman" */ './pages/EventPermissionManagement/EventPermissionManagement.vue');
const InhouseBroadcast = () => import( /* webpackChunkName: "inhousebroad" */ './pages/InhouseBroadcast/InhouseBroadcast.vue');
const BoothsStands = () => import( /* webpackChunkName: "boothstands" */ './pages/BoothsStands/BoothsStands.vue');
const SetupMeetings = () => import( /* webpackChunkName: "setupmeets" */ './pages/SetupMeetings/SetupMeetings.vue');
const StreamingIntegrations = () => import( /* webpackChunkName: "streamintegr" */ './pages/StreamingIntegrations/StreamingIntegrations.vue');
const VirtualWorkshops = () => import( /* webpackChunkName: "virtualwork" */ './pages/VirtualWorkshops/VirtualWorkshops.vue');
const VirtualConference = () => import( /* webpackChunkName: "virtualconf" */ './pages/VirtualConference/VirtualConference.vue');
const AdvancedWebinar = () => import( /* webpackChunkName: "advwebinar" */ './pages/AdvancedWebinar/AdvancedWebinar.vue');
const OnlineExhibition = () => import( /* webpackChunkName: "onlineexhib" */ './pages/OnlineExhibition/OnlineExhibition.vue');
const VirtualFestival = () => import( /* webpackChunkName: "virtualfest" */ './pages/VirtualFestival/VirtualFestival.vue');
const Solutions = () => import( /* webpackChunkName: "solutions" */ './pages/Solutions/Solutions.vue');
const Report = () => import( /* webpackChunkName: "report" */ './pages/Report/Report.vue');
const Demo = () => import( /* webpackChunkName: "demo" */ './pages/Demo/Demo.vue');
const DemoVideo = () => import( /* webpackChunkName: "demovideo" */ './pages/DemoVideo/DemoVideo.vue');
const Callback = () => import( /* webpackChunkName: "callback" */ './Callback.vue');
const EmailConfirm = () => import( /* webpackChunkName: "emailconfirm" */ './EmailConfirm.vue');
const NotFoundPage = () => import( /* webpackChunkName: "notfound" */ './pages/NotFoundPage/NotFoundPage.vue');
const IframeVideo = () => import( /* webpackChunkName: "iframe" */ './pages/IframeVideo/IframeVideo.vue');
const Partners = () => import( /* webpackChunkName: "partners" */ './pages/Partners/Partners.vue');
const Discount = () => import( /* webpackChunkName: "discount" */ './pages/Discount/Discount.vue');

import activeRoutes from '@/../routing';
const TestApi = () => import( /* webpackChunkName: "testapi" */ './pages/TestApi/TestApi.vue');


import { mapActions, mapGetters } from 'vuex'

import store from './store';

Vue.use(Router);
Vue.use(VueMeta);

const routes = [
  { path: '/', component: Home },
  { path: '/index.html', component: Home },
  { path: `/${activeRoutes.home}`, component: Home },
  {
    path: `/${activeRoutes.discover}`,
    meta: { requiresFeature: 'discover' },
    component: Discover
  },
  { path: `/${activeRoutes.testapi}`, component: TestApi },
  { path: `/callback`, component: Callback },
  { path: `/emailconfirm`, component: EmailConfirm },
  {
    path: `/${activeRoutes.report}/:id`,
    meta: { requiresAuth: true, requiresFeature: 'sponsors' },
    component: Report
  },
  {
    path: `/${activeRoutes.request_demo}`,
    component: Demo
  },
  {
    path: `/${activeRoutes.demo_video}`,
    component: DemoVideo,
    meta: { requiresAuth: true, requiresFeature: 'video' },
  },
  {
    path: `/${activeRoutes.myevents}`,
    component: MyEvents,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: `/${activeRoutes.myevents}/${activeRoutes.myevents_organizer}`
      },
      {
        path: `${activeRoutes.myevents_vistors}`,
        meta: { requiresAuth: true, customRedirect: '/' },
        component: MyEventsVisitors
      },
      {
        path: `${activeRoutes.myevents_organizer}`,
        meta: { requiresAuth: true, customRedirect: '/' },
        component: MyEventsOrganizer
      },
      {
        path: `${activeRoutes.myevents_standowner}`,
        meta: { requiresAuth: true, customRedirect: '/' },
        component: MyEventsStandOwner
      }
    ]
  },
  {
    path: `/${activeRoutes.myinvitations}`,
    component: MyInvitations,
    meta: { requiresAuth: true },
  },
  {
    path: `/${activeRoutes.mystands}`,
    component: MyStands,
    children: [
      {
        path: '',
        redirect: `/${activeRoutes.mystands}/${activeRoutes.mystands_owner}`
      },
      {
        path: `${activeRoutes.mystands_visitor}`,
        meta: { requiresAuth: true, customRedirect: '/' },
        component: MyStandsVisitor,
      },
      {
        path: `${activeRoutes.mystands_owner}`,
        meta: { requiresAuth: true, customRedirect: '/' },
        component: MyStandsOwner,
      }
    ]
  },
  {
    path: `/${activeRoutes.mychats}`,
    component: MyChats,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: `/${activeRoutes.mychats}/${activeRoutes.mychats_owner}`
      },
      {
        path: `${activeRoutes.mychats_visitor}`,
        component: MyChatsVisitor,
        meta: { requiresAuth: true },
      },
      {
        path: `${activeRoutes.mychats_owner}`,
        component: MyChatsOwner,
        meta: { requiresAuth: true },
      },
      {
        path: `${activeRoutes.mychats_standowner}`,
        component: MyChatsStandOwner,
        meta: { requiresAuth: true },
      }
    ]
  },
  {
    path: `/${activeRoutes.mymeetings}`,
    component: MyMeetings,
    meta: { requiresAuth: true },
  },
  {
    path: `/${activeRoutes.mymeetings}/${activeRoutes.mymeetings_video}/:posttype/:id/zid/:zoomId/zp/`,
    component: MyMeetingsVideo,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.mymeetings}/${activeRoutes.mymeetings_video}/:posttype/:id/zid/:zoomId/zp/:zoomPwd`,
    component: MyMeetingsVideo,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.mymeetings}/${activeRoutes.mymeetings_video}/:posttype/:id/tid/:twitchId`,
    component: MyMeetingsVideo,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.mymeetings}/${activeRoutes.mymeetings_video}/:activityId`,
    component: MyMeetingsVideo,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.meetingiframe}/:activityId`,
    component: IframeVideo,
    meta: { customHeader: true },
  },
  {
    path: `/${activeRoutes.register}`,
    component: Register,
    props: { auth_redirect: '/' }
  },
  {
    path: `/${activeRoutes.event}/:id`,
    component: SingleEvent,
  },
  {
    path: `/${activeRoutes.event}/:id/:tabName`,
    component: SingleEvent,
  },
  {
    path: `/${activeRoutes.article}/:id`,
    component: SingleArticle,
  },
  {
    path: `/${activeRoutes.addevent}`,
    alias: `/${activeRoutes.addevent}.html`,
    component: AddEvent,
    meta: { customHeader: true },

  },
  {
    path: `/${activeRoutes.editevent}/:id`,
    component: EditEvent,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.editevent}/:id/:tabId`,
    name: 'priceTypes',
    component: EditEvent,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.editstand}/:id/:name`,
    name: 'editstand',
    component: EditStand,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.editstand}/:id`,
    component: EditStand,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.stand}/:id`,
    component: SingleStand,
  },
  {
    path: `/${activeRoutes.acceptinvitation}`,
    component: AcceptStandInvitation,
    meta: { requiresAuth: true },
  },
  {
    path: `/${activeRoutes.checkout}/:id`,
    component: Checkout,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.checkout}/:id/tier/:tierId`,
    component: Checkout,
    meta: { requiresAuth: true, customHeader: true },
  },
  {
    path: `/${activeRoutes.checkout}/${activeRoutes.checkout_success}/:id`,
    component: CheckoutSuccess,
    meta: { requiresAuth: true, customHeader: true },
  },

  {
    path: `/${activeRoutes.chats}`,
    component: Chats,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.chat}`,
    component: Chat,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.chat}/:type/:id`,
    component: Chat,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.chat}/:type/:id/owner`,
    component: Chat,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.chat}/:type/:id/id/:sid`,
    component: Chat,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.chat}/:type/:id/:presType/:presTypeId`,
    component: Chat,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.contact}`,
    alias: `/${activeRoutes.contact}.html`,
    component: Contact,
  },
  {
    path: `/${activeRoutes.termsconditions}`,
    alias: `/${activeRoutes.termsconditions}.html`,
    component: TermsConditions,
  },
  {
    path: `/${activeRoutes.privacypolicy}`,
    alias: `/${activeRoutes.privacypolicy}.html`,
    component: PrivacyPolicy,
  },
  {
    path: `/${activeRoutes.faq}`,
    alias: `/${activeRoutes.faq}.html`,
    component: Faq,
  },
  {
    path: `/${activeRoutes.cookies}`,
    alias: `/${activeRoutes.cookies}.html`,
    component: Cookies,
  },
  {
    path: `/${activeRoutes.howitworks}`,
    alias: `/${activeRoutes.howitworks}.html`,
    component: HowItWorks,
  },
  {
    path: `/${activeRoutes.aboutus}`,
    alias: `/${activeRoutes.aboutus}.html`,
    component: AboutUs,
  },
  {
    path: `/${activeRoutes.onlineeventmanagement}`,
    alias: `/${activeRoutes.onlineeventmanagement}.html`,
    component: OnlineEventManagement,
  },
  {
    path: `/${activeRoutes.conferenceorganization}`,
    alias: `/${activeRoutes.conferenceorganization}.html`,
    component: ConferenceOrganization,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.agenda}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.agenda}.html`,
    component: Agenda,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.advanced_search}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.advanced_search}.html`,
    component: AdvancedSearch,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.advanced_sponsorship}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.advanced_sponsorship}.html`,
    component: AdvancedSponsorships,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.chat_at_the_event}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.chat_at_the_event}.html`,
    component: ChatAtTheEvent,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.content_of_the_event}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.content_of_the_event}.html`,
    component: ContentOfTheEvent,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.custom_field}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.custom_field}.html`,
    component: CustomField,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.event_customisation}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.event_customisation}.html`,
    component: EventCustomisation,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.event_permissions_management}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.event_permissions_management}.html`,
    component: EventPermissionManagement,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.inhouse_broadcast}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.inhouse_broadcast}.html`,
    component: InhouseBroadcast,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.booths_and_stands}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.booths_and_stands}.html`,
    component: BoothsStands,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.setup_meetings}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.setup_meetings}.html`,
    component: SetupMeetings,
  },
  {
    path: `/${activeRoutes.feature}/${activeRoutes.streaming_integrations}`,
    alias: `/${activeRoutes.feature}/${activeRoutes.streaming_integrations}.html`,
    component: StreamingIntegrations,
  },
  {
    path: `/${activeRoutes.solutions}/${activeRoutes.virtual_workshop}`,
    alias: `/${activeRoutes.solutions}/${activeRoutes.virtual_workshop}.html`,
    component: VirtualWorkshops,
  },
  {
    path: `/${activeRoutes.solutions}/${activeRoutes.virtual_conference}`,
    alias: `/${activeRoutes.solutions}/${activeRoutes.virtual_conference}.html`,
    component: VirtualConference,
  },
  {
    path: `/${activeRoutes.solutions}/${activeRoutes.advanced_webinar}`,
    alias: `/${activeRoutes.solutions}/${activeRoutes.advanced_webinar}.html`,
    component: AdvancedWebinar,
  },
  {
    path: `/${activeRoutes.solutions}/${activeRoutes.online_exhibition}`,
    alias: `/${activeRoutes.solutions}/${activeRoutes.online_exhibition}.html`,
    component: OnlineExhibition,
  },
  {
    path: `/${activeRoutes.solutions}/${activeRoutes.virtual_festival}`,
    alias: `/${activeRoutes.solutions}/${activeRoutes.virtual_festival}.html`,
    component: VirtualFestival,
  },
  {
    path: `/${activeRoutes.solutions}`,
    alias: `/${activeRoutes.solutions}.html`,
    component: Solutions,
  },
  {
    path: `/${activeRoutes.all_features}`,
    alias: `/${activeRoutes.all_features}.html`,
    component: ListOfFeatures,
  },
  {
    path: `/${activeRoutes.partners}`,
    alias: `/${activeRoutes.partners}.html`,
    component: Partners,
  },
  {
    path: `/${activeRoutes.discount}/:discountHash`,
    alias: `/${activeRoutes.discount}.html`,
    component: Discount,
  },
  {
    path: `/${activeRoutes.mycompany}`,
    component: MyCompany,
    meta: {requiresAuth: true }
  },
  {
    path: `/${activeRoutes.myaccount}`,
    component: MyAccount,
    meta: {requiresAuth: true}
  },
  { path: '*.html' },
  { path: '*', component: NotFoundPage }

]

const router = new Router({
  scrollBehavior(to, from, savedPosition) {
    if (to.matched[0].path == from.matched[0].path) {
      return savedPosition
    } else {
      return { x: 0, y: 0 };
    }
  },
  mode: 'history',
  routes: routes
})

router.beforeEach((to, from, next) => {

  if (!intercomLoaded) {
    if (store.getters.configs.features.intercom && store.getters.configs.intercomId) {
      Vue.use(VueIntercom, { appId: store.getters.configs.intercomId });
      intercomLoaded = true;
    }
  }

  window.previousUrl = from.path;
  document.querySelector('body').classList.remove('ui-modal--is-open');
  document.querySelector('body').removeAttribute('data-ui-open-modals');

  if (localStorage.getItem('amplify-redirected-from-hosted-ui')) {
    store.state.signedIn = true;
    store.dispatch('findUser');
  }

  if(to.matched.some(record=>record.path == "/callback")){
    store.dispatch('cognitoAuth0Authentication', to.hash);
    next(false);
  }

  // check if user is logged in (start assuming the user is not logged in = false)
  let routerAuthCheck = false;
  // Verify all the proper access variables are present for proper authorization
  if( localStorage.getItem('access_token') && localStorage.getItem('id_token') && localStorage.getItem('expires_at') ){
    // Check whether the current time is past the Access Token's expiry time
    let expiresAt = JSON.parse(localStorage.getItem('expires_at'));
    // set localAuthTokenCheck true if unexpired / false if expired
    routerAuthCheck = new Date().getTime() < expiresAt;

  }

  let user;

  if (store.getters.isLinkedinSignin) {
    userDataForProfile();
  } else {
    Vue.prototype.$Amplify.Auth.currentAuthenticatedUser().then((data) => {
      if (data && data.signInUserSession) {
        userDataForProfile();
      } else {
        if (store.getters.configs.features.intercom && store.getters.configs.intercomId) {
          if (!intercomOpened) {
            func.deleteСookie('intercom-session-'+store.getters.configs.intercomId);
            Vue.prototype.$intercom.boot();
            intercomOpened = true;
          }
        }
        store.state.userFetched = true;
        next();
      }
    }).catch((e) => {
        if (store.getters.configs.features.intercom && store.getters.configs.intercomId) {
          if (!intercomOpened) {
            func.deleteСookie('intercom-session-'+store.getters.configs.intercomId);
            Vue.prototype.$intercom.boot();
            intercomOpened = true;
          }
        }
        store.state.userFetched = true;
        next();

    });
  }

function enableIntercom() {
  if (!intercomOpened && store.state.userData) {
    Vue.prototype.$intercom.boot({
      user_id: store.state.userData.id,
      name: store.state.userData.name + ' ' + store.state.userData.surname,
      email: store.state.userData.email,
    });
    intercomOpened = true;
  }
}

function userDataForProfile() {
    if (!store.state.userData && !store.state.userFetched) {
      store.dispatch('apiGetUser', {
        id: '@me',
        callback: (resp) => {

          store.state.userFetched = true;
          if (resp.data.statusCode == '200' && resp.data.body) {
            store.state.userData = resp.data.body;
            store.state.userData.addressesObj = store.state.userData.address ? store.state.userData.address : {};
            store.state.userData.userBranding = {
              logo: {
                new: [],
                url: '',
              },
              logo_preview_url: false,
              exist: [],
              new:[],
              maps: {},
            };
            if ( store.state.userData.branding && store.state.userData.branding.length ) {

              store.state.userData.branding.forEach(item => {
                let itemFullUrl = func.url_64x64('https://'+store.getters.configs.binary+'/'+item.url);

                store.state.userData.userBranding.exist.push(itemFullUrl);

                item.strings?.forEach(str => {

                  if (str.category == 'description_long') {

                    if (str.value == 'logo_image') {
                      store.state.userData.userBranding.logo.url = itemFullUrl;
                      store.state.userData.userBranding.maps.logo = item.id;
                    }

                  }
                });

                if (item.url.indexOf('logo_image') > -1) {
                  store.state.userData.userBranding.logo.url = itemFullUrl;
                  store.state.userData.userBranding.maps.logo = item.id;
                }

              });

            }
          }

          if (store.getters.configs.features.intercom && store.getters.configs.intercomId) {
            enableIntercom();
          }

          next();

        }
      });
    } else {
      if (store.getters.configs.features.intercom && store.getters.configs.intercomId) {
        enableIntercom();
      }

      next();
    }
}

});

router.beforeResolve((to, from, next) => {
  if (!store.getters.getUser) {
    const { auth, email } = to.query;

    if (auth && email) {
      if (auth === 'challenge' && func.validateEmail(email)) {
        const loginDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email });
        const preAuthCognitoUser = createCognitoUser(email);
        preAuthCognitoUser.setAuthenticationFlowType('CUSTOM_AUTH');
        const initiatedUser = new Promise((resolve, reject) =>
          preAuthCognitoUser.initiateAuth(loginDetails, {
            onSuccess: resolve,
            onFailure: reject,
            customChallenge: async (data) => {
              resolve(data);
            }
          })
        );

        initiatedUser.then(user => {
          store.state.signedIn = !!user;
          store.state.user = user;
          const route = to.fullPath.split('?')[0];
          window.location = `${window.location.origin}${route}`;
        }).catch(error => {
          console.log('ERROR: ', error);
          window.location = `${window.location.origin}/register/?email=${email}&reason=challenge`;
        });

        return;
      }
    }
  }

  if (to.matched.some(record => record.meta.customHeader)) {
    store.state.customHeader = true;
  } else {
    store.state.customHeader = false;
  }

  if (to.matched.some(record => record.meta.requiresFeature)) {
    if (!store.getters.features[to.meta.requiresFeature]) {
      next({path:`/`});
      return;
    }
  }

  if (to.matched.some(record => record.meta.requiresAuth)) {
    let user;
    if (store.getters.isLinkedinSignin) {
      next();
      return;
    }
    Vue.prototype.$Amplify.Auth.currentAuthenticatedUser().then((data) => {

      if (data && data.signInUserSession) {
        user = data;
        store.state.auth.user = data;
        store.state.auth.signedIn = true;
        next()
      } else {
        next({path:`/${activeRoutes.register}`});
      }
    }).catch((e) => {
      if (to.path == `/${activeRoutes.acceptinvitation}` && to.query.email && to.query.invitationId) {
        if (to.query.type == 'company') {
          next({path:`/${activeRoutes.register}`, query: {
            msg: 'acim',
            rd: `/${activeRoutes.acceptinvitation}`,
            email: to.query.email.split(' ').join('+'),
            roleId: to.query.roleId,
            type: to.query.type,
            invitationId: to.query.invitationId },
            props: { auth_redirect: `/` }
          });
        } else if (to.query.type == 'eventGuest') {
          next({path:`/${activeRoutes.register}`, query: {
            msg: 'aeim',
            rd: `/${activeRoutes.acceptinvitation}`,
            email: to.query.email.split(' ').join('+'),
            roleId: to.query.roleId,
            type: to.query.type,
            invitationId: to.query.invitationId },
            props: { auth_redirect: `/` }
          });
        } else if (to.query.type == 'standGuest') {
          next({path:`/${activeRoutes.register}`, query: {
            msg: 'asim',
            rd: `/${activeRoutes.acceptinvitation}`,
            email: to.query.email.split(' ').join('+'),
            roleId: to.query.roleId,
            type: to.query.type,
            invitationId: to.query.invitationId },
            props: { auth_redirect: `/` }
          });
        } else {
          next({path:`/${activeRoutes.register}`, query: { msg: 'asim', rd: `/${activeRoutes.mystands}`, email: to.query.email.split(' ').join('+'), invitationId: to.query.invitationId }, props: { auth_redirect: `/${activeRoutes.mystands}` }});
        }
      } else if (to.meta.customRedirect) {
        next({path: to.meta.customRedirect});
      } else {
        next({path:`/${activeRoutes.register}`, query: { rd: to.path}});
      }

    });

  } else {
  next()
  }
})

const createCognitoUser = (email) => {
  const poolData = {
    UserPoolId: configs.amplify.aws_user_pools_id,
    ClientId: configs.amplify.aws_user_pools_web_client_id,
  };
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData)
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

  return cognitoUser;
}

export default router;
