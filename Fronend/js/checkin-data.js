let MNX_CHECKIN_FEED_CACHE = null;
let MNX_CHECKIN_NOTES_CACHE = null;

async function mnxFetchCheckinFeed() {
  try {
    const data = await window.MNX_API.get('/checkin/feed');
    MNX_CHECKIN_FEED_CACHE = data.posts.map((p) => ({ ...p, createdAt: new Date(p.createdAt).getTime() }));
  } catch (err) {
    console.error('[checkin-data.js] Failed to fetch feed:', err.message);
    MNX_CHECKIN_FEED_CACHE = [];
  }
  document.dispatchEvent(new CustomEvent('checkin:updated'));
  return MNX_CHECKIN_FEED_CACHE;
}

async function mnxGetCheckinFeed() {
  if (!MNX_CHECKIN_FEED_CACHE) return mnxFetchCheckinFeed();
  return MNX_CHECKIN_FEED_CACHE;
}

function mnxInvalidateCheckinFeed() {
  MNX_CHECKIN_FEED_CACHE = null;
}

async function mnxAddCheckinPost({ place, placeId, photos, video, hashtags, rating, visibility }) {
  const session = window.MNX_AUTH?.getSession();
  if (!session) return { ok: false, reason: 'not-signed-in' };
  if (!place || !place.trim()) return { ok: false, reason: 'no-place' };
  const hasPhotos = Array.isArray(photos) && photos.length > 0;
  if (!hasPhotos && !video) return { ok: false, reason: 'no-media', message: 'กรุณาเลือกรูปภาพหรือวิดีโออย่างน้อย 1 รายการ' };

  const form = new FormData();
  form.append('place', place.trim());
  if (placeId) form.append('placeId', placeId);
  form.append('hashtags', JSON.stringify(hashtags || []));
  if (rating) form.append('rating', String(rating));
  form.append('visibility', visibility === 'private' ? 'private' : 'public');
  if (hasPhotos) {
    photos.slice(0, 5).forEach((file) => form.append('photos', file));
  }
  if (video) {
    form.append('video', video);
  }

  try {
    const data = await window.MNX_API.postForm('/checkin', form);
    mnxInvalidateCheckinFeed();
    return { ok: true, post: data.post };
  } catch (err) {
    return { ok: false, reason: 'api-error', message: err.message };
  }
}

async function mnxDeleteCheckinPost(postId) {
  try {
    await window.MNX_API.delete(`/checkin/${encodeURIComponent(postId)}`);
    mnxInvalidateCheckinFeed();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/* ----------------------------------------------------------
   Likes
---------------------------------------------------------- */
async function mnxLikeCheckinPost(postId) {
  if (!window.MNX_AUTH?.isLoggedIn()) throw new Error('กรุณาเข้าสู่ระบบก่อนกดหัวใจ');
  await window.MNX_API.post(`/checkin/${encodeURIComponent(postId)}/like`);
  mnxInvalidateCheckinFeed();
}

async function mnxUnlikeCheckinPost(postId) {
  if (!window.MNX_AUTH?.isLoggedIn()) throw new Error('กรุณาเข้าสู่ระบบก่อนกดหัวใจ');
  await window.MNX_API.delete(`/checkin/${encodeURIComponent(postId)}/like`);
  mnxInvalidateCheckinFeed();
}

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
async function mnxGetCheckinComments(postId) {
  try {
    const data = await window.MNX_API.get(`/checkin/${encodeURIComponent(postId)}/comments`);
    return data.comments.map((c) => ({ ...c, createdAt: new Date(c.createdAt).getTime() }));
  } catch (err) {
    console.error('[checkin-data.js] Failed to fetch comments:', err.message);
    return [];
  }
}

async function mnxAddCheckinComment(postId, text) {
  if (!window.MNX_AUTH?.isLoggedIn()) return { ok: false, reason: 'not-signed-in' };
  if (!text || !text.trim()) return { ok: false, reason: 'empty-text' };
  try {
    const data = await window.MNX_API.post(`/checkin/${encodeURIComponent(postId)}/comments`, { text: text.trim() });
    mnxInvalidateCheckinFeed();
    return { ok: true, comment: data.comment };
  } catch (err) {
    return { ok: false, reason: 'api-error', message: err.message };
  }
}

async function mnxDeleteCheckinComment(postId, commentId) {
  try {
    await window.MNX_API.delete(`/checkin/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`);
    mnxInvalidateCheckinFeed();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/* ----------------------------------------------------------
   Private notes (owner-only journal, never in the public feed)
---------------------------------------------------------- */
async function mnxFetchMyNotes() {
  try {
    const data = await window.MNX_API.get('/checkin/notes/mine');
    MNX_CHECKIN_NOTES_CACHE = data.notes.map((n) => ({ ...n, createdAt: new Date(n.createdAt).getTime() }));
  } catch (err) {
    console.error('[checkin-data.js] Failed to fetch notes:', err.message);
    MNX_CHECKIN_NOTES_CACHE = [];
  }
  return MNX_CHECKIN_NOTES_CACHE;
}

async function mnxAddCheckinNote({ place, title, body }) {
  if (!window.MNX_AUTH?.isLoggedIn()) return { ok: false, reason: 'not-signed-in' };
  try {
    const data = await window.MNX_API.post('/checkin/notes', { place, title, body });
    MNX_CHECKIN_NOTES_CACHE = null;
    return { ok: true, note: data.note };
  } catch (err) {
    return { ok: false, reason: 'api-error', message: err.message };
  }
}

async function mnxDeleteCheckinNote(noteId) {
  try {
    await window.MNX_API.delete(`/checkin/notes/${encodeURIComponent(noteId)}`);
    MNX_CHECKIN_NOTES_CACHE = null;
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

window.MNX_CHECKIN = {
  getFeed: mnxGetCheckinFeed,
  fetchFeed: mnxFetchCheckinFeed,
  invalidateFeed: mnxInvalidateCheckinFeed,
  addPost: mnxAddCheckinPost,
  deletePost: mnxDeleteCheckinPost,
  like: mnxLikeCheckinPost,
  unlike: mnxUnlikeCheckinPost,
  getComments: mnxGetCheckinComments,
  addComment: mnxAddCheckinComment,
  deleteComment: mnxDeleteCheckinComment,
  fetchMyNotes: mnxFetchMyNotes,
  addNote: mnxAddCheckinNote,
  deleteNote: mnxDeleteCheckinNote,
};
