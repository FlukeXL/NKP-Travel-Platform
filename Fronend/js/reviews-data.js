const MNX_REVIEWS_CACHE = {};
const MNX_REVIEWS_INFLIGHT = {};
let MNX_VIDEO_FEED_CACHE = null;

function mnxGetReviews(placeId) {
  return MNX_REVIEWS_CACHE[placeId]?.reviews || [];
}

function mnxGetReviewStats(placeId) {
  return MNX_REVIEWS_CACHE[placeId]?.stats || null;
}

async function mnxFetchReviews(placeId, force = false) {
  if (!placeId) return { reviews: [], stats: null };
  if (!force && MNX_REVIEWS_CACHE[placeId]) {
    return MNX_REVIEWS_CACHE[placeId];
  }
  if (!force && MNX_REVIEWS_INFLIGHT[placeId]) {
    return MNX_REVIEWS_INFLIGHT[placeId];
  }

  const fetchPromise = (async () => {
    try {
      const data = await window.MNX_API.get(`/reviews/${encodeURIComponent(placeId)}`);
      MNX_REVIEWS_CACHE[placeId] = {
        reviews: (data.reviews || []).map((r) => ({ ...r, createdAt: new Date(r.createdAt).getTime() })),
        stats: data.stats || null,
      };
    } catch (err) {
      console.warn('[reviews-data.js] Failed to fetch reviews for', placeId, err.message);
      MNX_REVIEWS_CACHE[placeId] = { reviews: [], stats: null };
    } finally {
      delete MNX_REVIEWS_INFLIGHT[placeId];
    }
    return MNX_REVIEWS_CACHE[placeId];
  })();

  MNX_REVIEWS_INFLIGHT[placeId] = fetchPromise;
  return fetchPromise;
}

async function mnxAddReview(placeId, { rating, text, category, photos, video }) {
  const session = window.MNX_AUTH?.getSession();
  if (!session) return { ok: false, reason: 'not-signed-in' };
  if (!rating || rating < 1 || rating > 5) return { ok: false, reason: 'invalid-rating' };
  if (!text || !text.trim()) return { ok: false, reason: 'empty-text' };
  if (!category) return { ok: false, reason: 'no-category' };

  const form = new FormData();
  form.append('rating', String(rating));
  form.append('text', text.trim());
  form.append('category', category);
  (photos || []).slice(0, 5).forEach((file) => form.append('photos', file));
  if (video) form.append('video', video);

  try {
    await window.MNX_API.postForm(`/reviews/${encodeURIComponent(placeId)}`, form);
    await mnxFetchReviews(placeId, true);
    document.dispatchEvent(new CustomEvent('reviews:updated', { detail: { placeId } }));
    mnxInvalidateVideoFeed();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'api-error', message: err.message };
  }
}

async function mnxDeleteReview(placeId, reviewId) {
  try {
    await window.MNX_API.delete(`/reviews/${encodeURIComponent(placeId)}/${encodeURIComponent(reviewId)}`);
    await mnxFetchReviews(placeId, true);
    document.dispatchEvent(new CustomEvent('reviews:updated', { detail: { placeId } }));
    mnxInvalidateVideoFeed();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function mnxFetchVideoFeed(category) {
  try {
    const path = category ? `/reviews/videos?category=${encodeURIComponent(category)}` : '/reviews/videos';
    const data = await window.MNX_API.get(path);
    return data.videos.map((v) => ({ ...v, createdAt: new Date(v.createdAt).getTime() }));
  } catch (err) {
    console.error('[reviews-data.js] Failed to fetch video feed:', err.message);
    return [];
  }
}

async function mnxGetAllVideos() {
  if (!MNX_VIDEO_FEED_CACHE) MNX_VIDEO_FEED_CACHE = await mnxFetchVideoFeed();
  return MNX_VIDEO_FEED_CACHE;
}

async function mnxGetVideosByCategory(slug) {
  const all = await mnxGetAllVideos();
  if (!slug || slug === 'all') return all;
  return all.filter((v) => v.category === slug || (slug === 'restaurant' && v.category === 'food') || (slug === 'food' && v.category === 'restaurant'));
}

function mnxInvalidateVideoFeed() {
  MNX_VIDEO_FEED_CACHE = null;
  document.dispatchEvent(new CustomEvent('videos:updated'));
}

/* ----------------------------------------------------------
   Likes (on a review/video)
---------------------------------------------------------- */
async function mnxLikeReview(placeId, reviewId) {
  if (!window.MNX_AUTH?.isLoggedIn()) throw new Error('กรุณาเข้าสู่ระบบก่อนกดหัวใจ');
  const pid = placeId || 'nakhon-phanom';
  await window.MNX_API.post(`/reviews/${encodeURIComponent(pid)}/${encodeURIComponent(reviewId)}/like`);
  mnxInvalidateVideoFeed();
}

async function mnxUnlikeReview(placeId, reviewId) {
  if (!window.MNX_AUTH?.isLoggedIn()) throw new Error('กรุณาเข้าสู่ระบบก่อนกดหัวใจ');
  const pid = placeId || 'nakhon-phanom';
  await window.MNX_API.delete(`/reviews/${encodeURIComponent(pid)}/${encodeURIComponent(reviewId)}/like`);
  mnxInvalidateVideoFeed();
}

/* ----------------------------------------------------------
   Comments (on a review/video)
---------------------------------------------------------- */
async function mnxGetComments(placeId, reviewId) {
  try {
    const pid = placeId || 'nakhon-phanom';
    const data = await window.MNX_API.get(`/reviews/${encodeURIComponent(pid)}/${encodeURIComponent(reviewId)}/comments`);
    return data.comments.map((c) => ({ ...c, createdAt: new Date(c.createdAt).getTime() }));
  } catch (err) {
    console.error('[reviews-data.js] Failed to fetch comments:', err.message);
    return [];
  }
}

async function mnxAddComment(placeId, reviewId, text) {
  if (!window.MNX_AUTH?.isLoggedIn()) return { ok: false, reason: 'not-signed-in' };
  if (!text || !text.trim()) return { ok: false, reason: 'empty-text' };
  try {
    const pid = placeId || 'nakhon-phanom';
    const data = await window.MNX_API.post(`/reviews/${encodeURIComponent(pid)}/${encodeURIComponent(reviewId)}/comments`, { text: text.trim() });
    mnxInvalidateVideoFeed();
    return { ok: true, comment: data.comment };
  } catch (err) {
    return { ok: false, reason: 'api-error', message: err.message };
  }
}

async function mnxDeleteComment(placeId, reviewId, commentId) {
  try {
    const pid = placeId || 'nakhon-phanom';
    await window.MNX_API.delete(`/reviews/${encodeURIComponent(pid)}/${encodeURIComponent(reviewId)}/comments/${encodeURIComponent(commentId)}`);
    mnxInvalidateVideoFeed();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

window.MNX_REVIEWS = {
  get: mnxGetReviews,
  stats: mnxGetReviewStats,
  add: mnxAddReview,
  fetch: mnxFetchReviews,
  delete: mnxDeleteReview,
  getAllVideos: mnxGetAllVideos,
  getVideosByCategory: mnxGetVideosByCategory,
  invalidateVideoFeed: mnxInvalidateVideoFeed,
  like: mnxLikeReview,
  unlike: mnxUnlikeReview,
  getComments: mnxGetComments,
  addComment: mnxAddComment,
  deleteComment: mnxDeleteComment,
};
