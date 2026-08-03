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

/* Renders a row of 5 star icons as SVG (filled vs outline via a
   "filled" state class) instead of the old ★/☆ character glyphs —
   keeps the star rating visual but drawn with the same inline-SVG
   line-icon language used everywhere else, rather than emoji-style
   platform glyphs. */
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
  els.video.src = mnxAbsoluteUploadUrl(video.video.url);
  els.video.poster = mnxAbsoluteUploadUrl(video.video.posterUrl);
  els.placeName.textContent = place ? place.name : '';
  els.author.textContent = video.author;
  els.avatar.src = video.avatar || '/assets/images/avatar-placeholder.png';
  els.stars.innerHTML = mnxStarSvgRow(video.rating);
  els.caption.textContent = video.text;
  els.likeCount.textContent = video.likeCount || 0;
  els.commentCount.textContent = video.commentCount || 0;
  els.likeBtn.classList.toggle('is-liked', !!video.likedByMe);
  els.viewPlaceBtn.href = place ? '#' : '#';
  els.viewPlaceBtn.dataset.placeOpen = video.placeId;

  mnxRenderVideoComments([]);
  window.MNX_REVIEWS?.getComments(video.placeId, video.id).then((comments) => {
    if (mnxVideoModalCurrent?.id === video.id) mnxRenderVideoComments(comments);
  });

  els.modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  els.video.play().catch(() => {});
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
  commentList.innerHTML = comments.map((c) => `
    <div class="video-modal__comment-item">
      <img src="${c.avatar || '/assets/images/avatar-placeholder.png'}" alt="${c.author}" />
      <div>
        <div class="video-modal__comment-head"><strong>${c.author}</strong><span>${mnxVideoTimeAgoTh(c.createdAt)}</span></div>
        <p>${c.text}</p>
      </div>
    </div>
  `).join('');
}

/** Web Share API when available (mobile-friendly native share sheet),
 * falls back to copy-link so desktop users can still share the URL
 * externally to bring people back to watch on the site. */
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

  container.innerHTML = videos.map((v) => {
    const place = window.mnxGetPlace?.(v.placeId);
    return `
      <div class="video-card" data-review-id="${v.id}">
        <div class="video-card__frame">
          <img src="${mnxAbsoluteUploadUrl(v.video.posterUrl)}" alt="รีวิว ${place?.name || ''}" data-role="poster" draggable="false" />
          <video src="${mnxAbsoluteUploadUrl(v.video.url)}" muted loop playsinline preload="metadata" data-role="video"></video>
          <div class="video-card__gradient"></div>
          <span class="video-card__place-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10Z"/><circle cx="12" cy="11" r="1.8"/></svg>
            ${place?.name || ''}
          </span>
          <div class="video-card__info">
            <div class="video-card__reviewer">
              <img class="video-card__avatar" src="${v.avatar || '/assets/images/avatar-placeholder.png'}" alt="${v.author}" draggable="false" />
              <span class="video-card__reviewer-name">${v.author}</span>
              <span class="video-card__stars">${mnxStarSvgRow(v.rating)}</span>
            </div>
            <p class="video-card__caption">${v.text}</p>
            <div class="video-card__stats">
              <span class="video-card__stat"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12"><path d="M12 20s-7-4.5-9.3-8.8C1.4 8 2.6 4.6 6 4c2-.4 3.8.6 6 3 2.2-2.4 4-3.4 6-3 3.4.6 4.6 4 3.3 7.2C19 15.5 12 20 12 20Z"/></svg>${v.likeCount || 0}</span>
              <span class="video-card__stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M4 5h16v11H8l-4 4V5Z"/></svg>${v.commentCount || 0}</span>
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
      video.play().catch(() => {});
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

window.mnxOpenVideoModal = mnxOpenVideoModal;
window.mnxRenderVideoCards = mnxRenderVideoCards;
