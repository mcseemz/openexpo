import config from '@/../configs';
import store from '@/store'

const dpLists = {};
const requireDp = require.context("@/../locales/datepicker/", false, /\.json$/);
requireDp.keys().forEach(fileName => {
  if (fileName === "./index.js") return; //reject the index.js file

  const moduleName = fileName.replace(/(\.\/|\.json)/g, ""); //

  // dpLists[moduleName] = requireDp(fileName);
  dpLists[moduleName] = fileName;
  
});

// const datepicker_lang = store.getters.getLocale ? datepicker_lang_list[store.getters.getLocale] : datepicker_lang_list['en_GB'];
const activeDp_lang = store.getters.getLocale && dpLists[store.getters.getLocale] ? requireDp(dpLists[store.getters.getLocale]) : requireDp['en_GB.json'];
// console.log('DATEPICKER ', Vue);

// export default modules;
export default activeDp_lang;

// export default {
//   months: {
//     full: ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
//     abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
//   },
//   days: {
//     full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
//     abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
//     initials: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
//   }
// }
