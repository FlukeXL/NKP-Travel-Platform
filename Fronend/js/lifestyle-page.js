const MNX_LIFESTYLE_LABELS = {
  cafe: 'คาเฟ่',
  mutelu: 'มูเตลู',
  shopping: 'ช้อปปิ้ง',
  food: 'สายกิน',
  culture: 'วัฒนธรรม',
  nature: 'ธรรมชาติและสิ่งแวดล้อม',
  all: 'ไลฟ์สไตล์การเที่ยวทั้งหมด',
};

const MNX_LIFESTYLE_REAL_CATEGORIES = ['cafe', 'mutelu', 'shopping', 'food', 'culture', 'nature'];

function mnxLifestyleSlug() {
  return document.body.dataset.lifestyle || 'all';
}

let mnxLifestyleStatsGeneration = 0;
let mnxLifestylePopularGeneration = 0;
let mnxLifestyleGridGeneration = 0;

async function renderLifestyleStats() {
  const wrap = document.getElementById('lifestyle-stats');
  if (!wrap || !window.mnxGetPlacesByLifestyle) return;

  const myGeneration = ++mnxLifestyleStatsGeneration;
  const slug = mnxLifestyleSlug();
  const places = window.mnxGetPlacesByLifestyle(slug);

  await Promise.all(places.map((p) => window.MNX_REVIEWS?.fetch(p.id)));
  if (myGeneration !== mnxLifestyleStatsGeneration) return;
  const rated = places.map((p) => window.MNX_REVIEWS?.stats(p.id)).filter(Boolean);
  const avgRating = rated.length ? rated.reduce((sum, s) => sum + s.avg, 0) / rated.length : null;
  const totalVisits = places.reduce((sum, p) => sum + (p.popularity || 0), 0);

  const countEl = wrap.querySelector('[data-field="stat-count"]');
  const ratingEl = wrap.querySelector('[data-field="stat-rating"]');
  const visitsEl = wrap.querySelector('[data-field="stat-visits"]');
  if (countEl) countEl.textContent = places.length.toLocaleString('th-TH');
  if (ratingEl) ratingEl.innerHTML = avgRating != null ? `<span class="stars">★</span> ${avgRating.toFixed(1)}` : 'ยังไม่มีคะแนน';
  if (visitsEl) visitsEl.textContent = totalVisits >= 1000 ? `${(totalVisits / 1000).toFixed(1)}K+` : `${totalVisits}`;
}

async function renderLifestylePopular() {
  const section = document.getElementById('lifestyle-popular');
  const grid = document.getElementById('lifestyle-popular-grid');
  if (!section || !grid || !window.mnxGetPlacesByLifestyle) return;

  const myGeneration = ++mnxLifestylePopularGeneration;
  const slug = mnxLifestyleSlug();
  const allPlaces = window.mnxGetPlacesByLifestyle(slug);

  if (!allPlaces.length) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // Fetch reviews for all places to get real ratings
  await Promise.all(allPlaces.map((p) => window.MNX_REVIEWS?.fetch(p.id)));
  if (myGeneration !== mnxLifestylePopularGeneration) return;

  // Sort by real review rating desc, fallback to seed rating, then popularity
  const sorted = allPlaces.slice().sort((a, b) => {
    const ra = window.MNX_REVIEWS?.stats(a.id)?.avg ?? a.rating ?? 0;
    const rb = window.MNX_REVIEWS?.stats(b.id)?.avg ?? b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.popularity || 0) - (a.popularity || 0);
  });
  const top = sorted.slice(0, 3);

  const rankLabels = ['อันดับ 1', 'อันดับ 2', 'อันดับ 3'];

  grid.innerHTML = top.map((p, i) => {
    const stats = window.MNX_REVIEWS?.stats(p.id);
    const ratingVal = stats ? stats.avg.toFixed(1) : (p.rating ? p.rating.toFixed(1) : null);
    const ratingHtml = stats
      ? `<span class="stars">★</span> ${ratingVal} <span class="lifestyle-popular-card__review-count">(${stats.count} รีวิว)</span>`
      : ratingVal
        ? `<span class="stars">★</span> ${ratingVal} <span class="lifestyle-popular-card__review-count" style="opacity:0.6">(คะแนนเริ่มต้น)</span>`
        : 'ยังไม่มีคะแนน';
    const visits = p.popularity >= 1000 ? `${(p.popularity / 1000).toFixed(1)}K` : `${p.popularity || 0}`;
    const imgSrc = typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(p.img) : p.img;
    return `
      <article class="lifestyle-popular-card lifestyle-popular-card--rank-${i + 1}" data-place-open="${p.id}" style="cursor: pointer;">
        <div class="lifestyle-popular-card__img-wrap">
          <img src="${imgSrc}" alt="${p.name}" draggable="false" loading="lazy" />
          <span class="lifestyle-popular-card__rank">${rankLabels[i]}</span>
          ${p.popularity ? `<span class="lifestyle-popular-card__visits">${visits} คน/เดือน</span>` : ''}
        </div>
        <div class="lifestyle-popular-card__body">
          <div class="lifestyle-popular-card__rating">${ratingHtml}</div>
          <h4 class="lifestyle-popular-card__title">${p.name}</h4>
          <p class="lifestyle-popular-card__desc">${p.desc}</p>
        </div>
      </article>
    `;
  }).join('');
}

async function renderLifestyleVideoRail() {
  const track = document.getElementById('lifestyle-video-track');
  if (!track || !window.MNX_REVIEWS) return;

  const slug = mnxLifestyleSlug();
  const videos = await window.MNX_REVIEWS.getVideosByCategory(slug);
  window.mnxRenderVideoCards(track, videos);
}

async function renderLifestylePlaceGrid() {
  const grid = document.getElementById('lifestyle-place-grid');
  if (!grid || !window.mnxGetPlacesByLifestyle) return;

  const myGeneration = ++mnxLifestyleGridGeneration;
  const slug = mnxLifestyleSlug();
  const rawPlaces = window.mnxGetPlacesByLifestyle(slug);

  // If no places at all for this category — hide the grid section silently
  if (!rawPlaces.length) {
    grid.closest('section')?.style.setProperty('display', 'none');
    const countEl = document.getElementById('lifestyle-place-count');
    if (countEl) countEl.textContent = '0 สถานที่';
    return;
  }

  // Show loading state
  grid.innerHTML = `<p class="lifestyle-grid-empty" style="opacity:0.5;"><span class="loader"></span> กำลังโหลดข้อมูล...</p>`;

  // Fetch reviews for all places in parallel
  await Promise.all(rawPlaces.map((p) => window.MNX_REVIEWS?.fetch(p.id)));
  if (myGeneration !== mnxLifestyleGridGeneration) return;

  // Sort: places with real reviews → by avg rating desc; then places without reviews → by seed rating desc
  const places = rawPlaces.slice().sort((a, b) => {
    const sa = window.MNX_REVIEWS?.stats(a.id);
    const sb = window.MNX_REVIEWS?.stats(b.id);
    const hasA = sa && sa.count > 0;
    const hasB = sb && sb.count > 0;
    // Both have real reviews — sort by avg desc
    if (hasA && hasB) return (sb.avg || 0) - (sa.avg || 0);
    // One has real reviews — it goes first
    if (hasA) return -1;
    if (hasB) return 1;
    // Neither has real reviews — sort by seed rating desc
    return (b.rating || 0) - (a.rating || 0);
  });

  const countEl = document.getElementById('lifestyle-place-count');
  if (countEl) countEl.textContent = `${places.length} สถานที่`;

  grid.innerHTML = places.map((p) => {
    const stats = window.MNX_REVIEWS?.stats(p.id);
    const hasRealRating = stats && stats.count > 0;
    const ratingVal = hasRealRating ? stats.avg.toFixed(1) : (p.rating ? p.rating.toFixed(1) : null);
    const ratingHtml = hasRealRating
      ? `<span class="stars">★</span> ${ratingVal} <span style="font-size:0.78em; opacity:0.7">(${stats.count})</span>`
      : ratingVal
        ? `<span class="stars" style="opacity:0.6">★</span> <span style="opacity:0.75">${ratingVal}</span>`
        : '';
    const imgSrc = typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(p.img) : p.img;
    return `
    <article class="lifestyle-card" data-place-open="${p.id}" style="cursor: pointer;">
      <div class="lifestyle-card__img-wrap" data-place-open="${p.id}">
        <img src="${imgSrc}" alt="${p.name}" draggable="false" loading="lazy" />
        <span class="lifestyle-card__gallery-hint">${p.images?.length || 1} รูป · ดูรายละเอียด</span>
        <button class="lifestyle-card__favorite" data-favorite-id="${p.id}" aria-label="บันทึกเป็นรายการที่ชอบ">♡</button>
      </div>
      <div class="lifestyle-card__body" data-place-open="${p.id}">
        ${ratingHtml ? `<div class="lifestyle-card__rating">${ratingHtml}</div>` : ''}
        <h4 class="lifestyle-card__title">${p.name}</h4>
        <p class="lifestyle-card__desc">${p.desc}</p>
        <div class="lifestyle-card__meta">
          <span>${p.area}</span>
          <strong>${p.price}</strong>
        </div>
      </div>
    </article>
  `;
  }).join('');

  grid.querySelectorAll('.lifestyle-card__favorite').forEach((btn) => {
    const placeId = btn.dataset.favoriteId;
    if (placeId && window.MNX_FAVORITES?.isFavorite(placeId)) {
      btn.classList.add('is-active');
      btn.textContent = '♥';
    }

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!window.MNX_AUTH?.isLoggedIn()) {
        mnxOpenAuthModal('login');
        return;
      }
      btn.disabled = true;
      try {
        const nowFavorited = await window.MNX_FAVORITES.toggle(placeId);
        btn.classList.toggle('is-active', nowFavorited);
        btn.textContent = nowFavorited ? '♥' : '♡';
      } catch (err) {
        alert(err.message || 'ไม่สามารถบันทึกรายการที่ชอบได้ กรุณาลองใหม่');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

/* ---- "X คนชอบไลฟ์สไตล์นี้" interest banner ---- */
async function renderLifestyleInterestBanner() {
  const banner = document.getElementById('lifestyle-interest-banner');
  if (!banner || !window.MNX_LIFESTYLE_INTEREST) return;

  const slug = mnxLifestyleSlug();
  const countEl = banner.querySelector('[data-field="interest-count"]');
  const btn = banner.querySelector('[data-role="interest-toggle"]');

  if (slug === 'all') {
    const results = await Promise.all(MNX_LIFESTYLE_REAL_CATEGORIES.map((c) => window.MNX_LIFESTYLE_INTEREST.load(c)));
    const total = results.reduce((sum, r) => sum + (r?.count || 0), 0);
    if (countEl) countEl.textContent = total.toLocaleString('th-TH');
    if (btn) btn.style.display = 'none';
    return;
  }

  const { count, interested } = await window.MNX_LIFESTYLE_INTEREST.load(slug);
  if (countEl) countEl.textContent = count.toLocaleString('th-TH');
  if (btn) {
    btn.style.display = '';
    mnxUpdateInterestButton(btn, interested);
  }
}

function mnxUpdateInterestButton(btn, interested) {
  btn.classList.toggle('is-joined', interested);
  btn.textContent = interested ? '✓ ร่วมสายนี้แล้ว' : '+ ร่วมสายนี้กับเรา';
}

function initLifestyleInterestButton() {
  const banner = document.getElementById('lifestyle-interest-banner');
  const btn = banner?.querySelector('[data-role="interest-toggle"]');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const slug = mnxLifestyleSlug();
    if (!window.MNX_AUTH?.isLoggedIn()) {
      mnxOpenAuthModal('login');
      return;
    }
    btn.disabled = true;
    try {
      const nowInterested = await window.MNX_LIFESTYLE_INTEREST.toggle(slug);
      mnxUpdateInterestButton(btn, nowInterested);
      const countEl = banner.querySelector('[data-field="interest-count"]');
      if (countEl) countEl.textContent = window.MNX_LIFESTYLE_INTEREST.getCount(slug).toLocaleString('th-TH');
    } catch (err) {
      alert(err.message || 'ไม่สามารถเข้าร่วมได้ กรุณาลองใหม่');
    } finally {
      btn.disabled = false;
    }
  });
}

function initLifestyleScrollRows() {
  document.querySelectorAll('.lifestyle-video .scroll-row').forEach((row) => {
    const track = row.querySelector('.scroll-row__track');
    const prev = row.querySelector('.scroll-row__arrow--prev');
    const next = row.querySelector('.scroll-row__arrow--next');
    if (!track || !prev || !next) return;

    const cardWidth = () => track.firstElementChild?.getBoundingClientRect().width || 280;
    const scrollByCards = (dir) => {
      track.scrollBy({ left: dir * (cardWidth() + 20) * 2, behavior: 'smooth' });
    };

    prev.addEventListener('click', () => scrollByCards(-1));
    next.addEventListener('click', () => scrollByCards(1));

    const updateArrows = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 4;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= maxScroll;
    };

    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    requestAnimationFrame(updateArrows);
    setTimeout(updateArrows, 300);
  });
}

async function loadActivePromo() {
  const frame = document.querySelector('[data-promo-frame]');
  if (!frame) return;

  const adLabel = frame.closest('[aria-label]');

  try {
    const res = await window.MNX_API.get('/promos/active?t=' + Date.now());
    if (res && res.length > 0) {
      const item = res.find(p => p.placement === 'lifestyle') || res[0];
      if (item && item.imageUrl) {
        const resolvedUrl = typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(item.imageUrl) : item.imageUrl;
        frame.innerHTML = `
          <a href="${item.linkUrl || '#'}" target="${item.linkUrl ? '_blank' : '_self'}" rel="noopener" style="display:block;">
            <img src="${resolvedUrl}" alt="${item.title}" style="width:100%; height:auto; display:block; border-radius:12px;" loading="lazy" />
          </a>
          <div style="font-size:0.62rem; letter-spacing:0.1em; text-transform:uppercase; color:#999; text-align:center; margin-top:6px;" data-i18n="ad.sponsored">พื้นที่ประชาสัมพันธ์</div>`;
        if (window.MNX_I18N && window.MNX_I18N.getLang() !== 'TH') window.MNX_I18N.translateDom(window.MNX_I18N.getLang());
        return;
      }
    }
  } catch (err) {
    console.error('Promo load error:', err);
  }

  // Fallback: show ติดต่อโฆษณา CTA
  frame.innerHTML = `
    <a href="/Fronend/contact.html" class="promo-contact-cta" style="
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:12px; min-height:200px; padding:24px; text-decoration:none;
      background: linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(201,162,39,0.03) 100%);
      border-radius:12px; border: 1px dashed rgba(201,162,39,0.35);
      transition: background 0.2s, border-color 0.2s;
    "
    onmouseover="this.style.background='linear-gradient(135deg,rgba(201,162,39,0.14) 0%,rgba(201,162,39,0.07) 100%)'; this.style.borderColor='rgba(201,162,39,0.55)'"
    onmouseout="this.style.background='linear-gradient(135deg,rgba(201,162,39,0.08) 0%,rgba(201,162,39,0.03) 100%)'; this.style.borderColor='rgba(201,162,39,0.35)'"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a227" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="36" height="36">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span style="font-size:0.82rem; font-weight:700; color:#c9a227; text-align:center; letter-spacing:0.03em;" data-i18n="ad.contact">ติดต่อโฆษณา</span>
      <span style="font-size:0.7rem; color:#999; text-align:center; line-height:1.5;" data-i18n="ad.contact_cta">สนใจลงโฆษณา / ประชาสัมพันธ์ ติดต่อเรา</span>
    </a>
    <div style="font-size:0.62rem; letter-spacing:0.1em; text-transform:uppercase; color:#ccc; text-align:center; margin-top:6px;" data-i18n="ad.sponsored">พื้นที่ประชาสัมพันธ์</div>`;
  if (window.MNX_I18N && window.MNX_I18N.getLang() !== 'TH') window.MNX_I18N.translateDom(window.MNX_I18N.getLang());
}

async function renderLifestylePage() {
  await renderLifestyleStats();
  await renderLifestylePopular();
  await renderLifestyleVideoRail();
  await window.MNX_FAVORITES?.load();
  await renderLifestylePlaceGrid();
  await renderLifestyleInterestBanner();
  await loadActivePromo();
  requestAnimationFrame(initLifestyleScrollRows);
  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

document.addEventListener('includes:loaded', async () => {
  initLifestyleInterestButton();
  // Try to sync from API first (places-data.js also listens, this ensures we wait for it)
  if (window.mnxSyncPlacesFromApi) {
    await window.mnxSyncPlacesFromApi().catch(() => null);
  }
  renderLifestylePage();
});

document.addEventListener('auth:changed', async () => {
  await window.MNX_FAVORITES?.load();
  await renderLifestylePlaceGrid();
  await renderLifestylePopular();
  await renderLifestyleInterestBanner();
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});

document.addEventListener('places:updated', async () => {
  await renderLifestyleStats();
  await renderLifestylePopular();
  await renderLifestylePlaceGrid();
  await renderLifestyleVideoRail();
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});
