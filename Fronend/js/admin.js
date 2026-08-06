const MNX_ADMIN_CATEGORY_LABELS = {
  cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร (สายกิน)', temple: 'วัด/สถานที่ศักดิ์สิทธิ์',
  fitness: 'ออกกำลังกาย', nature: 'ธรรมชาติ', landmark: 'แลนด์มาร์ก', culture: 'วัฒนธรรม',
  mutelu: 'มูเตลู', shopping: 'ช้อปปิ้ง',
};

let mnxAdminPlacesCache = [];
let mnxAdminUsersCache = [];
let mnxAdminReviewsCache = [];
let mnxAdminMediaCache = [];
let mnxAdminCheckinsCache = [];
let mnxAdminEditingPlaceId = null;
let mnxAdminPendingDelete = null;
let mnxAdminPlacePhotos = []; 

/* ----------------------------------------------------------
   Access gate
---------------------------------------------------------- */
function mnxAdminCheckAccess() {
  const gate = document.getElementById('admin-gate');
  const shell = document.getElementById('admin-shell');

  const session = window.MNX_AUTH?.getSession();

  if (!session) {
    mnxRenderAdminGate('signin');
    return false;
  }
  if (session.role !== 'admin') {
    mnxRenderAdminGate('forbidden');
    return false;
  }

  gate.style.display = 'none';
  shell.style.display = 'flex';
  document.getElementById('admin-topbar-name').textContent = session.name;
  document.getElementById('admin-topbar-avatar').src = session.avatar || '/assets/images/avatar-placeholder.png';
  return true;
}

function mnxRenderAdminGate(kind) {
  const gate = document.getElementById('admin-gate');
  const shell = document.getElementById('admin-shell');
  shell.style.display = 'none';
  gate.style.display = 'flex';

  if (kind === 'signin') {
    gate.innerHTML = `
      <div class="admin-gate__icon"></div>
      <h2>กรุณาเข้าสู่ระบบ</h2>
      <p>คุณต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบก่อนจึงจะเข้าใช้งาน Admin Panel ได้</p>
      <button class="btn btn-gold" id="admin-gate-login">เข้าสู่ระบบ</button>
    `;
    document.getElementById('admin-gate-login')?.addEventListener('click', () => mnxOpenAuthModal('login'));
  } else {
    gate.innerHTML = `
      <div class="admin-gate__icon"></div>
      <h2>ไม่มีสิทธิ์เข้าถึง</h2>
      <p>บัญชีของคุณไม่มีสิทธิ์ผู้ดูแลระบบ หากคิดว่านี่เป็นความผิดพลาด ติดต่อผู้ดูแลระบบคนอื่นเพื่อขอสิทธิ์</p>
      <a href="/Fronend/index.html" class="btn btn-outline">กลับหน้าหลัก</a>
    `;
  }
}

/* ----------------------------------------------------------
   Sidebar nav + view switching
---------------------------------------------------------- */
function mnxAdminInitNav() {
  document.querySelectorAll('.admin-nav__item[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => mnxAdminSwitchView(btn.dataset.view));
  });
}

function mnxAdminSwitchView(view) {
  document.querySelectorAll('.admin-nav__item[data-view]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });
  document.querySelectorAll('.admin-view').forEach((el) => {
    el.classList.toggle('is-active', el.id === `admin-view-${view}`);
  });

  const titles = {
    dashboard: ['📊 แดชบอร์ด', 'ภาพรวมข้อมูลทั้งหมดในระบบ'],
    places: ['📍 จัดการสถานที่', 'เพิ่ม แก้ไข หรือลบร้านอาหาร คาเฟ่ และสถานที่ท่องเที่ยวทุกหมวด'],
    reviews: ['⭐ จัดการรีวิว', 'ตรวจสอบและลบรีวิวที่ไม่เหมาะสมได้จากทุกสถานที่'],
    media: ['📹 จัดการวิดีโอ', 'ตรวจสอบวิดีโอรีวิวจากผู้ใช้จริง ดูตัวอย่าง และลบวิดีโอที่ไม่เหมาะสม'],
    checkins: ['📸 จัดการเช็คอิน', 'ตรวจสอบโพสต์เช็คอินจากผู้ใช้จริง และลบโพสต์ที่ไม่เหมาะสม'],
    events: ['🎉 จัดการกิจกรรม / เทศกาล', 'เพิ่ม แก้ไข หรือลบกิจกรรมและเทศกาล ที่แสดงในหน้าแรกและ popup'],
    users: ['👥 จัดการผู้ใช้งาน', 'ดูรายชื่อสมาชิกทั้งหมดและกำหนดสิทธิ์ผู้ดูแลระบบ'],
    ads: ['📢 จัดการโฆษณา', 'อัปโหลดภาพโฆษณาและตั้งค่าลิงก์ปลายทาง'],
    audit: ['🛡️ Audit Log', 'ประวัติการดำเนินการทั้งหมดของผู้ดูแลระบบ ใครทำอะไร เมื่อไหร่'],
  };
  document.getElementById('admin-topbar-title').textContent = titles[view]?.[0] || '';
  document.getElementById('admin-topbar-sub').textContent = titles[view]?.[1] || '';

  if (view === 'dashboard') mnxAdminLoadDashboard();
  if (view === 'places') mnxAdminLoadPlaces();
  if (view === 'reviews') mnxAdminLoadReviews();
  if (view === 'media') mnxAdminLoadMedia();
  if (view === 'checkins') mnxAdminLoadCheckins();
  if (view === 'events') mnxAdminLoadEvents();
  if (view === 'users') mnxAdminLoadUsers();
  if (view === 'ads') mnxAdminLoadAds();
  if (view === 'audit') mnxAdminLoadAuditLogs();
}

/* ----------------------------------------------------------
   Toast helper
---------------------------------------------------------- */
function mnxAdminToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast');
  toast.textContent = (type === 'success' ? '✓ ' : '✕ ') + message;
  toast.className = `admin-toast admin-toast--${type} is-visible`;
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

/* ----------------------------------------------------------
   Dashboard
---------------------------------------------------------- */
async function mnxAdminLoadDashboard() {
  try {
    const data = await window.MNX_API.get('/admin/dashboard');
    const t = data.totals;

    document.getElementById('admin-stat-places').textContent = t.places;
    document.getElementById('admin-stat-users').textContent = t.users;
    document.getElementById('admin-stat-reviews').textContent = t.reviews;
    document.getElementById('admin-stat-favorites').textContent = t.favorites;
    document.getElementById('admin-stat-admins').textContent = t.admins;
    document.getElementById('admin-stat-rating').textContent = data.avgRating ? data.avgRating.toFixed(1) : '–';
    document.getElementById('admin-stat-videos').textContent = t.videos;
    document.getElementById('admin-stat-photos').textContent = t.photos;
    document.getElementById('admin-stat-likes').textContent = t.likes;
    document.getElementById('admin-stat-comments').textContent = t.comments;
    document.getElementById('admin-stat-checkins').textContent = t.checkinPosts;

    const catWrap = document.getElementById('admin-category-bars');
    const maxCount = Math.max(1, ...Object.values(data.placesByCategory));
    catWrap.innerHTML = Object.entries(data.placesByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `
        <div>
          <div class="admin-category-bar__label">
            <span>${MNX_ADMIN_CATEGORY_LABELS[cat] || cat}</span>
            <strong>${count}</strong>
          </div>
          <div class="admin-category-bar__track">
            <div class="admin-category-bar__fill" style="width:${(count / maxCount) * 100}%"></div>
          </div>
        </div>
      `).join('') || '<p class="admin-table__empty">ยังไม่มีสถานที่ในระบบ</p>';

    const videoCatWrap = document.getElementById('admin-video-category-bars');
    const videoCats = data.videosByCategory || {};
    const maxVideoCount = Math.max(1, ...Object.values(videoCats));
    videoCatWrap.innerHTML = Object.entries(videoCats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `
        <div>
          <div class="admin-category-bar__label">
            <span>${MNX_ADMIN_CATEGORY_LABELS[cat] || cat}</span>
            <strong>${count}</strong>
          </div>
          <div class="admin-category-bar__track">
            <div class="admin-category-bar__fill" style="width:${(count / maxVideoCount) * 100}%"></div>
          </div>
        </div>
      `).join('') || '<p class="admin-table__empty">ยังไม่มีวิดีโอในระบบ</p>';

    document.getElementById('admin-recent-users').innerHTML = data.recentUsers.length
      ? data.recentUsers.map((u) => `
          <div class="admin-mini-list__item">
            <span>👤 ${u.name}</span>
            <span class="admin-mini-list__meta">${new Date(u.joinedAt).toLocaleDateString('th-TH')}</span>
          </div>
        `).join('')
      : '<p class="admin-table__empty">ยังไม่มีผู้ใช้งาน</p>';

    document.getElementById('admin-recent-reviews').innerHTML = data.recentReviews.length
      ? data.recentReviews.map((r) => `
          <div class="admin-mini-list__item">
            <span>👤 ${r.author} · <span style="color:var(--color-gold)">${'★'.repeat(r.rating)}</span></span>
            <span class="admin-mini-list__meta">📍 ${r.placeId}</span>
          </div>
        `).join('')
      : '<p class="admin-table__empty">ยังไม่มีรีวิว</p>';

    document.getElementById('admin-recent-videos').innerHTML = data.recentVideos.length
      ? data.recentVideos.map((v) => `
          <div class="admin-mini-list__item">
            <span>👤 ${v.author} · ${MNX_ADMIN_CATEGORY_LABELS[v.category] || v.category || 'ไม่ระบุหมวด'}</span>
            <span class="admin-mini-list__meta">📍 ${v.placeId}</span>
          </div>
        `).join('')
      : '<p class="admin-table__empty">ยังไม่มีวิดีโอ</p>';

    document.getElementById('admin-recent-checkins').innerHTML = data.recentCheckins.length
      ? data.recentCheckins.map((c) => `
          <div class="admin-mini-list__item">
            <span>👤 ${c.author} · ${c.visibility === 'private' ? '🔒 ส่วนตัว' : '🌐 สาธารณะ'}</span>
            <span class="admin-mini-list__meta">📍 ${c.place}</span>
          </div>
        `).join('')
      : '<p class="admin-table__empty">ยังไม่มีเช็คอิน</p>';
  } catch (err) {
    mnxAdminToast(err.message || 'โหลดข้อมูลแดชบอร์ดไม่สำเร็จ', 'error');
  }
}

/* ----------------------------------------------------------
   Places tab
---------------------------------------------------------- */
async function mnxAdminLoadPlaces() {
  const tbody = document.getElementById('admin-places-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">กำลังโหลด...</td></tr>`;
  try {
    const data = await window.MNX_API.get('/places');
    mnxAdminPlacesCache = data.places;
    mnxAdminRenderPlacesTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }
}

function mnxAdminRenderPlacesTable() {
  const tbody = document.getElementById('admin-places-tbody');
  const search = (document.getElementById('admin-places-search').value || '').trim().toLowerCase();
  const activeFilter = document.querySelector('#admin-places-filters .admin-toolbar__filter.is-active')?.dataset.category || 'all';

  let rows = mnxAdminPlacesCache;
  if (activeFilter !== 'all') rows = rows.filter((p) => p.category === activeFilter);
  if (search) rows = rows.filter((p) => p.name.toLowerCase().includes(search) || p.area.toLowerCase().includes(search));

  document.getElementById('admin-places-count').textContent = `${rows.length} สถานที่`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">ไม่พบสถานที่ที่ตรงกับเงื่อนไข</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((p) => `
    <tr>
      <td>
        <div class="admin-table__place-cell">
          <img src="${mnxAdminAbsoluteUploadUrl(p.img)}" alt="${p.name}" onerror="this.style.opacity=0" />
          <div>
            <div class="admin-table__place-name">${p.name}</div>
            <div class="admin-table__place-area">${p.area}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="admin-badge">${MNX_ADMIN_CATEGORY_LABELS[p.category] || p.category}</span>
        ${p.category2 ? `<span class="admin-badge" style="margin-left: 4px;">${MNX_ADMIN_CATEGORY_LABELS[p.category2] || p.category2}</span>` : ''}
      </td>
      <td>★ ${Number(p.rating).toFixed(1)}</td>
      <td>${p.price}</td>
      <td>${p.published !== false ? '<span class="admin-badge admin-badge--gold">เผยแพร่</span>' : '<span class="admin-badge admin-badge--muted">ซ่อนอยู่</span>'}</td>
      <td>
        <div class="admin-table__actions">
          <button class="admin-icon-btn" data-action="edit-place" data-id="${p.id}" aria-label="แก้ไข" title="แก้ไข">✏️</button>
          <button class="admin-icon-btn" data-action="toggle-publish" data-id="${p.id}" aria-label="ซ่อน/แสดง" title="${p.published !== false ? 'ซ่อนจากหน้าเว็บ' : 'เผยแพร่บนหน้าเว็บ'}">${p.published !== false ? '👁️' : '🙈'}</button>
          <button class="admin-icon-btn admin-icon-btn--danger" data-action="delete-place" data-id="${p.id}" data-name="${p.name}" aria-label="ลบ" title="ลบ">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function mnxAdminOpenPlaceModal(placeId = null) {
  mnxAdminEditingPlaceId = placeId;
  const modal = document.getElementById('admin-place-modal');
  const form = document.getElementById('admin-place-form');
  form.reset();
  document.getElementById('admin-place-form-error').classList.remove('is-active');

  const place = placeId ? mnxAdminPlacesCache.find((p) => p.id === placeId) : null;
  document.getElementById('admin-place-modal-title').textContent = place ? `แก้ไข: ${place.name}` : 'เพิ่มสถานที่ใหม่';

  if (place) {
    form.elements.name.value = place.name;
    form.elements.category.value = place.category;
    form.elements.category2.value = place.category2 || '';
    form.elements.desc.value = place.desc;
    form.elements.area.value = place.area;
    form.elements.price.value = place.price;
    form.elements.lat.value = place.lat;
    form.elements.lng.value = place.lng;
    form.elements.rating.value = place.rating;
    form.elements.popularity.value = place.popularity || 0;
    form.elements.published.checked = place.published !== false;
    mnxAdminPlacePhotos = [place.img, ...(place.images || [])].filter((url, i, arr) => url && arr.indexOf(url) === i);
  } else {
    form.elements.rating.value = 4.5;
    form.elements.popularity.value = 0;
    form.elements.published.checked = true;
    mnxAdminPlacePhotos = [];
  }

  mnxAdminRenderPhotoSlots();
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function mnxAdminClosePlaceModal() {
  document.getElementById('admin-place-modal').classList.remove('is-open');
  document.body.style.overflow = '';
  mnxAdminEditingPlaceId = null;
  mnxAdminPlacePhotos = [];
}

const MNX_ADMIN_MAX_PLACE_PHOTOS = 10;

function mnxAdminRenderPhotoSlots() {
  const wrap = document.getElementById('admin-place-photo-slots');
  if (!wrap) return;

  wrap.innerHTML = '';
  for (let i = 0; i < MNX_ADMIN_MAX_PLACE_PHOTOS; i++) {
    const url = mnxAdminPlacePhotos[i];
    const slot = document.createElement('div');
    slot.className = 'admin-photo-slot';
    if (url) {
      slot.innerHTML = `
        <img src="${mnxAdminAbsoluteUploadUrl(url)}" alt="รูปที่ ${i + 1}" />
        ${i === 0 ? '<span class="admin-photo-slot__main-badge">ภาพหลัก</span>' : ''}
        <button type="button" class="admin-photo-slot__remove" data-index="${i}" aria-label="ลบรูป">✕</button>
      `;
    } else {
      slot.innerHTML = `<span class="admin-photo-slot__icon">＋</span>`;
      slot.addEventListener('click', () => document.getElementById('admin-place-photo-input').click());
    }
    wrap.appendChild(slot);
  }

  wrap.querySelectorAll('.admin-photo-slot__remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      mnxAdminPlacePhotos.splice(Number(btn.dataset.index), 1);
      mnxAdminRenderPhotoSlots();
    });
  });
}

async function mnxAdminHandlePhotoInputChange(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (!files.length) return;

  const remaining = MNX_ADMIN_MAX_PLACE_PHOTOS - mnxAdminPlacePhotos.length;
  if (remaining <= 0) return;
  const toUpload = files.slice(0, remaining);

  const wrap = document.getElementById('admin-place-photo-slots');
  const placeholderIndex = mnxAdminPlacePhotos.length;
  const slots = wrap.querySelectorAll('.admin-photo-slot');
  if (slots[placeholderIndex]) slots[placeholderIndex].innerHTML = `<span class="admin-photo-slot__uploading">กำลังอัปโหลด...</span>`;

  try {
    const form = new FormData();
    toUpload.forEach((file) => form.append('photos', file));
    const data = await window.MNX_API.postForm('/places/photos', form);
    mnxAdminPlacePhotos.push(...data.urls);
  } catch (err) {
    mnxAdminToast(err.message || 'อัปโหลดรูปไม่สำเร็จ', 'error');
  } finally {
    mnxAdminRenderPhotoSlots();
  }
}

async function mnxAdminSubmitPlaceForm(e) {
  e.preventDefault();
  const form = e.target;
  const errorBanner = document.getElementById('admin-place-form-error');
  errorBanner.classList.remove('is-active');

  if (!mnxAdminPlacePhotos.length) {
    errorBanner.textContent = 'กรุณาอัปโหลดรูปภาพสถานที่อย่างน้อย 1 รูป';
    errorBanner.classList.add('is-active');
    return;
  }

  const payload = {
    name: form.elements.name.value,
    category: form.elements.category.value,
    category2: form.elements.category2.value || null,
    desc: form.elements.desc.value,
    area: form.elements.area.value,
    price: form.elements.price.value,
    img: mnxAdminPlacePhotos[0],
    images: mnxAdminPlacePhotos,
    lat: form.elements.lat.value,
    lng: form.elements.lng.value,
    rating: form.elements.rating.value,
    popularity: form.elements.popularity.value,
    published: form.elements.published.checked,
  };

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (mnxAdminEditingPlaceId) {
      await window.MNX_API.patch(`/places/${encodeURIComponent(mnxAdminEditingPlaceId)}`, payload);
      mnxAdminToast('บันทึกการแก้ไขสถานที่สำเร็จ');
    } else {
      await window.MNX_API.post('/places', payload);
      mnxAdminToast('เพิ่มสถานที่ใหม่สำเร็จ');
    }
    mnxAdminClosePlaceModal();
    await mnxAdminLoadPlaces();
    await mnxAdminRefreshLiveSiteData();
  } catch (err) {
    errorBanner.textContent = err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    errorBanner.classList.add('is-active');
  } finally {
    submitBtn.disabled = false;
  }
}

async function mnxAdminTogglePublish(placeId) {
  const place = mnxAdminPlacesCache.find((p) => p.id === placeId);
  if (!place) return;
  try {
    await window.MNX_API.patch(`/places/${encodeURIComponent(placeId)}`, { published: !(place.published !== false) });
    mnxAdminToast(place.published !== false ? 'ซ่อนสถานที่จากหน้าเว็บแล้ว' : 'เผยแพร่สถานที่บนหน้าเว็บแล้ว');
    await mnxAdminLoadPlaces();
    await mnxAdminRefreshLiveSiteData();
  } catch (err) {
    mnxAdminToast(err.message || 'ทำรายการไม่สำเร็จ', 'error');
  }
}

async function mnxAdminDeletePlace(placeId) {
  try {
    await mnxApiDeleteRaw(`/places/${encodeURIComponent(placeId)}`);
    mnxAdminToast('ลบสถานที่สำเร็จ');
    await mnxAdminLoadPlaces();
    await mnxAdminRefreshLiveSiteData();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบไม่สำเร็จ', 'error');
  }
}

/* ----------------------------------------------------------
   Reviews tab
---------------------------------------------------------- */
async function mnxAdminLoadReviews() {
  const tbody = document.getElementById('admin-reviews-tbody');
  tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">กำลังโหลด...</td></tr>`;
  try {
    const data = await window.MNX_API.get('/admin/reviews');
    mnxAdminReviewsCache = data.reviews;
    mnxAdminRenderReviewsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }
}

function mnxAdminRenderReviewsTable() {
  const tbody = document.getElementById('admin-reviews-tbody');
  const search = (document.getElementById('admin-reviews-search').value || '').trim().toLowerCase();

  let rows = mnxAdminReviewsCache;
  if (search) {
    rows = rows.filter((r) => r.author.toLowerCase().includes(search) || r.placeId.toLowerCase().includes(search) || r.text.toLowerCase().includes(search));
  }

  document.getElementById('admin-reviews-count').textContent = `${rows.length} รีวิว`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">ไม่พบรีวิวที่ตรงกับเงื่อนไข</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td>${r.author}</td>
      <td>${r.placeId}</td>
      <td>★ ${r.rating}</td>
      <td style="max-width:280px; white-space:normal;">${r.text}</td>
      <td>
        <button class="admin-icon-btn admin-icon-btn--danger" data-action="delete-review" data-place-id="${r.placeId}" data-review-id="${r.id}" aria-label="ลบรีวิว" title="ลบรีวิว">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function mnxAdminDeleteReview(placeId, reviewId) {
  try {
    await mnxApiDeleteRaw(`/reviews/${encodeURIComponent(placeId)}/${encodeURIComponent(reviewId)}/moderate`);
    mnxAdminToast('ลบรีวิวสำเร็จ');
    await mnxAdminLoadReviews();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบรีวิวไม่สำเร็จ', 'error');
  }
}

async function mnxAdminLoadMedia() {
  const grid = document.getElementById('admin-media-grid');
  grid.innerHTML = `<p class="admin-table__empty">กำลังโหลด...</p>`;
  try {
    const data = await window.MNX_API.get('/admin/videos');
    mnxAdminMediaCache = data.videos;
    mnxAdminRenderMediaGrid();
  } catch (err) {
    grid.innerHTML = `<p class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</p>`;
  }
}

function mnxAdminRenderMediaGrid() {
  const grid = document.getElementById('admin-media-grid');
  const search = (document.getElementById('admin-media-search').value || '').trim().toLowerCase();
  const activeFilter = document.querySelector('#admin-media-filters .admin-toolbar__filter.is-active')?.dataset.category || 'all';

  let rows = mnxAdminMediaCache;
  if (activeFilter !== 'all') rows = rows.filter((v) => v.category === activeFilter);
  if (search) rows = rows.filter((v) => v.author.toLowerCase().includes(search) || v.placeId.toLowerCase().includes(search));

  document.getElementById('admin-media-count').textContent = `${rows.length} วิดีโอ`;

  if (!rows.length) {
    grid.innerHTML = `<p class="admin-table__empty">ไม่พบวิดีโอที่ตรงกับเงื่อนไข</p>`;
    return;
  }

  grid.innerHTML = rows.map((v) => `
    <div class="admin-media-card" data-review-id="${v.id}" data-place-id="${v.placeId}">
      <div class="admin-media-card__thumb">
        ${v.video?.posterUrl ? `<img src="${mnxAdminAbsoluteUploadUrl(v.video.posterUrl)}" alt="${v.author}" />` : `<video src="${mnxAdminAbsoluteUploadUrl(v.video?.url)}" muted></video>`}
        <span class="admin-media-card__category">${MNX_ADMIN_CATEGORY_LABELS[v.category] || v.category || 'ไม่ระบุหมวด'}</span>
        ${v.video?.durationSec ? `<span class="admin-media-card__duration">${v.video.durationSec}s</span>` : ''}
        <a class="admin-media-card__play" href="${mnxAdminAbsoluteUploadUrl(v.video?.url)}" target="_blank" rel="noopener" aria-label="เปิดดูวิดีโอ"></a>
      </div>
      <div class="admin-media-card__body">
        <div class="admin-media-card__author">${v.author}</div>
        <div class="admin-media-card__place">${v.placeId} · ${'★'.repeat(v.rating)}</div>
        <div class="admin-media-card__text">${v.text || ''}</div>
        <div class="admin-media-card__stats">
          <span>👍 ${v.likeCount || 0}</span>
          <span>💬 ${v.commentCount || 0}</span>
        </div>
        <div class="admin-media-card__actions">
          <button class="admin-icon-btn admin-icon-btn--danger" data-action="delete-media" data-review-id="${v.id}" data-place-id="${v.placeId}" data-name="${v.author}">🗑️ ลบวิดีโอ</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function mnxAdminDeleteMedia(placeId, reviewId) {
  try {
    await mnxApiDeleteRaw(`/reviews/${encodeURIComponent(placeId)}/${encodeURIComponent(reviewId)}/moderate`);
    mnxAdminToast('ลบวิดีโอสำเร็จ');
    await mnxAdminLoadMedia();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบวิดีโอไม่สำเร็จ', 'error');
  }
}

async function mnxAdminLoadCheckins() {
  const grid = document.getElementById('admin-checkins-grid');
  grid.innerHTML = `<p class="admin-table__empty">กำลังโหลด...</p>`;
  try {
    const data = await window.MNX_API.get('/admin/checkins');
    mnxAdminCheckinsCache = data.posts;
    mnxAdminRenderCheckinsGrid();
  } catch (err) {
    grid.innerHTML = `<p class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</p>`;
  }
}

function mnxAdminRenderCheckinsGrid() {
  const grid = document.getElementById('admin-checkins-grid');
  const search = (document.getElementById('admin-checkins-search').value || '').trim().toLowerCase();
  const activeFilter = document.querySelector('#admin-checkins-filters .admin-toolbar__filter.is-active')?.dataset.visibility || 'all';

  let rows = mnxAdminCheckinsCache;
  if (activeFilter !== 'all') rows = rows.filter((p) => p.visibility === activeFilter);
  if (search) rows = rows.filter((p) => p.author.toLowerCase().includes(search) || p.place.toLowerCase().includes(search));

  document.getElementById('admin-checkins-count').textContent = `${rows.length} โพสต์`;

  if (!rows.length) {
    grid.innerHTML = `<p class="admin-table__empty">ไม่พบโพสต์ที่ตรงกับเงื่อนไข</p>`;
    return;
  }

  grid.innerHTML = rows.map((p) => `
    <div class="admin-media-card" data-post-id="${p.id}">
      <div class="admin-media-card__thumb">
        <img src="${mnxAdminAbsoluteUploadUrl(p.photos?.[0])}" alt="${p.place}" onerror="this.style.opacity=0" />
        <span class="admin-media-card__category">${p.visibility === 'private' ? 'ส่วนตัว' : 'สาธารณะ'}</span>
        ${p.photos?.length > 1 ? `<span class="admin-media-card__duration">${p.photos.length}</span>` : ''}
      </div>
      <div class="admin-media-card__body">
        <div class="admin-media-card__author">${p.author}</div>
        <div class="admin-media-card__place">📍 ${p.place}${p.rating ? ` · <span style="color:var(--color-gold)">${'★'.repeat(p.rating)}</span>` : ''}</div>
        <div class="admin-media-card__stats">
          <span>👍 ${p.likeCount || 0}</span>
          <span>💬 ${p.commentCount || 0}</span>
        </div>
        <div class="admin-media-card__actions">
          <button class="admin-icon-btn admin-icon-btn--danger" data-action="delete-checkin" data-post-id="${p.id}" data-name="${p.author}">🗑️ ลบโพสต์</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function mnxAdminDeleteCheckin(postId) {
  try {
    await mnxApiDeleteRaw(`/checkin/${encodeURIComponent(postId)}/moderate`);
    mnxAdminToast('ลบโพสต์เช็คอินสำเร็จ');
    await mnxAdminLoadCheckins();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบโพสต์ไม่สำเร็จ', 'error');
  }
}

/* ----------------------------------------------------------
   Events tab — manage festival/event cards shown on the homepage
   and the event welcome popup, without touching any code.
---------------------------------------------------------- */
let mnxAdminEventsCache = [];
let mnxAdminEditingEventId = null;

async function mnxAdminLoadEvents() {
  const tbody = document.getElementById('admin-events-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">กำลังโหลด...</td></tr>`;
  try {
    const data = await window.MNX_API.get('/events/all');
    mnxAdminEventsCache = data.events;
    mnxAdminRenderEventsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }
}

function mnxAdminRenderEventsTable() {
  const tbody = document.getElementById('admin-events-tbody');
  const search = (document.getElementById('admin-events-search').value || '').trim().toLowerCase();
  const statusFilter = document.querySelector('#admin-events-filters .admin-toolbar__filter.is-active')?.dataset.status || 'all';

  let rows = mnxAdminEventsCache;
  if (statusFilter === 'active') rows = rows.filter((e) => e.active !== false);
  if (statusFilter === 'inactive') rows = rows.filter((e) => e.active === false);
  if (search) rows = rows.filter((e) => e.title.toLowerCase().includes(search) || (e.location || '').toLowerCase().includes(search));

  document.getElementById('admin-events-count').textContent = `${rows.length} กิจกรรม`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">ไม่พบกิจกรรมที่ตรงกับเงื่อนไข</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((e) => `
    <tr>
      <td>
        <div class="admin-table__place-cell">
          ${e.banner ? `<img src="${e.banner}" alt="${e.title}" onerror="this.style.opacity=0" />` : `<div style="width:46px;height:46px;border-radius:8px;background:var(--color-ivory);display:flex;align-items:center;justify-content:center;font-size:1.2rem;"></div>`}
          <div>
            <div class="admin-table__place-name">${e.title}</div>
            <div class="admin-table__place-area">${e.tag || ''}</div>
          </div>
        </div>
      </td>
      <td style="font-size:0.78rem;">${e.dates || (e.startDate ? `${e.startDate} – ${e.endDate || ''}` : '–')}</td>
      <td style="font-size:0.78rem;">${e.location || '–'}</td>
      <td>${e.active !== false ? '<span class="admin-badge admin-badge--gold">แสดงอยู่</span>' : '<span class="admin-badge admin-badge--muted">ซ่อนอยู่</span>'}</td>
      <td>${e.showAsPopup ? '<span class="admin-badge admin-badge--gold">✓ Popup</span>' : '<span class="admin-badge admin-badge--muted">–</span>'}</td>
      <td>
        <div class="admin-table__actions">
          <button class="admin-icon-btn" data-action="edit-event" data-id="${e.id}" title="แก้ไข">✏️</button>
          <button class="admin-icon-btn" data-action="toggle-event" data-id="${e.id}" title="${e.active !== false ? 'ซ่อน' : 'แสดง'}">${e.active !== false ? '👁️' : '🙈'}</button>
          <button class="admin-icon-btn admin-icon-btn--danger" data-action="delete-event" data-id="${e.id}" data-name="${e.title}" title="ลบ">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function mnxAdminOpenEventModal(eventId = null) {
  try {
    mnxAdminEditingEventId = eventId;
    const modal = document.getElementById('admin-event-modal');
    const form = document.getElementById('admin-event-form');
    form.reset();
    document.getElementById('admin-event-form-error').classList.remove('is-active');

    const ev = eventId ? mnxAdminEventsCache.find((e) => e.id === eventId) : null;
    document.getElementById('admin-event-modal-title').textContent = ev ? `แก้ไข: ${ev.title}` : 'เพิ่มกิจกรรมใหม่';

    if (ev) {
      form.elements.title.value = ev.title || '';
      form.elements.tag.value = ev.tag || '';
      form.elements.badge.value = ev.badge || '';
      form.elements.desc.value = ev.desc || '';
      form.elements.startDate.value = ev.startDate || '';
      form.elements.endDate.value = ev.endDate || '';
      form.elements.dates.value = ev.dates || '';
      form.elements.location.value = ev.location || '';
      document.getElementById('admin-event-banner-hidden').value = ev.banner || '';
      form.elements.ctaHref.value = ev.ctaHref || '';
      
      const bannerSlot = document.getElementById('admin-event-banner-slot');
      if (bannerSlot) {
        if (ev.banner) {
          bannerSlot.innerHTML = `
            <img src="${mnxAdminAbsoluteUploadUrl(ev.banner)}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />
            <button type="button" class="admin-photo-slot__remove" id="admin-event-banner-remove">✕</button>
          `;
        } else {
          bannerSlot.innerHTML = `<span class="admin-photo-slot__icon">＋</span>`;
        }
      }
      
      form.elements.active.checked = ev.active !== false;
      form.elements.showAsPopup.checked = !!ev.showAsPopup;
    } else {
      const bannerSlot = document.getElementById('admin-event-banner-slot');
      if (bannerSlot) {
        bannerSlot.innerHTML = `<span class="admin-photo-slot__icon">＋</span>`;
      }
      form.elements.active.checked = true;
      form.elements.ctaHref.value = '/Fronend/pages/events.html';
    }

    const bannerUpload = document.getElementById('admin-event-banner-upload');
    if (bannerUpload) bannerUpload.value = '';

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Error opening modal:', err);
    alert('เกิดข้อผิดพลาดในการเปิดหน้าแก้ไข: ' + err.message);
  }
}

function mnxAdminCloseEventModal() {
  document.getElementById('admin-event-modal').classList.remove('is-open');
  document.body.style.overflow = '';
  mnxAdminEditingEventId = null;
}

async function mnxAdminSubmitEventForm(e) {
  e.preventDefault();
  const form = e.target;
  const errorBanner = document.getElementById('admin-event-form-error');
  errorBanner.classList.remove('is-active');

  const payload = {
    title: form.elements.title.value,
    tag: form.elements.tag.value,
    badge: form.elements.badge.value,
    desc: form.elements.desc.value,
    startDate: form.elements.startDate.value,
    endDate: form.elements.endDate.value,
    dates: form.elements.dates.value,
    location: form.elements.location.value,
    banner: form.elements.banner.value,
    ctaHref: form.elements.ctaHref.value,
    active: form.elements.active.checked,
    showAsPopup: form.elements.showAsPopup.checked,
  };

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (mnxAdminEditingEventId) {
      await window.MNX_API.patch(`/events/${encodeURIComponent(mnxAdminEditingEventId)}`, payload);
      mnxAdminToast('บันทึกการแก้ไขกิจกรรมสำเร็จ');
    } else {
      await window.MNX_API.post('/events', payload);
      mnxAdminToast('เพิ่มกิจกรรมใหม่สำเร็จ');
    }
    mnxAdminCloseEventModal();
    await mnxAdminLoadEvents();
    // Signal homepage to re-render events section
    document.dispatchEvent(new CustomEvent('events:updated'));
  } catch (err) {
    errorBanner.textContent = err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    errorBanner.classList.add('is-active');
  } finally {
    submitBtn.disabled = false;
  }
}

async function mnxAdminToggleEvent(eventId) {
  const ev = mnxAdminEventsCache.find((e) => e.id === eventId);
  if (!ev) return;
  try {
    await window.MNX_API.patch(`/events/${encodeURIComponent(eventId)}`, { active: !(ev.active !== false) });
    mnxAdminToast(ev.active !== false ? 'ซ่อนกิจกรรมแล้ว' : 'แสดงกิจกรรมแล้ว');
    await mnxAdminLoadEvents();
    document.dispatchEvent(new CustomEvent('events:updated'));
  } catch (err) {
    mnxAdminToast(err.message || 'ทำรายการไม่สำเร็จ', 'error');
  }
}

async function mnxAdminDeleteEvent(eventId) {
  try {
    await mnxApiDeleteRaw(`/events/${encodeURIComponent(eventId)}`);
    mnxAdminToast('ลบกิจกรรมสำเร็จ');
    await mnxAdminLoadEvents();
    document.dispatchEvent(new CustomEvent('events:updated'));
  } catch (err) {
    mnxAdminToast(err.message || 'ลบไม่สำเร็จ', 'error');
  }
}

/* ----------------------------------------------------------
   Users tab
---------------------------------------------------------- */
async function mnxAdminLoadUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">กำลังโหลด...</td></tr>`;
  try {
    const data = await window.MNX_API.get('/admin/users');
    mnxAdminUsersCache = data.users;
    mnxAdminRenderUsersTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }
}

function mnxAdminRenderUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  const search = (document.getElementById('admin-users-search').value || '').trim().toLowerCase();

  let rows = mnxAdminUsersCache;
  if (search) rows = rows.filter((u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));

  document.getElementById('admin-users-count').textContent = `${rows.length} ผู้ใช้งาน`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</td></tr>`;
    return;
  }

  const currentUid = window.MNX_AUTH?.getSession()?.uid;

  tbody.innerHTML = rows.map((u) => `
    <tr>
      <td>${u.name}${u.uid === currentUid ? ' <span class="admin-badge admin-badge--muted">คุณ</span>' : ''}</td>
      <td>${u.email}</td>
      <td>${new Date(u.joinedAt).toLocaleDateString('th-TH')}</td>
      <td>${u.role === 'admin' ? '<span class="admin-badge admin-badge--gold">ผู้ดูแลระบบ</span>' : '<span class="admin-badge admin-badge--muted">สมาชิกทั่วไป</span>'}</td>
      <td>
        <div class="admin-table__actions">
          ${u.role === 'admin'
            ? `<button class="admin-icon-btn admin-icon-btn--danger" data-action="demote-user" data-uid="${u.uid}" ${u.uid === currentUid ? 'disabled title="ถอดสิทธิ์ตัวเองไม่ได้"' : 'title="ถอดสิทธิ์แอดมิน"'}>⬇️</button>`
            : `<button class="admin-icon-btn" data-action="promote-user" data-uid="${u.uid}" title="ตั้งเป็นแอดมิน">⬆️</button>`}
        </div>
      </td>
    </tr>
  `).join('');
}

async function mnxAdminSetUserRole(uid, role) {
  try {
    await window.MNX_API.patch(`/admin/users/${encodeURIComponent(uid)}/role`, { role });
    mnxAdminToast(role === 'admin' ? 'ตั้งเป็นผู้ดูแลระบบสำเร็จ' : 'ถอดสิทธิ์ผู้ดูแลระบบสำเร็จ');
    await mnxAdminLoadUsers();
  } catch (err) {
    mnxAdminToast(err.message || 'ทำรายการไม่สำเร็จ', 'error');
  }
}

let mnxAdminAuditLogsCache = [];

const MNX_ADMIN_AUDIT_ACTION_LABELS = {
  'place.create': '➕ เพิ่มสถานที่',
  'place.update': 'แก้ไขสถานที่',
  'place.delete': 'ลบสถานที่',
  'place.publish': 'เผยแพร่สถานที่',
  'place.unpublish': 'ซ่อนสถานที่',
  'review.delete': 'ลบรีวิว',
  'video.delete': 'ลบวิดีโอ',
  'checkin.delete': 'ลบโพสต์เช็คอิน',
  'comment.delete': 'ลบความคิดเห็น',
  'user.promote': '⬆ตั้งเป็นแอดมิน',
  'user.demote': '⬇ถอดสิทธิ์แอดมิน',
  'event.create': '➕ เพิ่มกิจกรรม',
  'event.update': 'แก้ไขกิจกรรม',
  'event.delete': 'ลบกิจกรรม',
};

function mnxAdminAuditActionLabel(action) {
  return MNX_ADMIN_AUDIT_ACTION_LABELS[action] || action;
}

async function mnxAdminLoadAuditLogs() {
  const tbody = document.getElementById('admin-audit-tbody');
  tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">กำลังโหลด...</td></tr>`;
  try {
    const data = await window.MNX_API.get('/admin/audit-logs');
    mnxAdminAuditLogsCache = data.logs;
    mnxAdminRenderAuditTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }
}

function mnxAdminRenderAuditTable() {
  const tbody = document.getElementById('admin-audit-tbody');
  const search = (document.getElementById('admin-audit-search').value || '').trim().toLowerCase();
  const activeFilter = document.querySelector('#admin-audit-filters .admin-toolbar__filter.is-active')?.dataset.target || 'all';

  let rows = mnxAdminAuditLogsCache;
  if (activeFilter !== 'all') rows = rows.filter((l) => l.targetType === activeFilter);
  if (search) {
    rows = rows.filter((l) =>
      (l.actorName || '').toLowerCase().includes(search) ||
      (l.targetLabel || '').toLowerCase().includes(search) ||
      mnxAdminAuditActionLabel(l.action).toLowerCase().includes(search)
    );
  }

  document.getElementById('admin-audit-count').textContent = `${rows.length} รายการ`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">ไม่พบประวัติที่ตรงกับเงื่อนไข</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((l) => `
    <tr>
      <td style="white-space:nowrap; font-size:0.78rem; color:var(--color-text-muted);">${new Date(l.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
      <td>${l.actorName || 'ไม่ทราบ'}</td>
      <td><span class="admin-badge">${mnxAdminAuditActionLabel(l.action)}</span></td>
      <td>${l.targetLabel || l.targetId || ''}</td>
      <td>
        <button class="admin-icon-btn admin-icon-btn--danger" data-action="delete-audit-log" data-id="${l.id}" aria-label="ลบรายการนี้" title="ลบรายการนี้">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function mnxAdminDeleteAuditLog(id) {
  try {
    await mnxApiDeleteRaw(`/admin/audit-logs/${encodeURIComponent(id)}`);
    mnxAdminToast('ลบรายการ Log สำเร็จ');
    await mnxAdminLoadAuditLogs();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบไม่สำเร็จ', 'error');
  }
}

async function mnxAdminClearAllAuditLogs() {
  if (!confirm('ต้องการลบ Audit Log ทั้งหมดหรือไม่? การลบไม่สามารถย้อนกลับได้')) return;
  try {
    const data = await mnxApiDeleteRaw('/admin/audit-logs/all');
    mnxAdminToast(`ลบ Log ทั้งหมดสำเร็จ (${data.deletedCount} รายการ)`);
    await mnxAdminLoadAuditLogs();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบไม่สำเร็จ', 'error');
  }
}

async function mnxAdminPurgeOldAuditLogs() {
  if (!confirm('ต้องการลบ Log ที่เก่ากว่า 2 เดือนตอนนี้เลยหรือไม่?')) return;
  try {
    const data = await window.MNX_API.post('/admin/audit-logs/purge-old');
    mnxAdminToast(`ลบ Log เก่าสำเร็จ (${data.deletedCount} รายการ)`);
    await mnxAdminLoadAuditLogs();
  } catch (err) {
    mnxAdminToast(err.message || 'ลบไม่สำเร็จ', 'error');
  }
}

/* ----------------------------------------------------------
   Ads Management
---------------------------------------------------------- */
async function mnxAdminLoadAds() {
  try {
    const ads = await window.MNX_API.get('/promos');
    renderAdsTable(ads);
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการโหลดโฆษณา');
  }
}

function renderAdsTable(ads) {
  const tbody = document.getElementById('admin-ads-tbody');
  if (!tbody) return;
  
  if (ads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">ไม่มีโฆษณาในระบบ</td></tr>';
    return;
  }

  tbody.innerHTML = ads.map(ad => {
    const resolvedUrl = typeof mnxResolveUploadUrl === 'function' ? mnxResolveUploadUrl(ad.imageUrl) : ad.imageUrl;
    const placementText = ad.placement === 'lifestyle' ? 'หน้าไลฟ์สไตล์ (แนวตั้ง)' : 'หน้าหลัก (แนวนอน)';
    return `
    <tr>
      <td><img src="${resolvedUrl}" style="height: 40px; border-radius: 4px;" onerror="this.src='/assets/images/placeholder.jpg'" /></td>
      <td>${ad.title}</td>
      <td><span class="admin-badge admin-badge--outline">${placementText}</span></td>

      <td>
        <span class="admin-badge ${ad.isActive ? 'admin-badge--success' : 'admin-badge--danger'}">
          ${ad.isActive ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
        </span>
      </td>
      <td>${new Date(ad.createdAt).toLocaleDateString('th-TH')}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openAdminAdModal('${ad._id}', '${ad.title}', ${ad.isActive}, '${resolvedUrl}', '${ad.placement || 'home'}')">แก้ไข</button>
        <button class="btn btn-danger btn-sm" onclick="mnxAdminDeleteAd('${ad._id}')">ลบ</button>
      </td>
    </tr>
    `;
  }).join('');
}

function openAdminAdModal(id = '', title = '', isActive = true, imageUrl = '', placement = 'home') {
  document.getElementById('admin-ad-id').value = id;
  document.getElementById('admin-ad-title').value = title;
  document.getElementById('admin-ad-is-active').checked = isActive;
  document.getElementById('admin-ad-placement').value = placement;
  document.getElementById('admin-ad-image').value = ''; // Reset file input
  
  const preview = document.getElementById('admin-ad-image-preview');
  if (imageUrl) {
    preview.style.display = 'block';
    preview.querySelector('img').src = imageUrl;
  } else {
    preview.style.display = 'none';
  }

  document.getElementById('admin-ad-modal-title').textContent = id ? 'แก้ไขโฆษณา' : 'อัปโหลดโฆษณาใหม่';
  document.getElementById('admin-ad-modal').classList.add('is-open');
}

function closeAdminAdModal() {
  document.getElementById('admin-ad-modal')?.classList.remove('is-open');
}

window.openAdminAdModal = openAdminAdModal;
window.closeAdminAdModal = closeAdminAdModal;

document.getElementById('admin-add-ad-btn')?.addEventListener('click', () => {
  openAdminAdModal();
});

document.getElementById('admin-ad-image')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('admin-ad-image-preview');
      preview.style.display = 'block';
      preview.querySelector('img').src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('admin-ad-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('admin-ad-id').value;
  const title = document.getElementById('admin-ad-title').value.trim();
  const isActive = document.getElementById('admin-ad-is-active').checked;
  const placement = document.getElementById('admin-ad-placement').value;
  const fileInput = document.getElementById('admin-ad-image');
  const file = fileInput.files[0];

  if (!id && !file) {
    alert('กรุณาเลือกรูปภาพแบนเนอร์โฆษณา');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('isActive', isActive);
  formData.append('placement', placement);
  if (file) {
    formData.append('image', file);
  }

  const submitBtn = document.getElementById('admin-ad-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังบันทึก...';

  try {
    const path = id ? `/promos/${id}` : '/promos';
    
    if (id) {
      await window.MNX_API.putForm(path, formData);
    } else {
      await window.MNX_API.postForm(path, formData);
    }

    closeAdminAdModal();
    mnxAdminLoadAds();
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'บันทึกโฆษณา';
  }
});

async function mnxAdminDeleteAd(id) {
  if (!confirm('คุณต้องการลบโฆษณานี้ใช่หรือไม่?')) return;
  
  try {
    await window.MNX_API.delete(`/promos/${id}`);
    mnxAdminLoadAds();
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาด');
  }
}

/* ----------------------------------------------------------
   Delete confirmation (generic inline confirm, reused by Places/Reviews)
----------------------------------------------------------- */
function mnxAdminConfirmDelete(type, id, label, extra = {}) {
  mnxAdminPendingDelete = { type, id, label, extra };
  const banner = document.getElementById('admin-confirm-banner');
  document.getElementById('admin-confirm-text').textContent = `ยืนยันลบ "${label}"? การลบไม่สามารถย้อนกลับได้`;
  banner.classList.add('is-active');
  banner.style.display = 'flex';
}

function mnxAdminCancelDelete() {
  mnxAdminPendingDelete = null;
  document.getElementById('admin-confirm-banner').style.display = 'none';
}

async function mnxAdminExecuteConfirmedDelete() {
  if (!mnxAdminPendingDelete) return;
  const { type, id, extra } = mnxAdminPendingDelete;
  document.getElementById('admin-confirm-banner').style.display = 'none';

  if (type === 'place') await mnxAdminDeletePlace(id);
  if (type === 'review') await mnxAdminDeleteReview(extra.placeId, id);
  if (type === 'media') await mnxAdminDeleteMedia(extra.placeId, id);
  if (type === 'checkin') await mnxAdminDeleteCheckin(id);
  if (type === 'event') await mnxAdminDeleteEvent(id);

  mnxAdminPendingDelete = null;
}

async function mnxApiDeleteRaw(path) {
  const headers = {};
  const token = window.MNX_API.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${window.MNX_API.baseUrl}${path}`, { method: 'DELETE', headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  return json.data;
}

async function mnxAdminRefreshLiveSiteData() {
  await window.mnxSyncPlacesFromApi?.();
}

/* ----------------------------------------------------------
   Event wiring
----------------------------------------------------------- */
function mnxAdminInitEvents() {
  // Places toolbar
  document.getElementById('admin-places-search')?.addEventListener('input', mnxAdminRenderPlacesTable);
  document.querySelectorAll('#admin-places-filters .admin-toolbar__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-places-filters .admin-toolbar__filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      mnxAdminRenderPlacesTable();
    });
  });
  document.getElementById('admin-add-place-btn')?.addEventListener('click', () => mnxAdminOpenPlaceModal());

  document.getElementById('admin-places-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, name } = btn.dataset;
    if (action === 'edit-place') mnxAdminOpenPlaceModal(id);
    if (action === 'toggle-publish') mnxAdminTogglePublish(id);
    if (action === 'delete-place') mnxAdminConfirmDelete('place', id, name);
  });

  // Place modal
  document.getElementById('admin-place-modal-close')?.addEventListener('click', mnxAdminClosePlaceModal);
  document.getElementById('admin-place-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'admin-place-modal') mnxAdminClosePlaceModal();
  });
  document.getElementById('admin-place-form')?.addEventListener('submit', mnxAdminSubmitPlaceForm);
  document.getElementById('admin-place-cancel-btn')?.addEventListener('click', mnxAdminClosePlaceModal);
  document.getElementById('admin-place-photo-input')?.addEventListener('change', mnxAdminHandlePhotoInputChange);

  // Reviews toolbar
  document.getElementById('admin-reviews-search')?.addEventListener('input', mnxAdminRenderReviewsTable);
  document.getElementById('admin-reviews-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete-review"]');
    if (!btn) return;
    mnxAdminConfirmDelete('review', btn.dataset.reviewId, `รีวิวจาก ${btn.closest('tr').children[0].textContent}`, { placeId: btn.dataset.placeId });
  });

  // Media toolbar
  document.getElementById('admin-media-search')?.addEventListener('input', mnxAdminRenderMediaGrid);
  document.querySelectorAll('#admin-media-filters .admin-toolbar__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-media-filters .admin-toolbar__filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      mnxAdminRenderMediaGrid();
    });
  });
  document.getElementById('admin-media-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete-media"]');
    if (!btn) return;
    mnxAdminConfirmDelete('media', btn.dataset.reviewId, `วิดีโอของ ${btn.dataset.name}`, { placeId: btn.dataset.placeId });
  });

  // Events toolbar
  document.getElementById('admin-events-search')?.addEventListener('input', mnxAdminRenderEventsTable);
  document.querySelectorAll('#admin-events-filters .admin-toolbar__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-events-filters .admin-toolbar__filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      mnxAdminRenderEventsTable();
    });
  });
  document.getElementById('admin-add-event-btn')?.addEventListener('click', () => mnxAdminOpenEventModal());
  document.getElementById('admin-events-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit-event') mnxAdminOpenEventModal(btn.dataset.id);
    if (btn.dataset.action === 'toggle-event') mnxAdminToggleEvent(btn.dataset.id);
    if (btn.dataset.action === 'delete-event') mnxAdminConfirmDelete('event', btn.dataset.id, btn.dataset.name);
  });
  // Event modal
  document.getElementById('admin-event-modal-close')?.addEventListener('click', mnxAdminCloseEventModal);
  document.getElementById('admin-event-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'admin-event-modal') mnxAdminCloseEventModal();
  });
  document.getElementById('admin-event-form')?.addEventListener('submit', mnxAdminSubmitEventForm);
  document.getElementById('admin-event-cancel-btn')?.addEventListener('click', mnxAdminCloseEventModal);
  
  // Handle click on the banner slot
  document.getElementById('admin-event-banner-slot')?.addEventListener('click', (e) => {
    if (e.target.id === 'admin-event-banner-remove') {
      const bannerSlot = document.getElementById('admin-event-banner-slot');
      bannerSlot.innerHTML = `<span class="admin-photo-slot__icon">＋</span>`;
      document.getElementById('admin-event-banner-hidden').value = '';
      const bannerUpload = document.getElementById('admin-event-banner-upload');
      if (bannerUpload) bannerUpload.value = '';
      return;
    }
    document.getElementById('admin-event-banner-upload')?.click();
  });

  document.getElementById('admin-event-banner-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const bannerSlot = document.getElementById('admin-event-banner-slot');
    if (bannerSlot) {
      bannerSlot.innerHTML = `<span class="admin-photo-slot__uploading">กำลังอัปโหลด...</span>`;
    }

    const formData = new FormData();
    formData.append('banner', file);

    try {
      const data = await window.MNX_API.postForm('/events/upload-banner', formData);
      if (data && data.url) {
        document.getElementById('admin-event-banner-hidden').value = data.url;
        if (bannerSlot) {
          bannerSlot.innerHTML = `
            <img src="${mnxAdminAbsoluteUploadUrl(data.url)}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />
            <button type="button" class="admin-photo-slot__remove" id="admin-event-banner-remove">✕</button>
          `;
        }
        mnxAdminToast('อัปโหลดรูปร่วมงานสำเร็จ');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + err.message);
      if (bannerSlot) {
        bannerSlot.innerHTML = `<span class="admin-photo-slot__icon">＋</span>`;
      }
      e.target.value = '';
    }
  });

  // Check-ins toolbar
  document.getElementById('admin-checkins-search')?.addEventListener('input', mnxAdminRenderCheckinsGrid);
  document.querySelectorAll('#admin-checkins-filters .admin-toolbar__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-checkins-filters .admin-toolbar__filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      mnxAdminRenderCheckinsGrid();
    });
  });
  document.getElementById('admin-checkins-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete-checkin"]');
    if (!btn) return;
    mnxAdminConfirmDelete('checkin', btn.dataset.postId, `โพสต์เช็คอินของ ${btn.dataset.name}`);
  });

  // Audit log toolbar
  document.getElementById('admin-audit-search')?.addEventListener('input', mnxAdminRenderAuditTable);
  document.querySelectorAll('#admin-audit-filters .admin-toolbar__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-audit-filters .admin-toolbar__filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      mnxAdminRenderAuditTable();
    });
  });
  document.getElementById('admin-audit-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete-audit-log"]');
    if (!btn) return;
    mnxAdminDeleteAuditLog(btn.dataset.id);
  });
  document.getElementById('admin-audit-purge-btn')?.addEventListener('click', mnxAdminPurgeOldAuditLogs);
  document.getElementById('admin-audit-clear-all-btn')?.addEventListener('click', mnxAdminClearAllAuditLogs);

  // Users toolbar
  document.getElementById('admin-users-search')?.addEventListener('input', mnxAdminRenderUsersTable);
  document.getElementById('admin-users-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.action === 'promote-user') mnxAdminSetUserRole(btn.dataset.uid, 'admin');
    if (btn.dataset.action === 'demote-user') mnxAdminSetUserRole(btn.dataset.uid, 'user');
  });

  // Confirm-delete banner
  document.getElementById('admin-confirm-cancel')?.addEventListener('click', mnxAdminCancelDelete);
  document.getElementById('admin-confirm-ok')?.addEventListener('click', mnxAdminExecuteConfirmedDelete);
}

function mnxAdminAbsoluteUploadUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  if (!relativeUrl.startsWith('/uploads/')) return relativeUrl;
  const apiOrigin = window.MNX_API.baseUrl.replace(/\/api\/?$/, '');
  return `${apiOrigin}${relativeUrl}`;
}

let mnxAdminInitialized = false;

async function mnxAdminBoot() {
  const hasAccess = await mnxAdminCheckAccess();
  if (!hasAccess) return;
  if (!mnxAdminInitialized) {
    mnxAdminInitialized = true;
    mnxAdminInitNav();
    mnxAdminInitEvents();
  }
  mnxAdminSwitchView('dashboard');
}

document.addEventListener('includes:loaded', mnxAdminBoot);

document.addEventListener('auth:changed', mnxAdminBoot);
