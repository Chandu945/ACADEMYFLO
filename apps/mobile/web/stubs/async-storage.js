// Web stub for @react-native-async-storage/async-storage
// Uses localStorage on web
var storage = {
  getItem: function (key) {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch (e) { return Promise.resolve(null); }
  },
  setItem: function (key, value) {
    try { localStorage.setItem(key, value); return Promise.resolve(); }
    catch (e) { return Promise.resolve(); }
  },
  removeItem: function (key) {
    try { localStorage.removeItem(key); return Promise.resolve(); }
    catch (e) { return Promise.resolve(); }
  },
};

// Support both: import AsyncStorage from '...' AND require('...').default
module.exports = storage;
module.exports.default = storage;
