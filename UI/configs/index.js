let currentHostname = window.location.hostname.replace('www.', '');
currentHostname = currentHostname.replace(/pr-\d+/g, 'dev');
const configs = require('./'+currentHostname+'.json');

export default configs;
