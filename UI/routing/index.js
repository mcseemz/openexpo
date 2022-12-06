import config from '@/../configs';

const routesLists = {};
const requireRoutes = require.context(".", false, /\.json$/);
requireRoutes.keys().forEach(fileName => {
  if (fileName === "./index.js") return; //reject the index.js file

  const moduleName = fileName.replace(/(\.\/|\.json)/g, ""); //

  routesLists[moduleName] = requireRoutes(fileName);
  
});

const activeRoutes = config && config.routing && routesLists[config.routing] ? routesLists[config.routing] : routesLists['en_GB'];

// export default modules;
export default activeRoutes;