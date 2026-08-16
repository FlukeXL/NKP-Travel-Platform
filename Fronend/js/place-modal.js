const MNX_PLACE_GALLERY_INTERVAL = 6000;
let mnxPlaceGalleryIndex = 0;
let mnxPlaceGalleryTimer = null;
let mnxCurrentPlaceId = null;
let mnxPlaceReturnFocusEl = null;

function mnxPlaceEls() {
  return {
    modal: document.getElementById('place-modal'),
    track: document.getElementById('place-gallery-track'),
    dots: document.getElementById('place-gallery-dots'),
    counter: document.getElementById('place-gallery-counter'),
    category: document.getElementById('place-modal-category'),
    title: document.getElementById('place-modal-title'),
    stars: document.getElementById('place-modal-stars'),
    ratingValue: document.getElementById('place-modal-rating-value'),
    ratingCount: document.getElementById('place-modal-rating-count'),
    desc: document.getElementById('place-modal-desc'),
    area: document.getElementById('place-modal-area'),
    coords: document.getElementById('place-modal-coords'),
    price: document.getElementById('place-modal-price'),
    reviewCount: document.getElementById('place-modal-review-count'),
    reviewsWrap: document.getElementById('place-modal-reviews-wrap'),
  };
}

const MNX_CATEGORY_LABELS = {
  cafe: 'คาเฟ่',
  restaurant: 'ร้านอาหาร',
  temple: 'วัด/สถานที่ศักดิ์สิทธิ์',
  fitness: 'ออกกำลังกาย',
  nature: 'ธรรมชาติ',
  landmark: 'สถานที่สำคัญ',
  culture: 'วัฒนธรรม',
  mutelu: 'มูเตลู',
  shopping: 'ช้อปปิ้ง',
  event: 'กิจกรรม',
};

function mnxStarString(rating) {
  return mnxStarRowIcon(rating);
}

function mnxTimeAgoTh(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  return `${Math.round(diffHr / 24)} วันที่แล้ว`;
}

function mnxCombinedRating(place) {
  const stats = window.MNX_REVIEWS?.stats(place.id);
  if (!stats) return { avg: null, count: 0 };
  return { avg: stats.avg, count: stats.count };
}

function mnxOpenPlaceModal(placeId) {
  const place = window.mnxGetPlace?.(placeId);
  if (!place) {
    console.error('[place-modal] unknown place id:', placeId);
    return;
  }

  const els = mnxPlaceEls();
  if (!els.modal) return;

  mnxCurrentPlaceId = placeId;
  mnxPlaceReturnFocusEl = document.activeElement;

  // ---- Gallery ----
  els.track.innerHTML = place.images.map((src, i) => {
    const resolvedSrc = typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(src) : src;
    return `
    <div class="place-modal__gallery-slide">
      <img src="${resolvedSrc}" class="place-modal__gallery-bg" aria-hidden="true" draggable="false" onerror="this.src='/assets/images/placeholder.jpg'" />
      <img src="${resolvedSrc}" class="place-modal__gallery-fg" alt="${place.name} — รูปที่ ${i + 1}" draggable="false" onerror="this.src='/assets/images/placeholder.jpg'" />
    </div>
  `;
  }).join('');
  els.dots.innerHTML = place.images.map((_, i) => `<button data-index="${i}" aria-label="ไปยังรูปที่ ${i + 1}"></button>`).join('');
  mnxPlaceGalleryGoTo(0);
  mnxStartPlaceGalleryAutoplay();

  // ---- Details ----
  els.category.textContent = MNX_CATEGORY_LABELS[place.category] || place.category;
  els.title.textContent = place.name;
  els.desc.textContent = place.desc;

  els.desc.classList.remove('is-expanded');
  const descToggle = document.getElementById('place-modal-desc-toggle');
  if (descToggle) {
    descToggle.innerHTML = `อ่านต่อ ${mnxChevronIcon()}`;
    Promise.resolve().then(() => {
      const isTruncated = els.desc.scrollHeight > els.desc.clientHeight + 4;
      descToggle.style.display = isTruncated ? 'block' : 'none';
    });
  }
  els.area.innerHTML = `${mnxPinIcon()} ${place.area}`;
  els.coords.href = `https://maps.google.com/?q=${place.lat},${place.lng}`;
  els.price.textContent = place.price;

  const { avg, count } = mnxCombinedRating(place);
  els.stars.innerHTML = avg != null ? mnxStarString(avg) : mnxStarRowIcon(0);
  els.ratingValue.textContent = avg != null ? avg.toFixed(1) : 'ยังไม่มีคะแนน';
  els.ratingCount.textContent = count ? `(${count} รีวิว)` : '';

  renderPlaceReviewsSection(place);
  window.MNX_REVIEWS?.fetch(place.id).then(() => {
    if (mnxCurrentPlaceId === place.id) mnxRefreshPlaceRatingAndReviews(place);
  });

  els.modal.classList.add('is-open');
  if (place.category === 'event') {
    els.modal.classList.add('place-modal--event');
  } else {
    els.modal.classList.remove('place-modal--event');
  }
  document.body.style.overflow = 'hidden';
}

function mnxRefreshPlaceRatingAndReviews(place) {
  const els = mnxPlaceEls();
  const { avg, count } = mnxCombinedRating(place);
  els.stars.innerHTML = avg != null ? mnxStarString(avg) : mnxStarRowIcon(0);
  els.ratingValue.textContent = avg != null ? avg.toFixed(1) : 'ยังไม่มีคะแนน';
  els.ratingCount.textContent = count ? `(${count} รีวิว)` : '';
  renderPlaceReviewsSection(place);
}

function mnxClosePlaceModal() {
  const { modal } = mnxPlaceEls();
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
  clearInterval(mnxPlaceGalleryTimer);
  mnxPlaceReturnFocusEl?.focus?.();
}

function mnxPlaceGalleryGoTo(index) {
  const els = mnxPlaceEls();
  const total = els.track.children.length;
  if (!total) return;
  mnxPlaceGalleryIndex = (index + total) % total;

  els.track.style.transform = `translateX(-${mnxPlaceGalleryIndex * 100}%)`;
  els.dots.querySelectorAll('button').forEach((d, i) => d.classList.toggle('is-active', i === mnxPlaceGalleryIndex));
  els.counter.textContent = `${mnxPlaceGalleryIndex + 1} / ${total}`;
}

function mnxStartPlaceGalleryAutoplay() {
  clearInterval(mnxPlaceGalleryTimer);
  mnxPlaceGalleryTimer = setInterval(() => mnxPlaceGalleryGoTo(mnxPlaceGalleryIndex + 1), MNX_PLACE_GALLERY_INTERVAL);
}

function mnxPlaceGalleryManualGoTo(index) {
  mnxPlaceGalleryGoTo(index);
  mnxStartPlaceGalleryAutoplay();
}

const MNX_REVIEW_CATEGORY_OPTIONS = [
  { value: 'cafe', label: 'คาเฟ่' },
  { value: 'restaurant', label: 'สายกิน' },
  { value: 'temple', label: 'วัด / สถานที่ศักดิ์สิทธิ์' },
  { value: 'mutelu', label: 'มูเตลู' },
  { value: 'shopping', label: 'ช้อปปิ้ง' },
  { value: 'culture', label: 'วัฒนธรรม' },
  { value: 'nature', label: 'ธรรมชาติและสิ่งแวดล้อม' },
  { value: 'fitness', label: 'ออกกำลังกาย' },
  { value: 'landmark', label: 'แลนด์มาร์ก' },
  { value: 'event', label: 'กิจกรรม' },
];

const MNX_MAX_REVIEW_VIDEO_SECONDS = 60;
let mnxReviewPhotoFiles = [];
let mnxReviewVideoFile = null;

function renderPlaceReviewsSection(place) {
  const { reviewsWrap, reviewCount } = mnxPlaceEls();
  const session = window.MNX_AUTH?.getSession();
  const reviews = window.MNX_REVIEWS?.get(place.id) || [];
  reviewCount.textContent = reviews.length ? `${reviews.length} รีวิว` : '';

  const listHtml = reviews.length
    ? `<div class="place-review-list">${reviews.map((r) => mnxRenderReviewItem(r)).join('')}</div>`
    : `<p class="place-review-empty">ยังไม่มีรีวิวสำหรับสถานที่นี้ เป็นคนแรกที่รีวิวเลย!</p>`;

  const formOrLockHtml = session ? `
    <div class="place-review-form" id="place-review-form">
      <div class="place-review-form__rating" id="place-review-rating"></div>

      <div class="place-review-form__field">
        <label for="place-review-category">โพสต์รีวิวนี้ลงหมวดหมู่ไหน?</label>
        <select id="place-review-category">
          ${MNX_REVIEW_CATEGORY_OPTIONS.map((c) => `<option value="${c.value}" ${c.value === place.category ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </div>

      <textarea id="place-review-text" placeholder="แบ่งปันประสบการณ์ของคุณเกี่ยวกับสถานที่นี้..." maxlength="500"></textarea>

      <div class="place-review-form__error" id="place-review-error"></div>
      <div class="place-review-form__media-preview" id="place-review-media-preview"></div>

      <div class="place-review-form__media-row">
        <button type="button" class="place-review-form__media-btn" id="place-review-photo-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6l1.5-2h5L16 6"/><circle cx="12" cy="13" r="3.5"/></svg> เพิ่มรูปภาพ (สูงสุด 5 รูป)</button>
        <button type="button" class="place-review-form__media-btn" id="place-review-video-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M10 9l5 3-5 3V9Z"/></svg> เพิ่มวิดีโอ (ไม่เกิน 1 นาที)</button>
        <input type="file" id="place-review-photo-input" accept="image/jpeg,image/png,image/webp" multiple class="visually-hidden" />
        <input type="file" id="place-review-video-input" accept="video/mp4,video/quicktime,video/webm" class="visually-hidden" />
      </div>
      <p class="place-review-form__hint">วิดีโอที่แนบจะถูกนำไปแสดงในหน้าไลฟ์สไตล์หมวดที่เลือกไว้ด้านบนด้วย</p>

      <button class="btn btn-gold btn-sm" id="place-review-submit">โพสต์รีวิว</button>
    </div>
  ` : `
    <div class="place-modal__lock">
      <div class="place-modal__lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg></div>
      <p>เข้าสู่ระบบเพื่อเขียนรีวิว ให้คะแนน และแนบรูปภาพ/วิดีโอของคุณเองสำหรับ "${window.mnxEscapeHtml ? window.mnxEscapeHtml(place.name) : place.name}"</p>
      <button class="btn btn-gold btn-sm" data-auth-open="login">เข้าสู่ระบบ / สมัครสมาชิก</button>
    </div>
  `;

  reviewsWrap.innerHTML = formOrLockHtml + listHtml;

  if (session) wirePlaceReviewForm(place);
  wireReviewItemActions(place, reviewsWrap);
}

function mnxRenderReviewItem(r) {
  const esc = window.mnxEscapeHtml || ((s) => s || '');
  const authorSafe = esc(r.author);
  const textSafe = esc(r.text);
  let avatarUrl = r.avatar;
  if (!avatarUrl) {
    avatarUrl = '/Fronend/assets/images/avatar-placeholder.png';
  } else if (avatarUrl.startsWith('/uploads/') && typeof window.mnxAbsoluteUploadUrl === 'function') {
    avatarUrl = window.mnxAbsoluteUploadUrl(avatarUrl);
  }
  const avatarSafe = window.mnxSanitizeUrl ? window.mnxSanitizeUrl(avatarUrl) : esc(avatarUrl);

  const photosHtml = (r.photos || []).length
    ? `<div class="place-review-item__media">${r.photos.map((src) => `<img src="${mnxAbsoluteUploadUrl(src)}" alt="รูปรีวิว" loading="lazy" />`).join('')}</div>`
    : '';
  const videoHtml = r.video
    ? `<div class="place-review-item__media">
        <div class="place-review-item__video-wrap" data-video-open="${mnxAbsoluteUploadUrl(r.video.url)}">
          <img src="${mnxAbsoluteUploadUrl(r.video.posterUrl)}" alt="วิดีโอรีวิว" loading="lazy" />
        </div>
      </div>`
    : '';

  return `
    <div class="place-review-item" data-review-id="${r.id}">
      <img class="place-review-item__avatar" src="${avatarSafe}" alt="${authorSafe}" />
      <div class="place-review-item__body">
        <div class="place-review-item__head">
          <span class="place-review-item__name">${authorSafe}</span>
          <span class="place-review-item__stars">${mnxStarString(r.rating)}</span>
          <span class="place-review-item__time">${mnxTimeAgoTh(r.createdAt)}</span>
        </div>
        <p class="place-review-item__text">${textSafe}</p>
        ${photosHtml}
        ${videoHtml}
        <div class="place-review-item__actions">
          <button class="place-review-item__action-btn place-review-item__like-btn" data-review-id="${r.id}">${mnxHeartIcon(false)} <span>${r.likeCount || 0}</span></button>
        </div>
      </div>
    </div>
  `;
}

function mnxAbsoluteUploadUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (/^https?:\/\//.test(relativeUrl)) {
    return window.mnxSanitizeUrl ? window.mnxSanitizeUrl(relativeUrl) : relativeUrl;
  }
  const apiOrigin = window.MNX_API.baseUrl.replace(/\/api\/?$/, '');
  const finalUrl = `${apiOrigin}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
  return window.mnxSanitizeUrl ? window.mnxSanitizeUrl(finalUrl) : finalUrl;
}

function wireReviewItemActions(place, reviewsWrap) {
  reviewsWrap.querySelectorAll('.place-review-item__like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.MNX_AUTH?.isLoggedIn()) {
        mnxOpenAuthModal('login');
        return;
      }
      const reviewId = btn.dataset.reviewId;
      const countEl = btn.querySelector('span');
      const isLiked = btn.classList.contains('is-liked');
      btn.disabled = true;
      try {
        if (isLiked) {
          await window.MNX_REVIEWS.unlike(place.id, reviewId);
          countEl.textContent = String(Math.max(0, Number(countEl.textContent) - 1));
        } else {
          await window.MNX_REVIEWS.like(place.id, reviewId);
          countEl.textContent = String(Number(countEl.textContent) + 1);
        }
        btn.classList.toggle('is-liked', !isLiked);
        btn.firstChild.outerHTML = mnxHeartIcon(!isLiked);
      } catch (err) {
        alert(err.message || 'ไม่สามารถกดหัวใจได้ กรุณาลองใหม่');
      } finally {
        btn.disabled = false;
      }
    });
  });

  reviewsWrap.querySelectorAll('[data-video-open]').forEach((wrap) => {
    wrap.addEventListener('click', () => {
      window.open(wrap.dataset.videoOpen, '_blank', 'noopener');
    });
  });
}

function wirePlaceReviewForm(place) {
  const ratingWrap = document.getElementById('place-review-rating');
  const submitBtn = document.getElementById('place-review-submit');
  const textArea = document.getElementById('place-review-text');
  const categorySelect = document.getElementById('place-review-category');
  const errorEl = document.getElementById('place-review-error');
  const photoBtn = document.getElementById('place-review-photo-btn');
  const videoBtn = document.getElementById('place-review-video-btn');
  const photoInput = document.getElementById('place-review-photo-input');
  const videoInput = document.getElementById('place-review-video-input');
  if (!ratingWrap) return;

  mnxReviewPhotoFiles = [];
  mnxReviewVideoFile = null;

  let selectedRating = 0;
  ratingWrap.innerHTML = Array.from({ length: 5 }, (_, i) => `<button type="button" data-star="${i + 1}" aria-label="ให้ ${i + 1} ดาว">${mnxSingleStarIcon(false)}</button>`).join('');

  ratingWrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = Number(btn.dataset.star);
      ratingWrap.querySelectorAll('button').forEach((b) => {
        const isActive = Number(b.dataset.star) <= selectedRating;
        b.classList.toggle('is-active', isActive);
        b.innerHTML = mnxSingleStarIcon(isActive);
      });
    });
  });

  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.classList.add('is-active');
  };
  const hideError = () => errorEl.classList.remove('is-active');

  function renderMediaPreview() {
    const preview = document.getElementById('place-review-media-preview');
    const removeIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="11" height="11"><path d="M5 5l14 14M19 5L5 19"/></svg>';
    const photoThumbs = mnxReviewPhotoFiles.map((file, i) => `
      <div class="place-review-form__media-thumb" data-kind="photo" data-index="${i}">
        <img src="${URL.createObjectURL(file)}" alt="รูปที่ ${i + 1}" />
        <button type="button" data-remove-photo="${i}">${removeIconSvg}</button>
      </div>
    `).join('');
    const videoThumb = mnxReviewVideoFile ? `
      <div class="place-review-form__media-thumb" data-kind="video">
        <video src="${URL.createObjectURL(mnxReviewVideoFile)}" muted></video>
        <button type="button" data-remove-video>${removeIconSvg}</button>
      </div>
    ` : '';
    preview.innerHTML = photoThumbs + videoThumb;

    preview.querySelectorAll('[data-remove-photo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mnxReviewPhotoFiles.splice(Number(btn.dataset.removePhoto), 1);
        renderMediaPreview();
      });
    });
    preview.querySelector('[data-remove-video]')?.addEventListener('click', () => {
      mnxReviewVideoFile = null;
      renderMediaPreview();
    });
  }

  photoBtn?.addEventListener('click', () => photoInput.click());
  videoBtn?.addEventListener('click', () => videoInput.click());

  photoInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - mnxReviewPhotoFiles.length;
    mnxReviewPhotoFiles.push(...files.slice(0, remaining));
    renderMediaPreview();
    photoInput.value = '';
  });

  videoInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    hideError();

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > MNX_MAX_REVIEW_VIDEO_SECONDS + 1) {
        showError(`วิดีโอต้องมีความยาวไม่เกิน 1 นาที (ไฟล์นี้ยาว ${Math.round(videoEl.duration)} วินาที)`);
        videoInput.value = '';
        return;
      }
      mnxReviewVideoFile = file;
      renderMediaPreview();
    };
    videoEl.src = URL.createObjectURL(file);
  });

  submitBtn?.addEventListener('click', async () => {
    hideError();
    if (!selectedRating) {
      showError('กรุณาให้คะแนนดาวก่อนโพสต์รีวิว');
      return;
    }
    submitBtn.disabled = true;
    const result = await window.MNX_REVIEWS?.add(place.id, {
      rating: selectedRating,
      text: textArea.value,
      category: categorySelect.value,
      photos: mnxReviewPhotoFiles,
      video: mnxReviewVideoFile,
    });
    submitBtn.disabled = false;

    if (!result?.ok) {
      if (result?.reason === 'empty-text') showError('กรุณาเขียนรีวิวก่อนโพสต์');
      else if (result?.reason === 'api-error') showError(result.message || 'ไม่สามารถโพสต์รีวิวได้ กรุณาลองใหม่');
      else showError('ไม่สามารถโพสต์รีวิวได้ กรุณาลองใหม่');
      return;
    }
    mnxRefreshPlaceRatingAndReviews(place);
  });
}

function initPlaceModal() {
  const els = mnxPlaceEls();
  if (!els.modal) return;

  document.getElementById('place-modal-close')?.addEventListener('click', mnxClosePlaceModal);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) mnxClosePlaceModal();
  });
  document.addEventListener('keydown', (e) => {
    if (!els.modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') mnxClosePlaceModal();
    if (e.key === 'ArrowLeft') mnxPlaceGalleryManualGoTo(mnxPlaceGalleryIndex - 1);
    if (e.key === 'ArrowRight') mnxPlaceGalleryManualGoTo(mnxPlaceGalleryIndex + 1);
  });

  document.getElementById('place-gallery-prev')?.addEventListener('click', () => mnxPlaceGalleryManualGoTo(mnxPlaceGalleryIndex - 1));
  document.getElementById('place-gallery-next')?.addEventListener('click', () => mnxPlaceGalleryManualGoTo(mnxPlaceGalleryIndex + 1));
  els.dots?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]');
    if (btn) mnxPlaceGalleryManualGoTo(Number(btn.dataset.index));
  });

  document.getElementById('place-modal-desc-toggle')?.addEventListener('click', () => {
    const desc = document.getElementById('place-modal-desc');
    const toggle = document.getElementById('place-modal-desc-toggle');
    if (!desc || !toggle) return;
    const isExpanded = desc.classList.toggle('is-expanded');
    toggle.innerHTML = isExpanded ? `ย่อลง ${mnxChevronIcon('up')}` : `อ่านต่อ ${mnxChevronIcon('down')}`;
  });

  const viewport = els.track?.closest('.place-modal__gallery-viewport');
  if (viewport) {
    let mnxRealPointerMoveSeen = false;
    viewport.addEventListener('mousemove', () => { mnxRealPointerMoveSeen = true; });
    viewport.addEventListener('mouseenter', () => {
      if (mnxRealPointerMoveSeen) clearInterval(mnxPlaceGalleryTimer);
    });
    viewport.addEventListener('mouseleave', () => {
      mnxRealPointerMoveSeen = false;
      if (els.modal.classList.contains('is-open')) mnxStartPlaceGalleryAutoplay();
    });

    let touchStartX = 0;
    viewport.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', (e) => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 40) mnxPlaceGalleryManualGoTo(mnxPlaceGalleryIndex + (delta < 0 ? 1 : -1));
    }, { passive: true });
  }

  els.track?.addEventListener('click', (e) => {
    const fg = e.target.closest('.place-modal__gallery-fg');
    if (fg && fg.src) {
      mnxOpenImageLightbox(fg.src, fg.alt || '');
    }
  });

  document.addEventListener('auth:changed', () => {
    if (els.modal.classList.contains('is-open') && mnxCurrentPlaceId) {
      const place = window.mnxGetPlace(mnxCurrentPlaceId);
      if (place) renderPlaceReviewsSection(place);
    }
  });
}

function mnxOpenImageLightbox(src, alt = '') {
  let lightbox = document.getElementById('mnx-image-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'mnx-image-lightbox';
    lightbox.className = 'mnx-image-lightbox';
    lightbox.innerHTML = `
      <button class="mnx-image-lightbox__close" aria-label="ปิดรูปภาพ">✕</button>
      <img class="mnx-image-lightbox__img" src="" alt="" />
    `;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.mnx-image-lightbox__close').addEventListener('click', (e) => {
      e.stopPropagation();
      mnxCloseImageLightbox();
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('mnx-image-lightbox__close')) {
        mnxCloseImageLightbox();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
        mnxCloseImageLightbox();
      }
    });
  }

  const img = lightbox.querySelector('.mnx-image-lightbox__img');
  if (img) {
    img.src = src;
    img.alt = alt;
  }
  lightbox.classList.add('is-open');
}

function mnxCloseImageLightbox() {
  const lightbox = document.getElementById('mnx-image-lightbox');
  if (lightbox) lightbox.classList.remove('is-open');
}

// Global click listener for opening place details
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-place-open]');
  if (!trigger) return;
  const placeId = trigger.dataset.placeOpen;
  if (!placeId) return;
  e.preventDefault();
  mnxOpenPlaceModal(placeId);
});

function mnxAutoOpenPlaceFromQuery() {
  const placeId = new URLSearchParams(window.location.search).get('place');
  if (!placeId) return;
  setTimeout(() => mnxOpenPlaceModal(placeId), 300);
}

document.addEventListener('DOMContentLoaded', () => {
  initPlaceModal();
  mnxAutoOpenPlaceFromQuery();
});

document.addEventListener('includes:loaded', () => {
  initPlaceModal();
  mnxAutoOpenPlaceFromQuery();
});
