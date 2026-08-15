const INTEREST_LABELS = {
  cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร', temple: 'วัด/ศักดิ์สิทธิ์',
  nature: 'ธรรมชาติ', fitness: 'ออกกำลังกาย', culture: 'วัฒนธรรม', landmark: 'แลนด์มาร์ก',
};
const ENV_LABELS = { indoor: 'ในร่ม', outdoor: 'กลางแจ้ง', both: 'ทั้งสองแบบ' };
const PACE_LABELS = { comfort: 'สายชิล ผ่อนคลาย', adventure: 'สายผจญภัย', both: 'ทั้งสองแบบ' };

function mnxProfileAbsoluteUrl(relativeUrl) {
  if (window.MNX_AUTH?.getAvatarUrl) return window.MNX_AUTH.getAvatarUrl(relativeUrl);
  if (!relativeUrl) return '/Fronend/assets/images/avatar-placeholder.png';
  if (/^https?:\/\//.test(relativeUrl) || relativeUrl.startsWith('data:')) return relativeUrl;
  if (relativeUrl.startsWith('/uploads/')) {
    const apiOrigin = (window.MNX_API?.baseUrl || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
    return `${apiOrigin}${relativeUrl}`;
  }
  if (relativeUrl.startsWith('/assets/')) {
    return `/Fronend${relativeUrl}`;
  }
  return relativeUrl;
}


function mnxProfileTimeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'วันนี้';
  if (days < 30) return `${days} วันที่แล้ว`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือนที่แล้ว`;
  return `${Math.floor(months / 12)} ปีที่แล้ว`;
}

function mnxProfileMemberSince(isoStr) {
  if (!isoStr) return '–';
  const d = new Date(isoStr);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
}

/* ----------------------------------------------------------
   Access gate
---------------------------------------------------------- */
function mnxProfileCheckAccess() {
  const gate = document.getElementById('profile-gate');
  const shell = document.getElementById('profile-shell');
  const session = window.MNX_AUTH?.getSession();
  if (!session) {
    gate.style.display = 'flex';
    shell.style.display = 'none';
    return false;
  }
  gate.style.display = 'none';
  shell.style.display = 'block';
  return true;
}

/* ----------------------------------------------------------
   Render all profile sections from the current session
---------------------------------------------------------- */
async function mnxRenderProfile() {
  if (!mnxProfileCheckAccess()) return;
  const session = window.MNX_AUTH.getSession();

  // Avatar
  const avatarImg = document.getElementById('profile-avatar-img');
  if (avatarImg) avatarImg.src = mnxProfileAbsoluteUrl(session.avatar);

  // Name
  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = session.name;

  // Meta (email, age, provider)
  const metaEl = document.getElementById('profile-meta');
  if (metaEl) {
    const age = session.profile?.birthdate ? window.MNX_AUTH.calcAge(session.profile.birthdate) : null;
    const iconMail = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>';
    const iconCake = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M4 21h16M8 12V8M12 12V8M16 12V8M12 3v3"/></svg>';
    const iconLink = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M9.5 14.5l5-5"/><path d="M12 6l1.5-1.5a3.5 3.5 0 1 1 5 5L17 11"/><path d="M12 18l-1.5 1.5a3.5 3.5 0 1 1-5-5L7 13"/></svg>';
    const iconCalendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>';
    const parts = [
      `${iconMail} ${session.email}`,
      age != null ? `${iconCake} ${age} ปี` : null,
      session.provider === 'google' ? `${iconLink} Google` : `${iconLink} Email`,
      `${iconCalendar} สมาชิกตั้งแต่ ${mnxProfileMemberSince(session.joinedAt)}`,
    ].filter(Boolean);
    metaEl.innerHTML = parts.map((p) => `<span class="profile-header__meta-item">${p}</span>`).join('');
  }

  // AI Persona
  const personaEl = document.getElementById('profile-persona');
  if (personaEl && session.aiProfile?.travelPersona) {
    personaEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M12 3c.6 3 1.4 5.6 3 7 1.4 1.4 4 2.2 7 3-3 .8-5.6 1.6-7 3-1.6 1.4-2.4 4-3 7-.6-3-1.4-5.6-3-7-1.4-1.4-4-2.2-7-3 3-.8 5.6-1.6 7-3 1.6-1.4 2.4-4 3-7Z"/></svg> ${session.aiProfile.travelPersona}`;
    personaEl.style.display = 'inline-flex';
  }

  // Member since (stat) — show join date (month + year), not duration
  const joinedEl = document.getElementById('stat-joined');
  if (joinedEl && session.joinedAt) {
    const joinDate = new Date(session.joinedAt);
    const lang = window.MNX_I18N?.getLang?.() || 'TH';
    if (lang === 'EN') {
      joinedEl.textContent = joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      // Thai Buddhist calendar year
      joinedEl.textContent = joinDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    }
  }

  // Load stats + content in parallel
  await Promise.all([
    mnxLoadProfileStats(session),
    mnxRenderPrefsView(session),
    mnxRenderRecentReviews(session),
    mnxRenderRecentCheckins(session),
  ]);

  document.dispatchEvent(new CustomEvent('app:content-updated'));
}

async function mnxLoadProfileStats(session) {
  try {
    // Reviews count — pull the video review feed (reviews with video are the most visible
    // content. Text-only reviews per-place would require fetching every place individually).
    const videoFeed = await window.MNX_API.get('/reviews/videos').catch(() => ({ videos: [] }));
    const myReviewCount = (videoFeed.videos || []).filter((v) => v.uid === session.uid).length;
    const myReviewEl = document.getElementById('stat-reviews');
    if (myReviewEl) myReviewEl.textContent = myReviewCount || '0';

    // Favorites
    await window.MNX_FAVORITES?.load();
    const favIds = window.MNX_FAVORITES?.getIds?.() || [];
    const myFavsEl = document.getElementById('stat-favorites');
    if (myFavsEl) myFavsEl.textContent = favIds.length;

    // Check-ins
    const feed = await window.MNX_CHECKIN.fetchFeed().catch(() => []);
    const myCheckins = feed.filter((p) => p.uid === session.uid);
    const myCheckinsEl = document.getElementById('stat-checkins');
    if (myCheckinsEl) myCheckinsEl.textContent = myCheckins.length;
  } catch (_) { }
}

/* ----------------------------------------------------------
   Travel preferences view
---------------------------------------------------------- */
async function mnxRenderPrefsView(session) {
  const profile = session.profile || {};

  const interestsEl = document.getElementById('pref-interests-view');
  if (interestsEl) {
    const chips = (profile.interests || []).map((i) => INTEREST_LABELS[i]).filter(Boolean);
    interestsEl.innerHTML = chips.length
      ? chips.map((c) => `<span class="profile-prefs__chip">${c}</span>`).join('')
      : '<span style="font-size:0.82rem;color:var(--color-text-muted);">ยังไม่ได้ระบุ</span>';
  }

  const envEl = document.getElementById('pref-env-view');
  if (envEl) envEl.textContent = ENV_LABELS[profile.envPref] || '–';

  const paceEl = document.getElementById('pref-pace-view');
  if (paceEl) paceEl.textContent = PACE_LABELS[profile.pacePref] || '–';
}

/* ----------------------------------------------------------
   Travel preferences edit mode
---------------------------------------------------------- */
function mnxInitPrefsEdit() {
  const editBtn = document.getElementById('profile-prefs-edit-btn');
  const cancelBtn = document.getElementById('profile-prefs-cancel-btn');
  const saveBtn = document.getElementById('profile-prefs-save-btn');
  const viewEl = document.getElementById('profile-prefs-view');
  const editEl = document.getElementById('profile-prefs-edit');
  const statusEl = document.getElementById('profile-prefs-status');

  const openEdit = () => {
    const session = window.MNX_AUTH.getSession();
    const profile = session.profile || {};
    // Pre-fill interest chips
    document.querySelectorAll('#pref-interests-edit button').forEach((btn) => {
      btn.classList.toggle('is-active', (profile.interests || []).includes(btn.dataset.interest));
    });
    // Pre-fill env
    document.querySelectorAll('#pref-env-edit button').forEach((btn) => {
      btn.classList.toggle('is-active', (profile.envPref || 'both') === btn.dataset.env);
    });
    // Pre-fill pace
    document.querySelectorAll('#pref-pace-edit button').forEach((btn) => {
      btn.classList.toggle('is-active', (profile.pacePref || 'both') === btn.dataset.pace);
    });
    viewEl.style.display = 'none';
    editEl.style.display = 'flex';
    if (statusEl) statusEl.textContent = '';
  };

  editBtn?.addEventListener('click', openEdit);
  cancelBtn?.addEventListener('click', () => {
    viewEl.style.display = '';
    editEl.style.display = 'none';
  });

  // Interest chip toggles
  document.querySelectorAll('#pref-interests-edit button').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('is-active'));
  });
  // Env/pace single-select
  document.querySelectorAll('#pref-env-edit button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pref-env-edit button').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });
  document.querySelectorAll('#pref-pace-edit button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pref-pace-edit button').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });

  saveBtn?.addEventListener('click', async () => {
    saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'กำลังบันทึก...';
    try {
      const interests = [...document.querySelectorAll('#pref-interests-edit button.is-active')].map((b) => b.dataset.interest);
      const envPref = document.querySelector('#pref-env-edit button.is-active')?.dataset.env || 'both';
      const pacePref = document.querySelector('#pref-pace-edit button.is-active')?.dataset.pace || 'both';

      await window.MNX_AUTH.updateProfile({ profile: { interests, envPref, pacePref } });
      if (statusEl) statusEl.textContent = '✓ บันทึกแล้ว';

      const session = window.MNX_AUTH.getSession();
      await mnxRenderPrefsView(session);
      viewEl.style.display = '';
      editEl.style.display = 'none';
    } catch (err) {
      if (statusEl) { statusEl.textContent = err.message || 'บันทึกไม่สำเร็จ'; statusEl.style.color = '#c9392f'; }
    } finally {
      saveBtn.disabled = false;
    }
  });
}

/* ----------------------------------------------------------
   Name edit
---------------------------------------------------------- */
function mnxInitNameEdit() {
  const editBtn = document.getElementById('profile-edit-name-btn');
  const cancelBtn = document.getElementById('profile-name-cancel-btn');
  const saveBtn = document.getElementById('profile-name-save-btn');
  const editWrap = document.getElementById('profile-name-edit');
  const nameInput = document.getElementById('profile-name-input');
  const statusEl = document.getElementById('profile-name-status');

  editBtn?.addEventListener('click', () => {
    const session = window.MNX_AUTH.getSession();
    if (nameInput) nameInput.value = session.name;
    editWrap.style.display = 'flex';
    nameInput?.focus();
  });

  cancelBtn?.addEventListener('click', () => {
    editWrap.style.display = 'none';
  });

  saveBtn?.addEventListener('click', async () => {
    const newName = nameInput?.value.trim();
    if (!newName) return;
    saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'กำลังบันทึก...';
    try {
      await window.MNX_AUTH.updateProfile({ name: newName });
      document.getElementById('profile-name').textContent = newName;
      editWrap.style.display = 'none';
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || 'บันทึกไม่สำเร็จ';
    } finally {
      saveBtn.disabled = false;
    }
  });
}

/* ----------------------------------------------------------
   Avatar upload & save
---------------------------------------------------------- */
let mnxAvatarToastTimer = null;
function mnxShowAvatarToast(message, isError = false) {
  const toast = document.getElementById('profile-avatar-toast');
  if (!toast) return;
  if (mnxAvatarToastTimer) clearTimeout(mnxAvatarToastTimer);

  toast.textContent = message;
  toast.className = `profile-avatar-toast is-visible ${isError ? 'is-error' : 'is-success'}`;
  toast.style.display = 'inline-flex';

  mnxAvatarToastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => {
      if (!toast.classList.contains('is-visible')) toast.style.display = 'none';
    }, 300);
  }, 3500);
}

function mnxInitAvatarEdit() {
  const editBtn = document.getElementById('profile-avatar-edit-btn');
  const input = document.getElementById('profile-avatar-input');
  const img = document.getElementById('profile-avatar-img');
  const spinner = document.getElementById('profile-avatar-spinner');
  if (!editBtn || !input || !img) return;

  editBtn.addEventListener('click', () => {
    if (editBtn.disabled) return;
    input.click();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      mnxShowAvatarToast('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPEG, PNG, WebP)', true);
      input.value = '';
      return;
    }

    const previousSrc = img.src;
    // Set UI to loading state
    if (spinner) spinner.style.display = 'flex';
    editBtn.disabled = true;
    editBtn.style.opacity = '0.5';
    editBtn.style.pointerEvents = 'none';

    try {
      mnxShowAvatarToast('กำลังบันทึกรูปโปรไฟล์...');
      const user = await window.MNX_AUTH.updateAvatar(file);
      if (user && user.avatar) {
        img.src = mnxProfileAbsoluteUrl(user.avatar);
      }
      mnxShowAvatarToast('✓ บันทึกรูปโปรไฟล์เรียบร้อยแล้ว');
    } catch (err) {
      img.src = previousSrc;
      mnxShowAvatarToast(err.message || 'ไม่สามารถบันทึกรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง', true);
    } finally {
      if (spinner) spinner.style.display = 'none';
      editBtn.disabled = false;
      editBtn.style.opacity = '';
      editBtn.style.pointerEvents = '';
      input.value = '';
    }
  });
}


/* ----------------------------------------------------------
   Recent reviews
---------------------------------------------------------- */
async function mnxRenderRecentReviews(session) {
  const list = document.getElementById('profile-reviews-list');
  if (!list) return;

  try {
    const feed = await window.MNX_API.get('/reviews/videos').catch(() => ({ videos: [] }));
    const myVideos = (feed.videos || []).filter((v) => v.uid === session.uid).slice(0, 5);

    if (!myVideos.length) {
      list.innerHTML = `<p class="profile-empty">ยังไม่มีรีวิววิดีโอ <a href="/Fronend/pages/attractions.html" style="color:var(--color-gold-dark)">ไปรีวิวสถานที่กัน →</a></p>`;
      return;
    }

    const place = (id) => window.mnxGetPlace?.(id);
    list.innerHTML = myVideos.map((v) => {
      const p = place(v.placeId);
      const thumb = v.video?.posterUrl
        ? `<img class="profile-review-card__thumb" src="${mnxProfileAbsoluteUrl(v.video.posterUrl)}" alt="${p?.name || v.placeId}" />`
        : `<div class="profile-review-card__thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.6rem;"></div>`;
      return `
        <div class="profile-review-card" data-place-open="${v.placeId}">
          ${thumb}
          <div class="profile-review-card__body">
            <div class="profile-review-card__place">${p?.name || v.placeId}</div>
            <div class="profile-review-card__stars">${'★'.repeat(v.rating)}${'☆'.repeat(5 - v.rating)}</div>
            <p class="profile-review-card__text">${v.text}</p>
            <span class="profile-review-card__video-badge">วิดีโอรีวิว · ${v.likeCount || 0} · ${v.commentCount || 0}</span>
            <div class="profile-review-card__date">${mnxProfileTimeAgo(v.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (_) {
    list.innerHTML = `<p class="profile-empty">ไม่สามารถโหลดข้อมูลได้</p>`;
  }
}

/* ----------------------------------------------------------
   Recent check-ins
---------------------------------------------------------- */
async function mnxRenderRecentCheckins(session) {
  const grid = document.getElementById('profile-checkins-grid');
  if (!grid) return;

  try {
    const feed = await window.MNX_CHECKIN.fetchFeed().catch(() => []);
    const mine = feed.filter((p) => p.uid === session.uid).slice(0, 12);

    if (!mine.length) {
      grid.innerHTML = `<p class="profile-empty" style="grid-column:1/-1;">ยังไม่มีเช็คอิน <a href="/Fronend/pages/review.html" style="color:var(--color-gold-dark)">เริ่มเช็คอินเลย →</a></p>`;
      return;
    }

    grid.innerHTML = mine.map((p) => {
      const mainPhoto = p.photos?.[0] ? mnxProfileAbsoluteUrl(p.photos[0]) : (p.video?.posterUrl ? mnxProfileAbsoluteUrl(p.video.posterUrl) : null);
      const isVideoOnly = !p.photos?.length && p.video?.url;
      const videoSrc = p.video?.url ? mnxProfileAbsoluteUrl(p.video.url) : '';

      return `
        <div class="profile-checkin-card">
          ${mainPhoto ? `<img src="${mainPhoto}" alt="${p.place}" loading="lazy" />` : (videoSrc ? `<video src="${videoSrc}" playsinline muted preload="metadata"></video>` : '')}
          <div class="profile-checkin-card__overlay">
            <div class="profile-checkin-card__place">${p.place}</div>
          </div>
          ${p.video ? '<span class="profile-checkin-card__privacy" style="right:8px; left:auto; background:rgba(0,0,0,0.65); color:var(--color-gold);">🎬 วิดีโอ</span>' : ''}
          ${p.visibility === 'private' ? '<span class="profile-checkin-card__privacy">ส่วนตัว</span>' : ''}
        </div>
      `;
    }).filter(Boolean).join('');
  } catch (_) {
    grid.innerHTML = `<p class="profile-empty" style="grid-column:1/-1;">ไม่สามารถโหลดข้อมูลได้</p>`;
  }
}

/* ----------------------------------------------------------
   Sign-out
---------------------------------------------------------- */
function mnxInitSignOut() {
  document.getElementById('profile-signout-btn')?.addEventListener('click', async () => {
    if (!confirm('ต้องการออกจากระบบหรือไม่?')) return;
    await window.MNX_AUTH?.signOut();
    window.location.href = '/Fronend/index.html';
  });
}

/* ----------------------------------------------------------
   Favorites count (from favorites-data.js)
---------------------------------------------------------- */
async function mnxLoadFavCount() {
  try {
    await window.MNX_FAVORITES?.load();
    const ids = window.MNX_FAVORITES?.getIds ? window.MNX_FAVORITES.getIds() : [];
    const el = document.getElementById('stat-favorites');
    if (el) el.textContent = ids.length;
  } catch (_) { }
}

/* ----------------------------------------------------------
   Boot
---------------------------------------------------------- */
document.addEventListener('includes:loaded', async () => {
  if (!mnxProfileCheckAccess()) return;

  mnxInitAvatarEdit();
  mnxInitNameEdit();
  mnxInitPrefsEdit();
  mnxInitSignOut();

  await mnxRenderProfile();
  await mnxLoadFavCount();
});

document.addEventListener('auth:changed', async () => {
  if (!mnxProfileCheckAccess()) return;
  await mnxRenderProfile();
});
