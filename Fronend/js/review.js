const MAX_PHOTOS = 5;
const MAX_RATING = 5;

let mnxComposerPhotoFiles = [];
let mnxComposerPhotoPreviews = []; 
let mnxComposerVideoFile = null;
let mnxComposerVideoPreview = null;
let mnxComposerVideoDuration = 0;
let mnxComposerRating = 0;
let mnxComposerVisibility = 'public';
let mnxFeedFilter = 'all'; 
let mnxCheckinSubmitting = false;

function mnxAbsoluteUploadUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  const apiOrigin = window.MNX_API.baseUrl.replace(/\/api\/?$/, '');
  return `${apiOrigin}${relativeUrl}`;
}

/* ----------------------------------------------------------
   Composer — photo upload slots (max 5, real File objects)
---------------------------------------------------------- */
function renderUploadSlots() {
  const wrap = document.getElementById('upload-slots');
  const countEl = document.getElementById('upload-count');
  if (!wrap) return;

  wrap.innerHTML = '';
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const preview = mnxComposerPhotoPreviews[i];
    const slot = document.createElement('div');
    slot.className = 'upload-slot';
    if (preview) {
      slot.innerHTML = `<img src="${preview}" alt="รูปที่ ${i + 1}" /><button type="button" class="upload-slot__remove" data-index="${i}" aria-label="ลบรูป">✕</button>`;
    } else {
      slot.innerHTML = `<label for="upload-input" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;cursor:pointer;gap:4px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#c9a227" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span style="font-size:0.65rem;color:#c9a227;font-weight:600;">เพิ่มรูป</span>
      </label>`;
    }
    wrap.appendChild(slot);
  }

  wrap.querySelectorAll('.upload-slot__remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.index);
      mnxComposerPhotoFiles.splice(idx, 1);
      mnxComposerPhotoPreviews.splice(idx, 1);
      renderUploadSlots();
    });
  });

  if (countEl) countEl.textContent = `อัปโหลดแล้ว ${mnxComposerPhotoFiles.length}/${MAX_PHOTOS} รูป`;
}

function initUploadInput() {
  const input = document.getElementById('upload-input');
  if (!input) return;

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - mnxComposerPhotoFiles.length;
    files.slice(0, remaining).forEach((file) => {
      mnxComposerPhotoFiles.push(file);
      const reader = new FileReader();
      reader.onload = () => {
        mnxComposerPhotoPreviews.push(reader.result);
        renderUploadSlots();
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  });
}

/* ----------------------------------------------------------
   Composer — video upload & duration validator (max 1 min)
---------------------------------------------------------- */
function initVideoUploadInput() {
  const btn = document.getElementById('upload-video-btn');
  const input = document.getElementById('upload-video-input');
  const preview = document.getElementById('upload-video-preview');
  const videoEl = document.getElementById('upload-video-element');
  const nameEl = document.getElementById('upload-video-name');
  const durationEl = document.getElementById('upload-video-duration');
  const sizeEl = document.getElementById('upload-video-size');
  const removeBtn = document.getElementById('upload-video-remove');

  if (!input) return;

  // Fallback click handler if not using label trigger
  btn?.addEventListener('click', (e) => {
    if (btn.tagName.toLowerCase() !== 'label') {
      input.click();
    }
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      alert('ไฟล์วิดีโอมีขนาดใหญ่เกินไป (จำกัดไม่เกิน 80 MB)');
      input.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    mnxComposerVideoFile = file;
    mnxComposerVideoDuration = 0;
    mnxComposerVideoPreview = objectUrl;

    if (nameEl) nameEl.textContent = file.name || 'video_clip.mp4';
    if (sizeEl) sizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    if (durationEl) durationEl.textContent = '🎬 วิดีโอ';
    if (videoEl) {
      videoEl.src = objectUrl;
      try {
        videoEl.currentTime = 0.2;
        videoEl.load();
      } catch (_) {}
    }

    if (btn) btn.style.display = 'none';
    if (preview) preview.style.display = 'flex';

    // Verify video duration without blocking UI
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;

    let checked = false;
    const handleDuration = () => {
      if (checked) return;
      checked = true;
      const duration = tempVideo.duration;
      if (duration && !isNaN(duration) && duration > 0) {
        if (duration > 61) {
          alert(`วิดีโอต้องมีความยาวไม่เกิน 1 นาที (คลิปนี้ยาว ${Math.round(duration)} วินาที)`);
          removeBtn?.click();
          return;
        }
        mnxComposerVideoDuration = Math.round(duration);
        if (durationEl) {
          const mins = Math.floor(duration / 60);
          const secs = Math.floor(duration % 60);
          durationEl.textContent = `🎬 ${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      }
    };

    tempVideo.onloadedmetadata = handleDuration;
    tempVideo.oncanplay = handleDuration;
    tempVideo.ondurationchange = handleDuration;
    try {
      tempVideo.load();
    } catch (_) {}
  });

  removeBtn?.addEventListener('click', (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    mnxComposerVideoFile = null;
    mnxComposerVideoDuration = 0;
    if (mnxComposerVideoPreview) {
      try { URL.revokeObjectURL(mnxComposerVideoPreview); } catch (_) {}
      mnxComposerVideoPreview = null;
    }
    input.value = '';
    if (videoEl) videoEl.src = '';
    if (preview) preview.style.display = 'none';
    if (btn) btn.style.display = 'flex';
  });
}

/* ----------------------------------------------------------
   Composer — hashtags
---------------------------------------------------------- */
let mnxComposerHashtags = [];

function renderHashtagChips() {
  const wrap = document.getElementById('hashtag-chips');
  if (!wrap) return;
  wrap.innerHTML = mnxComposerHashtags.map((tag, i) => `
    <span class="hashtag-chip">${tag}<button data-index="${i}" aria-label="ลบแฮชแท็ก">✕</button></span>
  `).join('');
  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      mnxComposerHashtags.splice(Number(btn.dataset.index), 1);
      renderHashtagChips();
    });
  });
}

function initHashtagInput() {
  const input = document.getElementById('hashtag-input');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    let val = input.value.trim();
    if (!val) return;
    if (!val.startsWith('#')) val = '#' + val;
    if (mnxComposerHashtags.length >= 10) return;
    if (!mnxComposerHashtags.includes(val)) mnxComposerHashtags.push(val);
    input.value = '';
    renderHashtagChips();
  });
}

/* ----------------------------------------------------------
   Composer — star rating input
---------------------------------------------------------- */
function initRatingInput() {
  const wrap = document.getElementById('rating-input');
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: MAX_RATING }, (_, i) => `<button data-star="${i + 1}" aria-label="ให้ ${i + 1} ดาว">★</button>`).join('');

  const paint = () => {
    wrap.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.star) <= mnxComposerRating);
    });
  };

  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      mnxComposerRating = Number(btn.dataset.star) === mnxComposerRating ? 0 : Number(btn.dataset.star);
      paint();
    });
  });
  paint();
}

/* ----------------------------------------------------------
   Composer — visibility toggle (ส่วนตัว / สาธารณะ)
---------------------------------------------------------- */
function initVisibilityToggle() {
  const wrap = document.getElementById('visibility-toggle');
  if (!wrap) return;
  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      mnxComposerVisibility = btn.dataset.visibility;
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });
}

/* ----------------------------------------------------------
   Composer — submit new post (real upload to Backend)
---------------------------------------------------------- */
function mnxResetComposer() {
  mnxComposerPhotoFiles = [];
  mnxComposerPhotoPreviews = [];
  mnxComposerVideoFile = null;
  mnxComposerVideoDuration = 0;
  if (mnxComposerVideoPreview) {
    URL.revokeObjectURL(mnxComposerVideoPreview);
    mnxComposerVideoPreview = null;
  }
  mnxComposerHashtags = [];
  mnxComposerRating = 0;
  mnxComposerVisibility = 'public';
  const placeInput = document.getElementById('composer-place');
  if (placeInput) placeInput.value = '';
  const videoInput = document.getElementById('upload-video-input');
  if (videoInput) videoInput.value = '';
  const videoPreview = document.getElementById('upload-video-preview');
  if (videoPreview) videoPreview.style.display = 'none';
  const videoBtn = document.getElementById('upload-video-btn');
  if (videoBtn) videoBtn.style.display = 'flex';
  const videoEl = document.getElementById('upload-video-element');
  if (videoEl) videoEl.src = '';

  renderUploadSlots();
  renderHashtagChips();
  initRatingInput();
  document.querySelectorAll('#visibility-toggle button').forEach((b, i) => b.classList.toggle('is-active', i === 0));
}

function initComposerSubmit() {
  const btn = document.getElementById('composer-submit');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (mnxCheckinSubmitting) return;
    const session = window.MNX_AUTH?.getSession();
    if (!session) return; // guarded by lock overlay, but double-check

    const placeInput = document.getElementById('composer-place');
    const place = placeInput?.value.trim();

    if (!mnxComposerPhotoFiles.length && !mnxComposerVideoFile) {
      alert('กรุณาอัปโหลดรูปภาพหรือวิดีโออย่างน้อย 1 รายการ');
      return;
    }
    if (!place) {
      alert('กรุณาระบุชื่อสถานที่');
      return;
    }

    mnxCheckinSubmitting = true;
    btn.disabled = true;
    btn.textContent = 'กำลังโพสต์...';

    const result = await window.MNX_CHECKIN.addPost({
      place,
      photos: mnxComposerPhotoFiles,
      video: mnxComposerVideoFile,
      hashtags: mnxComposerHashtags,
      rating: mnxComposerRating || null,
      visibility: mnxComposerVisibility,
    });

    mnxCheckinSubmitting = false;
    btn.disabled = false;
    btn.textContent = 'โพสต์เช็คอิน';

    if (!result.ok) {
      alert(result.message || 'โพสต์เช็คอินไม่สำเร็จ กรุณาลองใหม่');
      return;
    }

    mnxResetComposer();
    await renderFeed();
  });
}

/* ----------------------------------------------------------
   Lock overlay — shown over composer when signed out
---------------------------------------------------------- */
function renderComposerLock() {
  const composer = document.getElementById('composer');
  const existing = composer?.querySelector('.lock-overlay');
  const isLoggedIn = window.MNX_AUTH?.isLoggedIn();

  if (isLoggedIn) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.className = 'lock-overlay';
  overlay.innerHTML = `
    <div class="lock-overlay__icon"></div>
    <p>เข้าสู่ระบบเพื่อเช็คอินและแชร์ประสบการณ์การเที่ยวของคุณ</p>
    <button class="btn btn-gold btn-sm" data-auth-open="login">เข้าสู่ระบบ / สมัครสมาชิก</button>
  `;
  composer?.appendChild(overlay);
}

/* ----------------------------------------------------------
   Feed — render real posts (public to all; private to owner only)
---------------------------------------------------------- */
function mnxTimeAgo(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  return `${Math.round(diffHr / 24)} วันที่แล้ว`;
}

function buildFeedCardMediaHtml(p) {
  const mediaItems = [];

  // If post has a video, add it as the primary or first slide
  if (p.video?.url) {
    const videoSrc = mnxAbsoluteUploadUrl(p.video.url);
    const posterSrc = p.video.posterUrl ? mnxAbsoluteUploadUrl(p.video.posterUrl) : '';
    const duration = p.video.durationSec ? `${Math.floor(p.video.durationSec / 60)}:${(p.video.durationSec % 60).toString().padStart(2, '0')}` : '';
    mediaItems.push({
      type: 'video',
      html: `
        <div class="post-card__media-slide post-card__media-slide--video is-active">
          <video class="post-card__video-player" src="${videoSrc}" poster="${posterSrc}" playsinline preload="metadata" loop></video>
          <button class="post-card__video-play-btn" aria-label="เล่นวิดีโอ">▶</button>
          <div class="post-card__video-badge">🎬 ${duration || 'วิดีโอ'}</div>
        </div>
      `,
    });
  }

  // Add photos
  (p.photos || []).forEach((src, idx) => {
    const isFirst = mediaItems.length === 0;
    mediaItems.push({
      type: 'photo',
      html: `<img src="${mnxAbsoluteUploadUrl(src)}" class="post-card__media-slide post-card__media-slide--photo ${isFirst ? 'is-active' : ''}" alt="${p.place}" loading="lazy" />`,
    });
  });

  if (!mediaItems.length) {
    return `<div class="post-card__gallery"><div class="post-card__media-empty">ไม่มีสื่อ</div></div>`;
  }

  const slidesHtml = mediaItems.map((m) => m.html).join('');
  const navHtml = mediaItems.length > 1 ? `
    <button class="post-card__gallery-arrow post-card__gallery-arrow--prev" aria-label="ก่อนหน้า">‹</button>
    <button class="post-card__gallery-arrow post-card__gallery-arrow--next" aria-label="ถัดไป">›</button>
    <div class="post-card__gallery-nav">${mediaItems.map((m, i) => `<span class="${i === 0 ? 'is-active' : ''}">${m.type === 'video' ? '🎬' : ''}</span>`).join('')}</div>
  ` : '';

  return `
    <div class="post-card__gallery" data-active="0" data-total="${mediaItems.length}">
      ${slidesHtml}
      ${navHtml}
      ${p.visibility === 'private' ? '<span class="post-card__privacy-badge">ส่วนตัว</span>' : ''}
    </div>
  `;
}

async function renderFeed() {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;

  grid.innerHTML = `<p class="notes-empty">กำลังโหลด...</p>`;

  const session = window.MNX_AUTH?.getSession();
  const myUid = session?.uid;

  let posts = await window.MNX_CHECKIN.getFeed();

  if (mnxFeedFilter === 'public') posts = posts.filter((p) => p.visibility === 'public');
  if (mnxFeedFilter === 'mine') posts = posts.filter((p) => p.uid === myUid);

  if (!posts.length) {
    grid.innerHTML = `<p class="notes-empty">ยังไม่มีโพสต์ในหมวดนี้ เป็นคนแรกที่เช็คอินเลย!</p>`;
    document.dispatchEvent(new CustomEvent('app:content-updated'));
    return;
  }

  grid.innerHTML = posts.map((p) => {
    let avatarUrl = p.avatar;
    if (!avatarUrl) {
      avatarUrl = '/Fronend/assets/images/avatar-placeholder.png';
    } else if (avatarUrl.startsWith('/uploads/')) {
      avatarUrl = mnxAbsoluteUploadUrl(avatarUrl);
    } else if (/^https?:\/\//.test(avatarUrl)) {
      // external URL (Google etc.) — use as-is
    } else {
      avatarUrl = '/Fronend/assets/images/avatar-placeholder.png';
    }
    const avatarSafe = window.mnxSanitizeUrl ? window.mnxSanitizeUrl(avatarUrl) : avatarUrl;

    return `
    <article class="post-card" data-post-id="${p.id}">
      ${buildFeedCardMediaHtml(p)}
      <div class="post-card__body">
        <div class="post-card__author">
          <img src="${avatarSafe}" alt="${p.author}" onerror="this.src='/Fronend/assets/images/avatar-placeholder.png'" />
          <div>
            <div class="post-card__author-name">${p.author}</div>
            <div class="post-card__time">${mnxTimeAgo(p.createdAt)}</div>
          </div>
        </div>
        <div class="post-card__place">${p.place}</div>
        ${p.rating ? `<div class="post-card__stars">${'★'.repeat(p.rating)}${'☆'.repeat(MAX_RATING - p.rating)}</div>` : ''}
        ${p.hashtags?.length ? `<div class="post-card__hashtags">${p.hashtags.map((h) => `<span>${h}</span>`).join(' ')}</div>` : ''}
        <div class="post-card__actions">
          <button class="post-card__action-btn post-card__like ${p.likedByMe ? 'is-liked' : ''}">
            ${p.likedByMe ? '♥' : '♡'} <span>${p.likeCount || 0}</span>
          </button>
          <button class="post-card__action-btn post-card__comment-toggle"><span>${p.commentCount || 0}</span></button>
          ${p.uid === myUid ? `<button class="post-card__action-btn post-card__delete" aria-label="ลบโพสต์"></button>` : ''}
        </div>
        <div class="post-card__comments">
          <div class="post-card__comments-list" data-loaded="0"></div>
          <form class="post-card__comment-form">
            <input type="text" placeholder="แสดงความคิดเห็น..." maxlength="300" />
            <button type="submit">ส่ง</button>
          </form>
        </div>
      </div>
    </article>
  `;
  }).join('');


  wireFeedCardEvents(grid);
  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

function wireFeedCardEvents(grid) {
  // Observer for auto-playing post-card videos
  const feedVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const videoSlide = entry.target;
      const video = videoSlide.querySelector('video');
      const playBtn = videoSlide.querySelector('.post-card__video-play-btn');
      if (!video) return;

      if (entry.isIntersecting) {
        // Only autoplay if it's the active slide
        if (videoSlide.classList.contains('is-active')) {
          video.play().then(() => {
            playBtn?.classList.add('is-playing');
          }).catch(() => {});
        }
      } else {
        video.pause();
        playBtn?.classList.remove('is-playing');
      }
    });
  }, { threshold: 0.6 });

  grid.querySelectorAll('.post-card').forEach((card) => {
    const postId = card.dataset.postId;
    const gallery = card.querySelector('.post-card__gallery');
    const slides = [...card.querySelectorAll('.post-card__media-slide')];
    const dots = [...card.querySelectorAll('.post-card__gallery-nav span')];

    // Video playback controls inside post card
    const videoSlide = card.querySelector('.post-card__media-slide--video');
    if (videoSlide) {
      feedVideoObserver.observe(videoSlide);
      const video = videoSlide.querySelector('video');
      const playBtn = videoSlide.querySelector('.post-card__video-play-btn');

      const togglePlay = (e) => {
        e?.stopPropagation();
        if (!video) return;
        if (video.paused) {
          // Pause all other feed videos
          document.querySelectorAll('.post-card__video-player').forEach((v) => {
            if (v !== video) {
              v.pause();
              v.closest('.post-card__media-slide--video')?.querySelector('.post-card__video-play-btn')?.classList.remove('is-playing');
            }
          });
          video.play().then(() => {
            playBtn?.classList.add('is-playing');
          }).catch(() => {});
        } else {
          video.pause();
          playBtn?.classList.remove('is-playing');
        }
      };

      playBtn?.addEventListener('click', togglePlay);
      video?.addEventListener('click', togglePlay);
      video?.addEventListener('ended', () => {
        playBtn?.classList.remove('is-playing');
      });
    }

    const goTo = (idx) => {
      if (!slides.length) return;
      const clamped = (idx + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === clamped);
        // If moving away from video, pause it
        if (i !== clamped && slide.classList.contains('post-card__media-slide--video')) {
          const v = slide.querySelector('video');
          v?.pause();
          slide.querySelector('.post-card__video-play-btn')?.classList.remove('is-playing');
        }
        // If moving TO video, play it
        if (i === clamped && slide.classList.contains('post-card__media-slide--video')) {
          const v = slide.querySelector('video');
          v?.play().then(() => {
            slide.querySelector('.post-card__video-play-btn')?.classList.add('is-playing');
          }).catch(() => {});
        }
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === clamped));
      if (gallery) gallery.dataset.active = clamped;
    };

    card.querySelector('.post-card__gallery-arrow--prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo(Number(gallery.dataset.active || 0) - 1);
    });
    card.querySelector('.post-card__gallery-arrow--next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo(Number(gallery.dataset.active || 0) + 1);
    });

    const likeBtn = card.querySelector('.post-card__like');
    likeBtn?.addEventListener('click', async () => {
      if (!window.MNX_AUTH?.isLoggedIn()) {
        alert('เข้าสู่ระบบเพื่อกดหัวใจโพสต์นี้');
        return;
      }
      likeBtn.disabled = true;
      const wasLiked = likeBtn.classList.contains('is-liked');
      try {
        if (wasLiked) {
          await window.MNX_CHECKIN.unlike(postId);
        } else {
          await window.MNX_CHECKIN.like(postId);
        }
        const countEl = likeBtn.querySelector('span');
        const count = Number(countEl.textContent || 0) + (wasLiked ? -1 : 1);
        countEl.textContent = Math.max(0, count);
        likeBtn.classList.toggle('is-liked', !wasLiked);
        likeBtn.innerHTML = `${!wasLiked ? '♥' : '♡'} <span>${Math.max(0, count)}</span>`;
      } catch (err) {
        alert(err.message || 'ทำรายการไม่สำเร็จ');
      } finally {
        likeBtn.disabled = false;
      }
    });

    const deleteBtn = card.querySelector('.post-card__delete');
    deleteBtn?.addEventListener('click', async () => {
      if (!confirm('ต้องการลบโพสต์นี้หรือไม่? การลบไม่สามารถย้อนกลับได้')) return;
      const result = await window.MNX_CHECKIN.deletePost(postId);
      if (!result.ok) {
        alert(result.message || 'ลบโพสต์ไม่สำเร็จ');
        return;
      }
      await renderFeed();
    });

    const commentToggle = card.querySelector('.post-card__comment-toggle');
    const commentsPanel = card.querySelector('.post-card__comments');
    const commentsList = card.querySelector('.post-card__comments-list');
    commentToggle?.addEventListener('click', async () => {
      const isOpening = !commentsPanel.classList.contains('is-open');
      commentsPanel.classList.toggle('is-open');
      if (isOpening && commentsList.dataset.loaded !== '1') {
        commentsList.innerHTML = `<p class="post-card__comment-loading">กำลังโหลด...</p>`;
        const comments = await window.MNX_CHECKIN.getComments(postId);
        commentsList.innerHTML = comments.length
          ? comments.map((c) => `<div class="post-card__comment-item"><strong>${c.author}</strong>${c.text}</div>`).join('')
          : `<p class="post-card__comment-loading">ยังไม่มีความคิดเห็น</p>`;
        commentsList.dataset.loaded = '1';
      }
    });

    const commentForm = card.querySelector('.post-card__comment-form');
    commentForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.MNX_AUTH?.isLoggedIn()) {
        alert('เข้าสู่ระบบเพื่อแสดงความคิดเห็น');
        return;
      }
      const input = commentForm.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      const submitBtn = commentForm.querySelector('button');
      submitBtn.disabled = true;
      const result = await window.MNX_CHECKIN.addComment(postId, text);
      submitBtn.disabled = false;
      if (!result.ok) {
        alert(result.message || 'ส่งความคิดเห็นไม่สำเร็จ');
        return;
      }
      input.value = '';

      const emptyMsg = commentsList.querySelector('.post-card__comment-loading');
      if (emptyMsg) emptyMsg.remove();
      commentsList.insertAdjacentHTML('beforeend', `<div class="post-card__comment-item"><strong>${result.comment.author}</strong>${result.comment.text}</div>`);
      const toggleCountEl = commentToggle.querySelector('span');
      toggleCountEl.textContent = Number(toggleCountEl.textContent || 0) + 1;
    });
  });
}

function initFeedFilter() {
  const wrap = document.getElementById('feed-filter');
  if (!wrap) return;
  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      mnxFeedFilter = btn.dataset.filter;
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      await renderFeed();
    });
  });
}

async function renderNotesSection() {
  const section = document.getElementById('notes-section');
  if (!section) return;

  const session = window.MNX_AUTH?.getSession();
  const editor = document.getElementById('note-editor');
  const grid = document.getElementById('notes-grid');

  if (!session) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  grid.innerHTML = `<p class="notes-empty">กำลังโหลด...</p>`;

  const notes = await window.MNX_CHECKIN.fetchMyNotes();
  if (!notes.length) {
    grid.innerHTML = `<p class="notes-empty">ยังไม่มีบันทึกส่วนตัว เริ่มเขียนโน๊ตแรกของคุณได้เลย</p>`;
  } else {
    grid.innerHTML = notes.map((n) => `
      <div class="note-card" data-note-id="${n.id}">
        <button class="note-card__delete" data-note-id="${n.id}" aria-label="ลบบันทึก">✕</button>
        <div class="note-card__place">${n.place}</div>
        <h4 class="note-card__title">${n.title}</h4>
        <p class="note-card__body">${n.body}</p>
        <div class="note-card__date">${new Date(n.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.note-card__delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await window.MNX_CHECKIN.deleteNote(btn.dataset.noteId);
        if (!result.ok) {
          alert(result.message || 'ลบบันทึกไม่สำเร็จ');
          return;
        }
        await renderNotesSection();
      });
    });
  }

  editor?.querySelector('.note-editor__submit')?.addEventListener('click', async () => {
    const place = document.getElementById('note-place').value.trim();
    const title = document.getElementById('note-title').value.trim();
    const body = document.getElementById('note-body').value.trim();
    if (!place || !title || !body) {
      alert('กรุณากรอกสถานที่ ชื่อบันทึก และรายละเอียดให้ครบ');
      return;
    }
    const result = await window.MNX_CHECKIN.addNote({ place, title, body });
    if (!result.ok) {
      alert(result.message || 'บันทึกไม่สำเร็จ');
      return;
    }
    document.getElementById('note-place').value = '';
    document.getElementById('note-title').value = '';
    document.getElementById('note-body').value = '';
    await renderNotesSection();
  }, { once: true });

  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

function initAvatarSwap() {
  const editBtn = document.getElementById('profile-avatar-edit');
  const input = document.getElementById('profile-avatar-input');
  const img = document.getElementById('profile-avatar-img');
  if (!editBtn || !input || !img) return;

  editBtn.addEventListener('click', () => {
    if (editBtn.disabled) return;
    input.click();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const prevSrc = img.src;
    img.style.opacity = '0.5';
    editBtn.disabled = true;

    try {
      const user = await window.MNX_AUTH?.updateAvatar(file);
      if (user && user.avatar) {
        img.src = window.MNX_AUTH.getAvatarUrl(user.avatar);
      }
    } catch (err) {
      img.src = prevSrc;
      alert(err.message || 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้');
    } finally {
      img.style.opacity = '';
      editBtn.disabled = false;
      input.value = '';
    }
  });
}

/* ----------------------------------------------------------
   Render the mini profile card (or a signed-out placeholder)
---------------------------------------------------------- */
function renderProfileCard() {
  const card = document.getElementById('profile-card');
  if (!card) return;
  const session = window.MNX_AUTH?.getSession();

  if (!session) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';

  const avatarImg = document.getElementById('profile-avatar-img');
  const nameEl = document.getElementById('profile-name');
  const googleNote = document.getElementById('profile-google-note');

  if (nameEl) nameEl.textContent = session.name || 'ผู้ใช้งาน';
  if (googleNote) googleNote.style.display = session.provider === 'google' ? 'inline-flex' : 'none';

  // Always resolve avatar fresh from server URL
  const avatarUrl = window.MNX_AUTH?.getAvatarUrl
    ? window.MNX_AUTH.getAvatarUrl(session.avatar)
    : '/Fronend/assets/images/avatar-placeholder.png';

  if (avatarImg) {
    avatarImg.src = avatarUrl;
    avatarImg.onerror = () => { avatarImg.src = '/Fronend/assets/images/avatar-placeholder.png'; };
  }
}


/* ----------------------------------------------------------
   Boot
---------------------------------------------------------- */
async function mnxRenderAllAuthDependent() {
  renderComposerLock();
  renderProfileCard();
  window.MNX_CHECKIN.invalidateFeed();
  await renderFeed();
  await renderNotesSection();
}

document.addEventListener('includes:loaded', () => {
  renderUploadSlots();
  initUploadInput();
  initVideoUploadInput();
  renderHashtagChips();
  initHashtagInput();
  initRatingInput();
  initVisibilityToggle();
  initComposerSubmit();
  initFeedFilter();
  initAvatarSwap();

  mnxRenderAllAuthDependent();
});

document.addEventListener('auth:changed', mnxRenderAllAuthDependent);
