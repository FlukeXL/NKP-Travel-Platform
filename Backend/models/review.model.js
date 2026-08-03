const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { FieldValue } = require('firebase-admin/firestore');

function reviewsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.REVIEWS);
}

function likesCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.REVIEW_LIKES);
}

function commentsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.REVIEW_COMMENTS);
}

async function addReview(placeId, { uid, author, avatar, rating, text, category, photos, video }) {
  const doc = {
    placeId,
    uid,
    author,
    avatar: avatar || null,
    rating,
    text,
    category: category || null,
    photos: Array.isArray(photos) ? photos : [],
    video: video || null,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };
  const ref = await reviewsCollection().add(doc);
  return { id: ref.id, ...doc };
}

async function getReviewsByPlace(placeId) {
  const snap = await reviewsCollection().where('placeId', '==', placeId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getAllReviews() {
  const snap = await reviewsCollection().get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getReviewStats(placeId) {
  const rows = await getReviewsByPlace(placeId);
  if (!rows.length) return null;
  const avg = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
  return { avg, count: rows.length };
}

async function getVideoReviews() {
  const snap = await reviewsCollection().where('video', '!=', null).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getVideoReviewsByCategory(category) {
  const rows = await getVideoReviews();
  return rows.filter((r) => r.category === category);
}

async function deleteReview(reviewId) {
  await reviewsCollection().doc(reviewId).delete();
  const [likeSnap, commentSnap] = await Promise.all([
    likesCollection().where('reviewId', '==', reviewId).get(),
    commentsCollection().where('reviewId', '==', reviewId).get(),
  ]);
  const batch = getDb().batch();
  likeSnap.docs.forEach((d) => batch.delete(d.ref));
  commentSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function getReviewById(reviewId) {
  const snap = await reviewsCollection().doc(reviewId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function getAllReviews() {
  const snap = await reviewsCollection().get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ----------------------------------------------------------
   Likes — one doc per (uid, reviewId), same pattern as favorites.
---------------------------------------------------------- */
function likeDocId(uid, reviewId) {
  return `${uid}_${reviewId}`;
}

async function isLikedByUser(uid, reviewId) {
  const snap = await likesCollection().doc(likeDocId(uid, reviewId)).get();
  return snap.exists;
}

async function addLike(uid, reviewId) {
  const db = getDb();
  const likeRef = likesCollection().doc(likeDocId(uid, reviewId));
  const reviewRef = reviewsCollection().doc(reviewId);

  await db.runTransaction(async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists) return;
    tx.set(likeRef, { uid, reviewId, createdAt: new Date().toISOString() });
    tx.update(reviewRef, { likeCount: FieldValue.increment(1) });
  });
}

async function removeLike(uid, reviewId) {
  const likeRef = likesCollection().doc(likeDocId(uid, reviewId));
  const snap = await likeRef.get();
  if (!snap.exists) return; // wasn't liked, no-op
  await likeRef.delete();
  await reviewsCollection().doc(reviewId).update({ likeCount: FieldValue.increment(-1) });
}

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
async function addComment(reviewId, { uid, author, avatar, text }) {
  const doc = { reviewId, uid, author, avatar: avatar || null, text, createdAt: new Date().toISOString() };
  const ref = await commentsCollection().add(doc);
  await reviewsCollection().doc(reviewId).update({ commentCount: FieldValue.increment(1) });
  return { id: ref.id, ...doc };
}

async function getCommentsByReview(reviewId) {
  const snap = await commentsCollection().where('reviewId', '==', reviewId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function deleteComment(commentId) {
  const ref = commentsCollection().doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const { reviewId } = snap.data();
  await ref.delete();
  await reviewsCollection().doc(reviewId).update({ commentCount: FieldValue.increment(-1) });
  return snap.data();
}

async function getCommentById(commentId) {
  const snap = await commentsCollection().doc(commentId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

module.exports = {
  addReview,
  getReviewsByPlace,
  getReviewStats,
  getVideoReviews,
  getVideoReviewsByCategory,
  deleteReview,
  getReviewById,
  getAllReviews,
  isLikedByUser,
  addLike,
  removeLike,
  addComment,
  getCommentsByReview,
  deleteComment,
  getCommentById,
};
