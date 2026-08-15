const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query, ID } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_POSTS = 'checkin_posts';
const DEV_LIKES = 'checkin_likes';
const DEV_COMMENTS = 'checkin_comments';
const DEV_NOTES = 'checkin_notes';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'chk');
}

function formatDoc(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  return {
    id: rest.id || $id,
    ...rest,
    rating: Number(rest.rating) || 0,
    likeCount: Number(rest.likeCount) || 0,
    commentCount: Number(rest.commentCount) || 0,
    photos: Array.isArray(rest.photos) ? rest.photos : [],
    hashtags: Array.isArray(rest.hashtags) ? rest.hashtags : [],
    createdAt: rest.createdAt || $createdAt || new Date().toISOString(),
  };
}

async function addPost({ uid, author, avatar, place, placeId, photos, video, hashtags, rating, visibility, category }) {
  const id = ID.unique();
  const now = new Date().toISOString();
  const payload = {
    uid: String(uid),
    author: String(author || 'ผู้ใช้งาน'),
    avatar: String(avatar || ''),
    place: String(place || ''),
    placeId: String(placeId || ''),
    photos: Array.isArray(photos) ? photos : [],
    video: String(video || ''),
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    rating: Number(rating) || 0,
    visibility: visibility === 'private' ? 'private' : 'public',
    category: String(category || ''),
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, id, payload);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[checkin.model] Appwrite addPost failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_POSTS, id, record);
  return record;
}

async function getFeed(uid) {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.CHECKIN_POSTS, [
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      const visible = list.filter((p) => p.visibility === 'public' || (uid && p.uid === String(uid)));
      return visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[checkin.model] Appwrite getFeed failed:', err.message);
    }
  }

  const list = devStore.list(DEV_POSTS).map(formatDoc);
  const visible = list.filter((p) => p.visibility === 'public' || (uid && p.uid === String(uid)));
  return visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getPostById(postId) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, sanitizeId(postId));
      return formatDoc(doc);
    } catch {
      return null;
    }
  }

  const p = devStore.get(DEV_POSTS, String(postId));
  return p ? formatDoc(p) : null;
}

async function getAllPosts() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.CHECKIN_POSTS, [
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[checkin.model] Appwrite getAllPosts failed:', err.message);
    }
  }

  const list = devStore.list(DEV_POSTS).map(formatDoc);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deletePost(postId) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, sanitizeId(postId));
    } catch (err) {
      if (err.code !== 404) console.warn('[checkin.model] Appwrite deletePost failed:', err.message);
    }
  }

  devStore.delete(DEV_POSTS, String(postId));
}

/* ----------------------------------------------------------
   Likes
---------------------------------------------------------- */
function likeDocId(uid, postId) {
  return sanitizeId(`${uid}_${postId}`);
}

async function isLikedByUser(uid, postId) {
  if (!uid || !postId) return false;
  const id = likeDocId(uid, postId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().getDocument(databaseId, COLLECTIONS.CHECKIN_LIKES, id);
      return true;
    } catch {
      return false;
    }
  }

  return Boolean(devStore.get(DEV_LIKES, id));
}

async function addLike(uid, postId) {
  const id = likeDocId(uid, postId);
  const now = new Date().toISOString();
  const payload = { uid: String(uid), postId: String(postId), createdAt: now };

  if (isAppwriteReady()) {
    try {
      await getDatabases().createDocument(databaseId, COLLECTIONS.CHECKIN_LIKES, id, payload);
      const p = await getPostById(postId);
      if (p) {
        await getDatabases().updateDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, sanitizeId(postId), {
          likeCount: (p.likeCount || 0) + 1,
        });
      }
      return;
    } catch (err) {
      if (err.code === 409) return;
      console.warn('[checkin.model] Appwrite addLike failed:', err.message);
    }
  }

  if (!devStore.get(DEV_LIKES, id)) {
    devStore.set(DEV_LIKES, id, payload);
    const p = devStore.get(DEV_POSTS, String(postId));
    if (p) {
      p.likeCount = (p.likeCount || 0) + 1;
      devStore.set(DEV_POSTS, String(postId), p);
    }
  }
}

async function removeLike(uid, postId) {
  const id = likeDocId(uid, postId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.CHECKIN_LIKES, id);
      const p = await getPostById(postId);
      if (p) {
        await getDatabases().updateDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, sanitizeId(postId), {
          likeCount: Math.max(0, (p.likeCount || 1) - 1),
        });
      }
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[checkin.model] Appwrite removeLike failed:', err.message);
    }
  }

  if (devStore.get(DEV_LIKES, id)) {
    devStore.delete(DEV_LIKES, id);
    const p = devStore.get(DEV_POSTS, String(postId));
    if (p) {
      p.likeCount = Math.max(0, (p.likeCount || 1) - 1);
      devStore.set(DEV_POSTS, String(postId), p);
    }
  }
}

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
async function addComment(postId, { uid, author, avatar, text }) {
  const id = ID.unique();
  const now = new Date().toISOString();
  const payload = {
    postId: String(postId),
    uid: String(uid),
    author: String(author || 'ผู้ใช้งาน'),
    avatar: String(avatar || ''),
    text: String(text || ''),
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.CHECKIN_COMMENTS, id, payload);
      const p = await getPostById(postId);
      if (p) {
        await getDatabases().updateDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, sanitizeId(postId), {
          commentCount: (p.commentCount || 0) + 1,
        });
      }
      return formatDoc(doc);
    } catch (err) {
      console.warn('[checkin.model] Appwrite addComment failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_COMMENTS, id, record);
  const p = devStore.get(DEV_POSTS, String(postId));
  if (p) {
    p.commentCount = (p.commentCount || 0) + 1;
    devStore.set(DEV_POSTS, String(postId), p);
  }
  return record;
}

async function getCommentsByPost(postId) {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.CHECKIN_COMMENTS, [
        Query.equal('postId', String(postId)),
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch (err) {
      console.warn('[checkin.model] Appwrite getCommentsByPost failed:', err.message);
    }
  }

  const list = devStore.list(DEV_COMMENTS).filter((c) => c.postId === String(postId));
  return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function deleteComment(commentId) {
  let existing = await getCommentById(commentId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.CHECKIN_COMMENTS, sanitizeId(commentId));
      if (existing) {
        const p = await getPostById(existing.postId);
        if (p) {
          await getDatabases().updateDocument(databaseId, COLLECTIONS.CHECKIN_POSTS, sanitizeId(existing.postId), {
            commentCount: Math.max(0, (p.commentCount || 1) - 1),
          });
        }
      }
      return existing;
    } catch (err) {
      if (err.code !== 404) console.warn('[checkin.model] Appwrite deleteComment failed:', err.message);
    }
  }

  existing = devStore.get(DEV_COMMENTS, String(commentId));
  if (existing) {
    devStore.delete(DEV_COMMENTS, String(commentId));
    const p = devStore.get(DEV_POSTS, String(existing.postId));
    if (p) {
      p.commentCount = Math.max(0, (p.commentCount || 1) - 1);
      devStore.set(DEV_POSTS, String(existing.postId), p);
    }
  }
  return existing;
}

async function getCommentById(commentId) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.CHECKIN_COMMENTS, sanitizeId(commentId));
      return formatDoc(doc);
    } catch {
      return null;
    }
  }

  return devStore.get(DEV_COMMENTS, String(commentId)) || null;
}

/* ----------------------------------------------------------
   Private notes
---------------------------------------------------------- */
async function addNote(uid, { place, title, body }) {
  const id = ID.unique();
  const now = new Date().toISOString();
  const payload = {
    uid: String(uid),
    place: String(place || ''),
    title: String(title || ''),
    body: String(body || ''),
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.CHECKIN_NOTES, id, payload);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[checkin.model] Appwrite addNote failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_NOTES, id, record);
  return record;
}

async function getNotesByUser(uid) {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.CHECKIN_NOTES, [
        Query.equal('uid', String(uid)),
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[checkin.model] Appwrite getNotesByUser failed:', err.message);
    }
  }

  const list = devStore.list(DEV_NOTES).filter((n) => n.uid === String(uid));
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getNoteById(noteId) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.CHECKIN_NOTES, sanitizeId(noteId));
      return formatDoc(doc);
    } catch {
      return null;
    }
  }

  return devStore.get(DEV_NOTES, String(noteId)) || null;
}

async function deleteNote(noteId) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.CHECKIN_NOTES, sanitizeId(noteId));
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[checkin.model] Appwrite deleteNote failed:', err.message);
    }
  }

  devStore.delete(DEV_NOTES, String(noteId));
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
