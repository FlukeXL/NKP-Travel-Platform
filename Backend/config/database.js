const { db, isFirebaseReady } = require('./firebase');

function getDb() {
  return db;
}

const COLLECTIONS = {
  USERS: 'users',
  ENVIRONMENT_HISTORY: 'environment_history',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  LIFESTYLE_INTERESTS: 'lifestyle_interests', 
  PLACES: 'places', 
  REVIEW_LIKES: 'review_likes',
  REVIEW_COMMENTS: 'review_comments',
  CHECKIN_POSTS: 'checkin_posts',
  CHECKIN_LIKES: 'checkin_likes',
  CHECKIN_COMMENTS: 'checkin_comments',
  CHECKIN_NOTES: 'checkin_notes',
  AUDIT_LOGS: 'audit_logs',
  EVENTS: 'events',
  ADS: 'ads',
};

module.exports = { getDb, isFirebaseReady, COLLECTIONS };
