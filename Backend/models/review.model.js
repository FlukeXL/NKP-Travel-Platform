const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query, ID } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_REVIEWS = 'reviews';
const DEV_LIKES = 'review_likes';
const DEV_COMMENTS = 'review_comments';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'rev');
}

function formatDoc(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  return {
    id: rest.id || $id,
    ...rest,
    rating: Number(rest.rating) || 5,
    likeCount: Number(rest.likeCount) || 0,
    commentCount: Number(rest.commentCount) || 0,
    photos: Array.isArray(rest.photos) ? rest.photos : [],
    createdAt: rest.createdAt || $createdAt || new Date().toISOString(),
  };
}

async function addReview(placeId, { uid, author, avatar, rating, text, category, photos, video }) {
  const now = new Date().toISOString();
  const id = ID.unique();
  const payload = {
    placeId: String(placeId),
    uid: String(uid),
    author: String(author || 'ผู้ใช้งาน'),
    avatar: String(avatar || ''),
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    text: String(text || ''),
    category: String(category || ''),
    photos: Array.isArray(photos) ? photos : [],
    video: String(video || ''),
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.REVIEWS, id, payload);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[review.model] Appwrite addReview failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_REVIEWS, id, record);
  return record;
}

async function getReviewsByPlace(placeId) {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.REVIEWS, [
        Query.equal('placeId', String(placeId)),
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[review.model] Appwrite getReviewsByPlace failed:', err.message);
    }
  }

  const list = devStore.list(DEV_REVIEWS).filter((r) => r.placeId === String(placeId));
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getAllReviews() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.REVIEWS, [
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[review.model] Appwrite getAllReviews failed:', err.message);
    }
  }

  const list = devStore.list(DEV_REVIEWS);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getReviewStats(placeId) {
  const rows = await getReviewsByPlace(placeId);
  if (!rows.length) return null;
  const avg = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
  return { avg, count: rows.length };
}

async function getVideoReviews() {
  const all = await getAllReviews();
  return all.filter((r) => Boolean(r.video && r.video.trim()));
}

async function getVideoReviewsByCategory(category) {
  const rows = await getVideoReviews();
  return rows.filter((r) => r.category === category);
}

async function deleteReview(reviewId) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.REVIEWS, sanitizeId(reviewId));
    } catch (err) {
      if (err.code !== 404) console.warn('[review.model] Appwrite deleteReview failed:', err.message);
    }
  }
  devStore.delete(DEV_REVIEWS, String(reviewId));
}

async function getReviewById(reviewId) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.REVIEWS, sanitizeId(reviewId));
      return formatDoc(doc);
    } catch (err) {
      if (err.code !== 404) console.warn('[review.model] Appwrite getReviewById failed:', err.message);
      return null;
    }
  }
  return devStore.get(DEV_REVIEWS, String(reviewId)) || null;
}

/* ----------------------------------------------------------
   Likes
---------------------------------------------------------- */
function likeDocId(uid, reviewId) {
  return sanitizeId(`${uid}_${reviewId}`);
}

async function isLikedByUser(uid, reviewId) {
  if (!uid || !reviewId) return false;
  if (isAppwriteReady()) {
    try {
      await getDatabases().getDocument(databaseId, COLLECTIONS.REVIEW_LIKES, likeDocId(uid, reviewId));
      return true;
    } catch {
      return false;
    }
  }
  return Boolean(devStore.get(DEV_LIKES, likeDocId(uid, reviewId)));
}

async function addLike(uid, reviewId) {
  const id = likeDocId(uid, reviewId);
  const now = new Date().toISOString();
  const payload = { uid: String(uid), reviewId: String(reviewId), createdAt: now };

  if (isAppwriteReady()) {
    try {
      await getDatabases().createDocument(databaseId, COLLECTIONS.REVIEW_LIKES, id, payload);
      const rev = await getReviewById(reviewId);
      if (rev) {
        await getDatabases().updateDocument(databaseId, COLLECTIONS.REVIEWS, sanitizeId(reviewId), {
          likeCount: (rev.likeCount || 0) + 1,
        });
      }
      return;
    } catch (err) {
      if (err.code === 409) return; // Already liked
      console.warn('[review.model] Appwrite addLike failed:', err.message);
    }
  }

  if (!devStore.get(DEV_LIKES, id)) {
    devStore.set(DEV_LIKES, id, payload);
    const rev = devStore.get(DEV_REVIEWS, String(reviewId));
    if (rev) {
      rev.likeCount = (rev.likeCount || 0) + 1;
      devStore.set(DEV_REVIEWS, String(reviewId), rev);
    }
  }
}

async function removeLike(uid, reviewId) {
  const id = likeDocId(uid, reviewId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.REVIEW_LIKES, id);
      const rev = await getReviewById(reviewId);
      if (rev) {
        await getDatabases().updateDocument(databaseId, COLLECTIONS.REVIEWS, sanitizeId(reviewId), {
          likeCount: Math.max(0, (rev.likeCount || 1) - 1),
        });
      }
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[review.model] Appwrite removeLike failed:', err.message);
    }
  }

  if (devStore.get(DEV_LIKES, id)) {
    devStore.delete(DEV_LIKES, id);
    const rev = devStore.get(DEV_REVIEWS, String(reviewId));
    if (rev) {
      rev.likeCount = Math.max(0, (rev.likeCount || 1) - 1);
      devStore.set(DEV_REVIEWS, String(reviewId), rev);
    }
  }
}

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
async function addComment(reviewId, { uid, author, avatar, text }) {
  const id = ID.unique();
  const now = new Date().toISOString();
  const payload = {
    reviewId: String(reviewId),
    uid: String(uid),
    author: String(author || 'ผู้ใช้งาน'),
    avatar: String(avatar || ''),
    text: String(text || ''),
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.REVIEW_COMMENTS, id, payload);
      const rev = await getReviewById(reviewId);
      if (rev) {
        await getDatabases().updateDocument(databaseId, COLLECTIONS.REVIEWS, sanitizeId(reviewId), {
          commentCount: (rev.commentCount || 0) + 1,
        });
      }
      return formatDoc(doc);
    } catch (err) {
      console.warn('[review.model] Appwrite addComment failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_COMMENTS, id, record);
  const rev = devStore.get(DEV_REVIEWS, String(reviewId));
  if (rev) {
    rev.commentCount = (rev.commentCount || 0) + 1;
    devStore.set(DEV_REVIEWS, String(reviewId), rev);
  }
  return record;
}

async function getCommentsByReview(reviewId) {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.REVIEW_COMMENTS, [
        Query.equal('reviewId', String(reviewId)),
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch (err) {
      console.warn('[review.model] Appwrite getCommentsByReview failed:', err.message);
    }
  }

  const list = devStore.list(DEV_COMMENTS).filter((c) => c.reviewId === String(reviewId));
  return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function deleteComment(commentId) {
  let existing = await getCommentById(commentId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.REVIEW_COMMENTS, sanitizeId(commentId));
      if (existing) {
        const rev = await getReviewById(existing.reviewId);
        if (rev) {
          await getDatabases().updateDocument(databaseId, COLLECTIONS.REVIEWS, sanitizeId(existing.reviewId), {
            commentCount: Math.max(0, (rev.commentCount || 1) - 1),
          });
        }
      }
      return existing;
    } catch (err) {
      if (err.code !== 404) console.warn('[review.model] Appwrite deleteComment failed:', err.message);
    }
  }

  existing = devStore.get(DEV_COMMENTS, String(commentId));
  if (existing) {
    devStore.delete(DEV_COMMENTS, String(commentId));
    const rev = devStore.get(DEV_REVIEWS, String(existing.reviewId));
    if (rev) {
      rev.commentCount = Math.max(0, (rev.commentCount || 1) - 1);
      devStore.set(DEV_REVIEWS, String(existing.reviewId), rev);
    }
  }
  return existing;
}

async function getCommentById(commentId) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.REVIEW_COMMENTS, sanitizeId(commentId));
      return formatDoc(doc);
    } catch {
      return null;
    }
  }
  return devStore.get(DEV_COMMENTS, String(commentId)) || null;
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
