const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { FieldValue } = require('firebase-admin/firestore');

function postsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.CHECKIN_POSTS);
}

function likesCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.CHECKIN_LIKES);
}

function commentsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.CHECKIN_COMMENTS);
}

function notesCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.CHECKIN_NOTES);
}

async function addPost({ uid, author, avatar, place, placeId, photos, hashtags, rating, visibility }) {
  const doc = {
    uid,
    author,
    avatar: avatar || null,
    place,
    placeId: placeId || null,
    photos: Array.isArray(photos) ? photos : [],
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    rating: rating || null,
    visibility: visibility === 'private' ? 'private' : 'public',
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };
  const ref = await postsCollection().add(doc);
  return { id: ref.id, ...doc };
}

async function getFeed(uid) {
  const snap = await postsCollection().get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const visible = rows.filter((p) => p.visibility === 'public' || (uid && p.uid === uid));
  return visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getPostById(postId) {
  const snap = await postsCollection().doc(postId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function getAllPosts() {
  const snap = await postsCollection().get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deletePost(postId) {
  await postsCollection().doc(postId).delete();
  const [likeSnap, commentSnap] = await Promise.all([
    likesCollection().where('postId', '==', postId).get(),
    commentsCollection().where('postId', '==', postId).get(),
  ]);
  const batch = getDb().batch();
  likeSnap.docs.forEach((d) => batch.delete(d.ref));
  commentSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/* ----------------------------------------------------------
   Likes — one doc per (uid, postId), same pattern as review likes.
---------------------------------------------------------- */
function likeDocId(uid, postId) {
  return `${uid}_${postId}`;
}

async function isLikedByUser(uid, postId) {
  const snap = await likesCollection().doc(likeDocId(uid, postId)).get();
  return snap.exists;
}

async function addLike(uid, postId) {
  const db = getDb();
  const likeRef = likesCollection().doc(likeDocId(uid, postId));
  const postRef = postsCollection().doc(postId);

  await db.runTransaction(async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists) return;
    tx.set(likeRef, { uid, postId, createdAt: new Date().toISOString() });
    tx.update(postRef, { likeCount: FieldValue.increment(1) });
  });
}

async function removeLike(uid, postId) {
  const likeRef = likesCollection().doc(likeDocId(uid, postId));
  const snap = await likeRef.get();
  if (!snap.exists) return;
  await likeRef.delete();
  await postsCollection().doc(postId).update({ likeCount: FieldValue.increment(-1) });
}

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
async function addComment(postId, { uid, author, avatar, text }) {
  const doc = { postId, uid, author, avatar: avatar || null, text, createdAt: new Date().toISOString() };
  const ref = await commentsCollection().add(doc);
  await postsCollection().doc(postId).update({ commentCount: FieldValue.increment(1) });
  return { id: ref.id, ...doc };
}

async function getCommentsByPost(postId) {
  const snap = await commentsCollection().where('postId', '==', postId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function deleteComment(commentId) {
  const ref = commentsCollection().doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const { postId } = snap.data();
  await ref.delete();
  await postsCollection().doc(postId).update({ commentCount: FieldValue.increment(-1) });
  return snap.data();
}

async function getCommentById(commentId) {
  const snap = await commentsCollection().doc(commentId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

/* ----------------------------------------------------------
   Private notes — visible ONLY to the owner, never in the public feed.
---------------------------------------------------------- */
async function addNote(uid, { place, title, body }) {
  const doc = { uid, place, title, body, createdAt: new Date().toISOString() };
  const ref = await notesCollection().add(doc);
  return { id: ref.id, ...doc };
}

async function getNotesByUser(uid) {
  const snap = await notesCollection().where('uid', '==', uid).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getNoteById(noteId) {
  const snap = await notesCollection().doc(noteId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function deleteNote(noteId) {
  await notesCollection().doc(noteId).delete();
}

module.exports = {
  addPost,
  getFeed,
  getPostById,
  getAllPosts,
  deletePost,
  isLikedByUser,
  addLike,
  removeLike,
  addComment,
  getCommentsByPost,
  deleteComment,
  getCommentById,
  addNote,
  getNotesByUser,
  getNoteById,
  deleteNote,
};
