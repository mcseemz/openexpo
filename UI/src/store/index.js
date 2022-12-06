import Vue from 'vue'
import Vuex from 'vuex'
import api from './modules/api'
import auth from './modules/auth'
import i18n from './modules/i18n'
import router from '../router'
import activeRoutes from '@/../routing';
import configs from '@/../configs';

import {Auth} from 'aws-amplify'


Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: null,
    linkedinUser: null,
    signedIn: false,
    userData: null,
    userFetched: false,
    userIsAuthorized: false,
    customHeader: false,
    unreadInterval: null,
    logo: null,
    standLogo: null,
    apiError: [],
    recommenderList: [],
    typeAddedSession:'product',
    amplifyInfo: {
      aws_user_pools_id:null,
      aws_user_pools_web_client_id:null
    },
    customSponsorId: null,
    agendaErrors: null,
    agendaName: '',
    agendaData: [],
    addedNotSaved: 0,
    editedNotSaved: 0,
    removedNotSaved: 0,
    addedCollections: 0,
    editedCollections: 0,
    removedCollections: 0,
    addedDownload: 0,
    editedDownload: 0,
    removedDownload: 0,
    addedAgenda: 0,
    editedAgenda: 0,
    removedAgenda: 0,
    editedTicket: 0,
    removedSponsor: 0,
    editedItem: [],
    curRemCollections: [],
    curRemDownload: [],
    curRemProduct: [],
    curRemCustSponsor: [],
  },

  mutations: {
    passEditedHint(state,itemId) {
      state.editedItem.push(itemId);
    },
    resetEditedHint(state) {
      state.editedItem = []
    },
    setRemovedSposnor(state, payload) {
      state.removedSponsor = payload;
    },
    setEditedticket(state, payload) {
      state.editedTicket = payload;
    },
    setNewAdded(state, payload) {
      payload.newLength === 0 ? state.addedNotSaved = payload.newLength  :  payload.total ? state.addedNotSaved = payload.newLength :
      state.addedNotSaved += payload.newLength;
    },
    setEditedVal(state, payload) {
      payload.newLength === 0 ? state.editedNotSaved = payload.newLength  :  payload.total ? state.editedNotSaved = payload.newLength :
        state.editedNotSaved += payload.newLength;
    },
    setRemoveVal(state, payload) {
      payload.newLength === 0 ? state.removedNotSaved = payload.newLength  :  payload.total ? state.removedNotSaved = payload.newLength :
      state.removedNotSaved += payload.newLength;
    },
    setRemoveValDown(state, payload) {
      state.removedDownload = payload;
    },
    setNewAddedAgenda(state, payload) {
      state.addedAgenda = payload;
    },
    setRemoveAgenda(state, payload) {
      state.removedAgenda = payload;
    },
    setEditedAgenda(state, payload) {
      state.editedAgenda = payload;
    },
    setAgendaName(state, payload) {
      state.agendaName = payload;
    },
    setAgendaData(state, payload) {
      state.agendaData = payload;
    },
    setAgendaError(state, payload) {
      state.agendaErrors = payload;
    },
    changeTypeAdded(state, payload) {
      state.typeAddedSession = payload;
    },
    setAmplifyInfo(state, data) {
      state.amplifyInfo.aws_user_pools_id = data.aws_user_pools_id;
      state.amplifyInfo.aws_user_pools_web_client_id = data.aws_user_pools_web_client_id;
    },
    setApiError(state, error) {
      state.apiError.push(error);
    },
    clearApiErrors(state, data) {
      state.apiError = [];
    },
    setLogo(state, payload) {
      state.logo = payload;
    },
    changeLogoStand(state, payload) {
      state.standLogo = payload;
    },
    remItemDownl(state, id) {
      state.customSponsorId = id;
    },
    curRemCollection(state, id) {
      id ? state.curRemCollections.push(id) : state.curRemCollections = [];
    },
    setRemDownload(state, id) {
      id ? state.curRemDownload.push(id) : state.curRemDownload = [];
    },
    setRemProduct(state, id) {
      id ? state.curRemProduct.push(id) : state.curRemProduct = [];
    },
    setRemCustSponsor(state, id) {
      id ? state.curRemCustSponsor.push(id) : state.curRemCustSponsor = [];
    }
  },
  actions: {
    cognitoAuth0Authentication(context, hash) {
      console.log('HASH', hash);
      const hashArr = hash.replace('#', '').split('&');
      let token = '';
      let expires_in = false;
      let id_token = '';
      hashArr.forEach(item => {
        const itemParts = item.split('=');
        if (itemParts[0] == 'access_token') {
          token = itemParts[1];
          localStorage.setItem('access_token', itemParts[1]);
          console.log('accessTOKEN', itemParts[1]);
        }
        if (itemParts[0] == 'id_token') {
          id_token = itemParts[1];
          localStorage.setItem('id_token', itemParts[1]);
          console.log('idTOKEN', itemParts[1]);
        }
        if (itemParts[0] == 'expires_in') {
          expires_in = itemParts[1];
          const expiresAt = itemParts[1] * 1000 + new Date().getTime()
          localStorage.setItem('expires_at', expiresAt);
        }

      });

      if (localStorage.getItem('eventRegistrationId')) {
        router.push(`/event/${localStorage.getItem('eventRegistrationId')}/tickets`);
      } else {
        router.replace('/');
      }
    },

  },
  getters: {
    getRemCustSponsor: state => {
      return state.curRemCustSponsor;
    },
    getRemProduct: state => {
      return state.curRemProduct;
    },
    getRemDownload: state => {
      return state.curRemDownload;
    },
    getCurRemCollections: state => {
      return state.curRemCollections;
    },
    getEditedItem: state => {
      return state.editedItem;
    },
    getRemovedSponsor: state => {
      return state.removedSponsor;
    },
    getEditedTicket: state => {
      return state.editedTicket;
    },
    getAddedNotSaved: state => {
      return state.addedNotSaved;
    },
    getEditedNotSaved: state => {
      return state.editedNotSaved;
    },
    getRemovedNotSaved: state => {
      return state.removedNotSaved;
    },
    getRemovedDown: state => {
      return state.removedDownload;
    },
    getAddedAgenda: state => {
      return state.addedAgenda;
    },
    getEditedAgenda: state => {
      return state.editedAgenda;
    },
    getRemovedAgenda: state => {
      return state.removedAgenda;
    },
    getAgendaName: state => {
      return state.agendaName;
    },
    getAgendaData: state => {
      return state.agendaData;
    },
    getAgendaError: state => {
      return state.agendaErrors;
    },
    getCustomSponsorId: state => {
      return state.customSponsorId;
    },
    getAmplifyInfo: state => {
      return state.amplifyInfo;
    },
    getUser: state => {
      return state.user;
    },
    routes: state => {
      return activeRoutes;
    },
    configs: state => {
      return configs;
    },
    features: state => {
      return configs.features ? configs.features : {};
    },
    isLinkedinSignin: state => {
      let expiresAt = JSON.parse(localStorage.getItem('expires_at'));
      // set localAuthTokenCheck true if unexpired / false if expired
      const notExpired = new Date().getTime() < expiresAt;
      return notExpired && localStorage.getItem('id_token');
    },
    getLogo: state => {
      return state.logo
    },
    getStandLogo: state => {
      return state.standLogo
    },
    getPersonnelAvatar: state => {
      return state.personnelAvatar
    }
  },
  modules: {
    api,
    auth,
    i18n,
  }
})
