let mnxVideoModalCurrent = null;
let mnxVideoModalReturnFocusEl = null;

function mnxVideoModalEls() {
  return {
    modal: document.getElementById('video-modal'),
    video: document.getElementById('video-modal-player'),
    placeName: document.getElementById('video-modal-place'),
    author: document.getElementById('video-modal-author'),
    avatar: document.getElementById('video-modal-avatar'),
    stars: document.getElementById('video-modal-stars'),
    caption: document.getElementById('video-modal-caption'),
    likeBtn: document.getElementById('video-modal-like'),
    likeCount: document.getElementById('video-modal-like-count'),
    commentCount: document.getElementById('video-modal-comment-count'),
    commentList: document.getElementById('video-modal-comment-list'),
    commentInput: document.getElementById('video-modal-comment-input'),
    commentSubmit: document.getElementById('video-modal-comment-submit'),
    shareBtn: document.getElementById('video-modal-share'),
    viewPlaceBtn: document.getElementById('video-modal-view-place'),
  };
}

function mnxStarSvgRow(rating) {
  const full = Math.round(rating);
  let html = '';
  for (let i = 0; i < 5; i++) {
    const filled = i < full;
    html += `<svg class="mnx-star${filled ? ' is-filled' : ''}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" width="14" height="14"><path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5Z"/></svg>`;
  }
  return html;
}

function mnxVideoTimeAgoTh(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  return `${Math.round(diffHr / 24)} วันที่แล้ว`;
}

async function mnxOpenVideoModal(video) {
  const els = mnxVideoModalEls();
  if (!els.modal) return;

  mnxVideoModalCurrent = video;
  mnxVideoModalReturnFocusEl = document.activeElement;

  const place = window.mnxGetPlace?.(video.placeId);
  const placeName = place ? place.name : (video.placeName || video.placeId || 'นครพนม');
  els.video.src = mnxAbsoluteUploadUrl(video.video.url);
  els.video.poster = mnxAbsoluteUploadUrl(video.video.posterUrl);
  els.placeName.textContent = placeName;
  els.author.textContent = video.author;
  let avatarUrl = video.avatar;
  if (!avatarUrl) {
    avatarUrl = '/Fronend/assets/images/avatar-placeholder.png';
  } else if (avatarUrl.startsWith('/uploads/') && typeof window.mnxAbsoluteUploadUrl === 'function') {
    avatarUrl = window.mnxAbsoluteUploadUrl(avatarUrl);
  }
  els.avatar.src = window.mnxSanitizeUrl ? window.mnxSanitizeUrl(avatarUrl) : avatarUrl;
  els.stars.innerHTML = mnxStarSvgRow(video.rating);
  els.caption.textContent = video.text;
  els.likeCount.textContent = video.likeCount || 0;
  els.commentCount.textContent = video.commentCount || 0;
  els.likeBtn.classList.toggle('is-liked', !!video.likedByMe);
  if (video.placeId && window.mnxGetPlace?.(video.placeId)) {
    els.viewPlaceBtn.style.display = '';
    els.viewPlaceBtn.dataset.placeOpen = video.placeId;
  } else {
    els.viewPlaceBtn.style.display = 'none';
  }

  mnxRenderVideoComments([]);
  window.MNX_REVIEWS?.getComments(video.placeId || 'nakhon-phanom', video.id).then((comments) => {
    if (mnxVideoModalCurrent?.id === video.id) mnxRenderVideoComments(comments);
  });

  els.modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  els.video.play().catch(() => { });
}

function mnxCloseVideoModal() {
  const els = mnxVideoModalEls();
  if (!els.modal) return;
  els.video.pause();
  els.video.src = '';
  els.modal.classList.remove('is-open');
  document.body.style.overflow = '';
  mnxVideoModalCurrent = null;
  mnxVideoModalReturnFocusEl?.focus?.();
}

function mnxRenderVideoComments(comments) {
  const { commentList } = mnxVideoModalEls();
  if (!comments.length) {
    commentList.innerHTML = `<p class="video-modal__comments-empty">ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย!</p>`;
    return;
  }
  const esc = window.mnxEscapeHtml || ((s) => s || '');
  commentList.innerHTML = comments.map((c) => {
    const authorSafe = esc(c.author);
    const textSafe = esc(c.text);
    let avatarUrl = c.avatar;
    if (!avatarUrl) {
      avatarUrl = '/Fronend/assets/images/avatar-placeholder.png';
    } else if (avatarUrl.startsWith('/uploads/') && typeof window.mnxAbsoluteUploadUrl === 'function') {
      avatarUrl = window.mnxAbsoluteUploadUrl(avatarUrl);
    }
    const avatarSafe = window.mnxSanitizeUrl ? window.mnxSanitizeUrl(avatarUrl) : avatarUrl;
    return `
    <div class="video-modal__comment-item">
      <img src="${avatarSafe}" alt="${authorSafe}" />
      <div>
        <div class="video-modal__comment-head"><strong>${authorSafe}</strong><span>${mnxVideoTimeAgoTh(c.createdAt)}</span></div>
        <p>${textSafe}</p>
      </div>
    </div>
  `;
  }).join('');
}

async function mnxShareVideo(video) {
  const shareUrl = `${window.location.origin}/Fronend/pages/videos.html?video=${encodeURIComponent(video.id)}`;
  const place = window.mnxGetPlace?.(video.placeId);
  const shareData = {
    title: `รีวิว ${place?.name || 'สถานที่'} | Nakhon Phanom Lifestyle Travel`,
    text: video.text,
    url: shareUrl,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return { ok: true, method: 'native' };
    } catch {
      return { ok: false };
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    return { ok: true, method: 'clipboard' };
  } catch {
    return { ok: false };
  }
}

function initVideoModal() {
  const els = mnxVideoModalEls();
  if (!els.modal) return;

  document.getElementById('video-modal-close')?.addEventListener('click', mnxCloseVideoModal);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) mnxCloseVideoModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.modal.classList.contains('is-open')) mnxCloseVideoModal();
  });

  els.likeBtn?.addEventListener('click', async () => {
    if (!mnxVideoModalCurrent) return;
    if (!window.MNX_AUTH?.isLoggedIn()) {
      mnxOpenAuthModal('login');
      return;
    }
    const video = mnxVideoModalCurrent;
    const isLiked = els.likeBtn.classList.contains('is-liked');
    els.likeBtn.disabled = true;
    try {
      if (isLiked) {
        await window.MNX_REVIEWS.unlike(video.placeId, video.id);
        video.likeCount = Math.max(0, (video.likeCount || 0) - 1);
      } else {
        await window.MNX_REVIEWS.like(video.placeId, video.id);
        video.likeCount = (video.likeCount || 0) + 1;
      }
      video.likedByMe = !isLiked;
      els.likeBtn.classList.toggle('is-liked', !isLiked);
      els.likeCount.textContent = video.likeCount;
      document.dispatchEvent(new CustomEvent('video:liked', { detail: { videoId: video.id, likeCount: video.likeCount, likedByMe: video.likedByMe } }));
    } catch (err) {
      alert(err.message || 'ไม่สามารถกดหัวใจได้ กรุณาลองใหม่');
    } finally {
      els.likeBtn.disabled = false;
    }
  });

  const submitComment = async () => {
    if (!mnxVideoModalCurrent) return;
    if (!window.MNX_AUTH?.isLoggedIn()) {
      mnxOpenAuthModal('login');
      return;
    }
    const text = els.commentInput.value.trim();
    if (!text) return;
    els.commentSubmit.disabled = true;
    const result = await window.MNX_REVIEWS.addComment(mnxVideoModalCurrent.placeId, mnxVideoModalCurrent.id, text);
    els.commentSubmit.disabled = false;
    if (!result.ok) {
      alert(result.message || 'ไม่สามารถแสดงความคิดเห็นได้ กรุณาลองใหม่');
      return;
    }
    els.commentInput.value = '';
    mnxVideoModalCurrent.commentCount = (mnxVideoModalCurrent.commentCount || 0) + 1;
    els.commentCount.textContent = mnxVideoModalCurrent.commentCount;
    const comments = await window.MNX_REVIEWS.getComments(mnxVideoModalCurrent.placeId, mnxVideoModalCurrent.id);
    mnxRenderVideoComments(comments);
  };

  els.commentSubmit?.addEventListener('click', submitComment);
  els.commentInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  });

  els.shareBtn?.addEventListener('click', async () => {
    if (!mnxVideoModalCurrent) return;
    const result = await mnxShareVideo(mnxVideoModalCurrent);
    const label = document.getElementById('video-modal-share-label');
    if (result.ok && result.method === 'clipboard' && label) {
      label.textContent = 'คัดลอกลิงก์แล้ว';
      setTimeout(() => { label.textContent = 'แชร์วิดีโอ'; }, 2000);
    }
  });

  els.viewPlaceBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    mnxCloseVideoModal();
    setTimeout(() => mnxOpenPlaceModal?.(e.currentTarget.dataset.placeOpen), 300);
  });
}

function mnxRenderVideoCards(container, videos) {
  if (!container) return;

  if (!videos.length) {
    container.innerHTML = `<p class="lifestyle-video-empty">ยังไม่มีวิดีโอรีวิวสำหรับสายนี้ เป็นคนแรกที่อัพโหลดเลย!</p>`;
    return;
  }

  const esc = window.mnxEscapeHtml || ((s) => s || '');
  container.innerHTML = videos.map((v) => {
    const place = window.mnxGetPlace?.(v.placeId);
    const placeNameSafe = esc(place?.name || v.placeName || v.place || 'นครพนม');
    const authorSafe = esc(v.author);
    const textSafe = esc(v.text);
    let avatarUrl = v.avatar;
    if (!avatarUrl) {
      avatarUrl = '/Fronend/assets/images/avatar-placeholder.png';
    } else if (avatarUrl.startsWith('/uploads/') && typeof window.mnxAbsoluteUploadUrl === 'function') {
      avatarUrl = window.mnxAbsoluteUploadUrl(avatarUrl);
    }
    const avatarSafe = window.mnxSanitizeUrl ? window.mnxSanitizeUrl(avatarUrl) : avatarUrl;
    const posterSafe = typeof window.mnxAbsoluteUploadUrl === 'function' ? window.mnxAbsoluteUploadUrl(v.video.posterUrl) : v.video.posterUrl;
    const videoUrlSafe = typeof window.mnxAbsoluteUploadUrl === 'function' ? window.mnxAbsoluteUploadUrl(v.video.url) : v.video.url;

    return `
      <div class="video-card" data-review-id="${v.id}">
        <div class="video-card__frame">
          <img src="${posterSafe}" alt="รีวิว ${placeNameSafe}" data-role="poster" draggable="false" onerror="this.style.display='none'" />
          <video src="${videoUrlSafe}" muted loop playsinline preload="metadata" data-role="video"></video>
          
          <div class="video-card__play-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M8 5.14v14l11-7-11-7z"/></svg>
          </div>

          <div class="video-card__content">
            <span class="video-card__place-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10Z"/><circle cx="12" cy="11" r="2.5"/></svg>
              ${placeNameSafe}
            </span>
            
            <div class="video-card__glass-panel">
              <div class="video-card__reviewer">
                <img class="video-card__avatar" src="${avatarSafe}" alt="${authorSafe}" draggable="false" onerror="this.src='/Fronend/assets/images/avatar-placeholder.png'" />
                <div class="video-card__reviewer-info">
                  <span class="video-card__reviewer-name">${authorSafe}</span>
                  <span class="video-card__stars">${mnxStarSvgRow(v.rating)}</span>
                </div>
              </div>
              <p class="video-card__caption">${textSafe}</p>
              <div class="video-card__stats">
                <span class="video-card__stat"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14"><path d="M12 20s-7-4.5-9.3-8.8C1.4 8 2.6 4.6 6 4c2-.4 3.8.6 6 3 2.2-2.4 4-3.4 6-3 3.4.6 4.6 4 3.3 7.2C19 15.5 12 20 12 20Z"/></svg> ${v.likeCount || 0}</span>
                <span class="video-card__stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M4 5h16v11H8l-4 4V5Z"/></svg> ${v.commentCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.video-card').forEach((card) => {
    const video = card.querySelector('video');
    const reviewId = card.dataset.reviewId;

    card.addEventListener('mouseenter', () => {
      card.classList.add('is-playing');
      video.currentTime = 0;
      video.play().catch(() => { });
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-playing');
      video.pause();
      video.currentTime = 0;
    });
    card.addEventListener('click', () => {
      const full = videos.find((v) => v.id === reviewId);
      if (full) mnxOpenVideoModal(full);
    });
  });
}

document.addEventListener('includes:loaded', initVideoModal);
document.addEventListener('DOMContentLoaded', initVideoModal);

window.mnxOpenVideoModal = mnxOpenVideoModal;
window.mnxRenderVideoCards = mnxRenderVideoCards;
