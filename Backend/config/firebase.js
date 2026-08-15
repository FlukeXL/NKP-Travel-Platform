const { isAppwriteReady } = require('./appwrite');

module.exports = {
  admin: null,
  auth: null,
  db: null,
  isFirebaseReady: isAppwriteReady,
};
