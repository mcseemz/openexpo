import Vue from 'vue'
import App from './App.vue'
import configs from '../configs';

import router from './router'
import store from './store'
import axios from 'axios';
import fbpixel from './plugins/fbpxiel.js';
import Amplify, * as AmplifyModules from 'aws-amplify';
import { AmplifyPlugin } from 'aws-amplify-vue';

import vueTags from '@/plugins/tags';

import VueAnalytics from 'vue-analytics';
//import VueFacebookPixel from 'vue-analytics-facebook-pixel'
import VueTagManager from "vue-tag-manager"
import Multiselect from 'vue-multiselect'


if (configs.features.facebook && configs.facebookId) {
  //disable as module is not supported in node 16+
	//Vue.use(VueFacebookPixel)
	// Vue.prototype.$analytics.fbq.init(configs.facebookId);
	// Vue.prototype.$analytics.fbq.event('PageView');
}

if (configs.features.tagManager && configs.tagMagagerId) {
	Vue.use(VueTagManager, {
	    gtmId: configs.tagMagagerId
	})
}

Vue.component('multiselect', Multiselect)

const amplifyConf = configs.amplify ? configs.amplify : {};

Amplify.configure(amplifyConf);

let refreshed = false;

Vue.config.productionTip = false

Vue.component('multiselect', Multiselect)
Vue.use(AmplifyPlugin, AmplifyModules)

if (configs.features.analytics && configs.analyticsId) {
	Vue.use(VueAnalytics, {
	  id: configs.analyticsId,
	  router
	})
}

new Vue({
	router,
	store,
  render: h => h(App),
  mounted: () => document.dispatchEvent(new Event("x-app-rendered")),
}).$mount('#app')
