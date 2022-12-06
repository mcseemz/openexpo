import Vue from 'vue';
import Vuex from 'vuex'
import { I18n } from 'aws-amplify';
import configs from '@/../configs';

import func from '@/others/functions.js';

const defaultLang = configs && configs.lang ? configs.lang : 'en_GB';
const initial_locale = getCookie('locale') ? getCookie('locale') : defaultLang;

function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

I18n.setLanguage( initial_locale );

export default {

  actions: {

    putVocabularies(ctx, dict) {
      I18n.putVocabularies(dict);
    },
    putVocabulariesForLanguage(ctx, lang, dict) {
      I18n.putVocabulariesForLanguage(lang, dict);
    },
    setLocale(ctx, locale) {
      I18n.setLanguage(locale);
      ctx.commit('mutateLocale', locale);
      document.cookie = "locale="+locale+'; Path=/;';
      window.location.reload();
    },
    setLocalesList(ctx, list) {
      ctx.commit('mutateLocalesList', list);
    }

  },
  mutations: {

    mutateLocale(state, locale) {
    	state.locale = locale;
    },
    mutateLocalesList(state, list) {
      state.localesList = list;
    }

  },
  state: {

    locale: initial_locale,
    localesList: []

  },
  getters: {

    getAllLocales(state) {
      return state.localesList;
    },
    getLocale(state) {
    	return state.locale;
    },
    getLocaleName(state) {
      return state.locale;
    },

    tr(ctx) {
      return string => {
        return I18n.get(string);
      }
    },

  }
}
