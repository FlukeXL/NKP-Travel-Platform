let MNX_EVENTS = [];

async function mnxLoadAndRenderEvents() {
  try {
    const data = await window.MNX_API.get('/events');
    MNX_EVENTS = data.events || [];
    window.MNX_EVENTS = MNX_EVENTS; // Ensure global access for places-data.js
  } catch (err) {
    console.error('Failed to load events:', err);
    MNX_EVENTS = [];
    window.MNX_EVENTS = MNX_EVENTS;
  }
  mnxRenderEventCards();
  mnxRenderEventPopup();
}

function mnxRenderEventCards() {
  const grid = document.querySelector('#section-festivals .widget-grid');
  if (!grid) return;

  if (!MNX_EVENTS.length) {
    grid.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.85rem; padding:20px 0;">ยังไม่มีกิจกรรมที่กำลังจะมาถึง ติดตามได้เร็วๆนี้</p>`;
    return;
  }

  grid.innerHTML = MNX_EVENTS.map((ev) => `
    <article class="widget-card widget-card--festival fade-in" style="cursor: pointer;" onclick="window.mnxOpenPlaceModal('${ev.id}')">
      <div class="widget-card__img-wrap">
        <img src="${(typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(ev.banner) : ev.banner) || '/assets/images/events/fire-boat-festival.jpg'}" alt="${ev.title}" onerror="this.src='/assets/images/events/fire-boat-festival.jpg'" />
        <span class="widget-card__badge">${ev.badge || ev.tag || 'กิจกรรม'}</span>
      </div>
      <div class="widget-card__body">
        <span class="widget-card__dates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg> ${ev.dates || (ev.startDate ? formatThaiDate(ev.startDate) : '–')}</span>
        <h4 class="widget-card__title">${ev.title}</h4>
        <p class="widget-card__desc">${ev.desc || ''}</p>
      </div>
    </article>
  `).join('');
  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

function mnxRenderEventPopup() {
  const popup = document.getElementById('event-popup');
  if (!popup) return;

  const SESSION_KEY = 'mnx_event_popup_shown';
  if (sessionStorage.getItem(SESSION_KEY)) return;

  // Pick the most recent active+showAsPopup event; if none, skip.
  const popupEvent = MNX_EVENTS.find((ev) => ev.showAsPopup);
  if (!popupEvent) return;

  popup.querySelector('[data-field="event-tag"]').textContent = popupEvent.tag || '';
  popup.querySelector('[data-field="event-title"]').textContent = popupEvent.title;
  popup.querySelector('[data-field="event-desc"]').textContent = popupEvent.desc || '';
  popup.querySelector('[data-field="event-dates"]').textContent =
    popupEvent.dates || (popupEvent.startDate
      ? `${formatThaiDate(popupEvent.startDate)}${popupEvent.endDate ? ` – ${formatThaiDate(popupEvent.endDate)}` : ''}`
      : '');
  popup.querySelector('[data-field="event-location"]').textContent = popupEvent.location || '';
  popup.querySelector('[data-field="event-countdown"]').textContent = buildCountdownLabel(popupEvent.startDate, popupEvent.endDate);
  const cta = popup.querySelector('[data-field="event-cta"]');
  cta.href = '#';
  cta.onclick = (e) => {
    e.preventDefault();
    close();
    window.mnxOpenPlaceModal(popupEvent.id);
  };

  const bannerImgs = popup.querySelectorAll('[data-field="event-banner-img"]');
  if (bannerImgs.length > 0 && popupEvent.banner) {
    bannerImgs.forEach(img => {
      img.addEventListener('load', () => img.classList.add('is-loaded'));
      img.addEventListener('error', () => img.remove());
      img.src = mnxResolveUploadUrl(popupEvent.banner);
    });
  }

  const open = () => {
    popup.classList.add('is-open');
    sessionStorage.setItem(SESSION_KEY, '1');
  };
  const close = () => popup.classList.remove('is-open');
  setTimeout(open, 900);

  popup.querySelector('#event-popup-close')?.addEventListener('click', close);
  popup.querySelector('#event-popup-dismiss')?.addEventListener('click', close);
  popup.addEventListener('click', (e) => { if (e.target === popup) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) close();
  });
}

function formatThaiDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildCountdownLabel(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysUntilStart = Math.round((startOfDay(start) - startOfDay(today)) / 86400000);
  const daysUntilEnd = Math.round((startOfDay(end) - startOfDay(today)) / 86400000);

  if (daysUntilEnd < 0) return 'จบงานแล้ว';
  if (daysUntilStart <= 0) return 'กำลังจัดงานอยู่ตอนนี้';
  if (daysUntilStart === 1) return 'เริ่มพรุ่งนี้';
  return `อีก ${daysUntilStart} วันจะเริ่มงาน`;
}

async function loadWeeklyShowcase() {
  try {
    const res = await window.MNX_API.get('/recommendations/weekly');
    if (res.places && res.places.length > 0) {
      initShowcaseCarousel(res.places);
    }
  } catch (err) {
    console.error('Failed to load weekly showcase:', err);
  }
}

async function loadVideoReviews() {
  try {
    const container = document.getElementById('home-videos-grid');
    if (!container || !window.MNX_REVIEWS?.getAllVideos) return;
    
    const videos = await window.MNX_REVIEWS.getAllVideos();
    if (window.mnxRenderVideoCards) {
      // Show up to 4 videos on the home page
      window.mnxRenderVideoCards(container, videos.slice(0, 4));
    }
  } catch (err) {
    console.error('Failed to load video reviews:', err);
  }
}

function initShowcaseCarousel(places) {
  const slider = document.getElementById('showcase-slider');
  if (!slider) return;

  const slidesWrap = slider.querySelector('.showcase__slides');
  const navWrap = slider.querySelector('.showcase__nav');
  const prevBtn = slider.querySelector('.showcase__arrow--prev');
  const nextBtn = slider.querySelector('.showcase__arrow--next');

  let current = 0;
  let timer = null;
  const INTERVAL = 12000;

  slidesWrap.innerHTML = places.map((item) => `
    <div class="showcase__slide" onclick="window.mnxOpenPlaceModal('${item.id}')" style="cursor: pointer;">
      <img class="showcase__slide-img" src="${typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(item.img) : item.img}" alt="${item.name}" onerror="this.src='/assets/images/Blendy Boo.jpg'" />
      <div class="showcase__slide-info">
        <span class="showcase__slide-tag">${MNX_CATEGORY_BADGE[item.category] || item.category}</span>
        <h3 class="showcase__slide-title">${item.name}</h3>
        <p class="showcase__slide-desc">${item.desc}</p>
        <div class="showcase__slide-meta">
          <span>${item.area || 'นครพนม'}</span>
          <span>${item.price || ''}</span>
        </div>
        <button class="showcase__btn">ดูรายละเอียด</button>
      </div>
    </div>
  `).join('');

  navWrap.innerHTML = places.map((_, i) => `<button data-index="${i}" aria-label="สไลด์ ${i + 1}"></button>`).join('');

  const slideEls = slidesWrap.querySelectorAll('.showcase__slide');
  const navBtns = navWrap.querySelectorAll('button');

  function render() {
    slideEls.forEach((el, i) => el.classList.toggle('is-active', i === current));
    navBtns.forEach((btn, i) => btn.classList.toggle('is-active', i === current));
  }

  function goTo(index) {
    current = (index + places.length) % places.length;
    render();
    restart();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), INTERVAL);
  }

  navBtns.forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); goTo(Number(btn.dataset.index)); }));
  if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); goTo(current - 1); };
  if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); goTo(current + 1); };

  render();
  restart();
}

const MNX_CATEGORY_BADGE = {
  cafe: 'คาเฟ่',
  restaurant: 'ร้านอาหาร',
  temple: 'วัด/สถานที่ศักดิ์สิทธิ์',
  fitness: 'ออกกำลังกาย',
  culture: 'วัฒนธรรม',
  nature: 'ธรรมชาติ',
  landmark: 'แลนด์มาร์ก',
  mutelu: 'มูเตลู',
  shopping: 'ช้อปปิ้ง'
};

const mnxHomeRenderGenerations = {}; // gridId -> counter, so unrelated grids don't invalidate each other's in-flight renders

async function renderHomePlaceGrid(gridId, placeIds) {
  const grid = document.getElementById(gridId);
  if (!grid || !window.mnxGetPlace) return;

  const myGeneration = (mnxHomeRenderGenerations[gridId] = (mnxHomeRenderGenerations[gridId] || 0) + 1);
  const places = placeIds.map((id) => window.mnxGetPlace(id)).filter(Boolean);
  await Promise.all(places.map((p) => window.MNX_REVIEWS?.fetch(p.id)));
  if (myGeneration !== mnxHomeRenderGenerations[gridId]) return; // a newer render of THIS grid superseded this one — discard our result

  grid.innerHTML = places.map((p) => {
    const stats = window.MNX_REVIEWS?.stats(p.id);
    const ratingHtml = stats ? `<span class="stars">${mnxSingleStarIcon()}</span> ${stats.avg.toFixed(1)}` : 'ยังไม่มีคะแนน';
    return `
    <article class="widget-card fade-in">
      <div class="widget-card__img-wrap" data-place-open="${p.id}">
        <img src="${typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(p.img) : p.img}" alt="${p.name}" draggable="false" onerror="this.src='/assets/images/placeholder.jpg'" />
        <span class="widget-card__badge">${MNX_CATEGORY_BADGE[p.category] || p.category}</span>
      </div>
      <div class="widget-card__body" data-place-open="${p.id}">
        <h4 class="widget-card__title">${p.name}</h4>
        <div class="widget-card__rating">${ratingHtml}</div>
        <p class="widget-card__desc">${p.desc}</p>
        <div class="widget-card__coords">${mnxPinIcon()} <a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${p.lat}, ${p.lng}</a></div>
        <div class="widget-card__footer"><span>${p.area}</span><span>${mnxArrowIcon()}</span></div>
      </div>
    </article>
  `;
  }).join('');
  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

let mnxHomeRecommendGeneration = 0;

async function renderRecommendSection() {
  const grid = document.getElementById('home-recommend-grid');
  const reasonEl = document.getElementById('recommend-reason');
  if (!grid || !window.MNX_RECOMMEND) return;

  const myGeneration = ++mnxHomeRecommendGeneration;
  const session = window.MNX_AUTH?.getSession();
  const profile = session?.profile ? { ...session.profile, aiProfile: session.aiProfile || null } : null;

  await Promise.all((window.MNX_PLACES || []).map((p) => window.MNX_REVIEWS?.fetch(p.id)));
  if (myGeneration !== mnxHomeRecommendGeneration) return; // superseded by a newer render — discard

  const places = window.MNX_RECOMMEND.getRecommendedPlaces(profile, 4);
  if (reasonEl) reasonEl.textContent = window.MNX_RECOMMEND.buildReason(profile);

  grid.innerHTML = places.map((p) => {
    const stats = window.MNX_REVIEWS?.stats(p.id);
    const ratingHtml = stats ? `<span class="stars">${mnxSingleStarIcon()}</span> ${stats.avg.toFixed(1)}` : 'ยังไม่มีคะแนน';
    return `
    <article class="widget-card fade-in">
      <div class="widget-card__img-wrap" data-place-open="${p.id}">
        <img src="${typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(p.img) : p.img}" alt="${p.name}" draggable="false" onerror="this.src='/assets/images/placeholder.jpg'" />
        <span class="widget-card__badge">${MNX_CATEGORY_BADGE[p.category] || p.category}</span>
      </div>
      <div class="widget-card__body" data-place-open="${p.id}">
        <h4 class="widget-card__title">${p.name}</h4>
        <div class="widget-card__rating">${ratingHtml}</div>
        <p class="widget-card__desc">${p.desc}</p>
        <div class="widget-card__coords">${mnxPinIcon()} <a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${p.lat}, ${p.lng}</a></div>
        <div class="widget-card__footer"><span>${p.area}</span><span>${mnxArrowIcon()}</span></div>
      </div>
    </article>
  `;
  }).join('');
  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof mnxCheckAuth === 'function') mnxCheckAuth();
  
  await mnxLoadAndRenderEvents(); // Wait for events before potentially using them in modals
  
  loadActivePromo();

  // Load weekly places
  loadWeeklyShowcase();
  
  // Load Video Reviews
  loadVideoReviews();

  // Section 1 and 2 — Personalized Recommendation
  loadPersonalizedPlaces();

  // Section 4 — กิจกรรมส่งเสริมสุขภาพ
  renderHomePlaceGrid('home-fitness-grid', [
    'mekong-marathon',
    'mekong-cycling-route',
    'mekong-aerobic-park',
    'phanom-trail-run',
  ]);
});

document.addEventListener('auth:changed', () => {
  renderRecommendSection();
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});

document.addEventListener('places:updated', () => {
  renderRecommendSection();
  loadPersonalizedPlaces();
  renderHomePlaceGrid('home-fitness-grid', [
    'mekong-marathon', 'mekong-cycling-route', 'mekong-aerobic-park', 'phanom-trail-run',
  ]);
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});

document.addEventListener('events:updated', () => {
  mnxLoadAndRenderEvents();
});

async function loadActivePromo() {
  const frame = document.getElementById('home-promo-frame');
  if (!frame) return;

  try {
    const res = await window.MNX_API.get('/promos/active?t=' + Date.now());
    if (res && res.length > 0) {
      const item = res.find(p => p.placement === 'home') || res[0];
      if (item) {
        const resolvedUrl = typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(item.imageUrl) : item.imageUrl;
        frame.innerHTML = `<img src="${resolvedUrl}" alt="${item.title}" style="width:100%; height:auto; display:block; border-radius:8px;" />`;
      }
    }
  } catch (err) {
    console.error('Promo load error:', err);
  }
}

async function loadPersonalizedPlaces() {
  const foodGrid = document.getElementById('home-food-culture-grid');
  const cafeGrid = document.getElementById('home-cafe-grid');
  
  if (foodGrid) foodGrid.innerHTML = '<p style="text-align:center; width:100%;"><span class="loader"></span> กำลังวิเคราะห์ข้อมูลด้วย AI...</p>';
  if (cafeGrid) cafeGrid.innerHTML = '<p style="text-align:center; width:100%;"><span class="loader"></span> กำลังวิเคราะห์ข้อมูลด้วย AI...</p>';

  try {
    const res = await window.MNX_API.get('/recommendations/personalized', true);
    if (res.food && foodGrid) {
      renderPlacesDirectly('home-food-culture-grid', res.food);
    }
    if (res.cafe && cafeGrid) {
      renderPlacesDirectly('home-cafe-grid', res.cafe);
    }
  } catch (err) {
    console.error('Failed to load personalized places:', err);
    // Fallback to old behavior if API fails completely
    renderHomePlaceGrid('home-food-culture-grid', ['nem-nueang-riverside', 'isan-mekong-cuisine', 'pa-kham-vietnamese-noodle', 'indochina-night-market']);
    renderHomePlaceGrid('home-cafe-grid', ['cafe-riverside-million-view', 'wooden-road-cafe', 'indochina-coffee-house', 'garden-cafe']);
  }
}

async function renderPlacesDirectly(gridId, places) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  await Promise.all(places.map((p) => window.MNX_REVIEWS?.fetch(p.id)));

  grid.innerHTML = places.map((p) => {
    const stats = window.MNX_REVIEWS?.stats(p.id);
    const ratingHtml = stats ? `<span class="stars">${mnxSingleStarIcon()}</span> ${stats.avg.toFixed(1)}` : 'ยังไม่มีคะแนน';
    return `
    <article class="widget-card fade-in">
      <div class="widget-card__img-wrap" data-place-open="${p.id}">
        <img src="${typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(p.img) : p.img}" alt="${p.name}" draggable="false" onerror="this.src='/assets/images/placeholder.jpg'" />
        <span class="widget-card__badge">${MNX_CATEGORY_BADGE[p.category] || p.category}</span>
      </div>
      <div class="widget-card__body" data-place-open="${p.id}">
        <h4 class="widget-card__title">${p.name}</h4>
        <div class="widget-card__rating">${ratingHtml}</div>
        <p class="widget-card__desc">${p.desc}</p>
        <div class="widget-card__coords">${mnxPinIcon()} <a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${p.lat}, ${p.lng}</a></div>
        <div class="widget-card__footer"><span>${p.area}</span><span>${mnxArrowIcon()}</span></div>
      </div>
    </article>
  `;
  }).join('');
  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

