function initBurgerMenu() {
  const burger = document.getElementById('navbar-burger');
  const mobile = document.getElementById('navbar-mobile');
  if (!burger || !mobile) return;

  burger.addEventListener('click', () => {
    const isOpen = mobile.classList.toggle('is-open');
    burger.classList.toggle('is-active', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
  });
}

function initLangSwitch() {
  const btn = document.getElementById('lang-switch');
  if (!btn) return;

  if (window.MNX_I18N) {
    window.MNX_I18N.setLang(window.MNX_I18N.getLang());
  }
}

function initAuthState() {
  console.log('[navbar] initAuthState called');
  const container = document.getElementById('navbar-auth');
  const menu = document.getElementById('account-menu');
  const mobileContainer = document.querySelector('.navbar__mobile-auth');
  
  if (!container || !window.MNX_AUTH) {
    console.log('[navbar] Missing container or MNX_AUTH', { hasContainer: !!container, hasAuth: !!window.MNX_AUTH });
    return;
  }

  const session = window.MNX_AUTH.getSession();
  console.log('[navbar] Current session:', session);
  
  if (!session) {
    const loginHtml = `
      <button class="btn btn-outline btn-sm" data-auth-open="login" data-i18n="nav.login">เข้าสู่ระบบ</button>
      <button class="btn btn-gold btn-sm" data-auth-open="register" data-i18n="nav.register">สมัครสมาชิก</button>
    `;
    container.innerHTML = loginHtml;
    if (mobileContainer) mobileContainer.innerHTML = loginHtml;
    if (menu) menu.innerHTML = '';
    return;
  }

  const adminLinkHtml = session.role === 'admin'
    ? `<a href="/Fronend/pages/admin.html" class="account-menu__admin-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14.7 6.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L3 12v3h3l8.7-8.7Z"/><path d="M13 5l3 3"/><path d="M3 21h18"/></svg> Admin Panel</a>`
    : '';

  const avatarUrl = window.MNX_AUTH.getAvatarUrl ? window.MNX_AUTH.getAvatarUrl(session.avatar) : (session.avatar || '/Fronend/assets/images/avatar-placeholder.png');
  const profileHtml = `
    <button class="navbar__profile-chip" id="account-menu-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="account-menu">
      <img src="${avatarUrl}" alt="${session.name}" />
      <span>${session.name}</span>
    </button>
  `;
  container.innerHTML = profileHtml;
  if (mobileContainer) mobileContainer.innerHTML = profileHtml;
  console.log('[navbar] Updated UI with profile chip');

  if (menu) {
    menu.innerHTML = `
      <div class="account-menu__head">
        <img src="${avatarUrl}" alt="${session.name}" />
        <div>
          <div class="account-menu__name">${session.name}</div>
          <div class="account-menu__provider">${session.provider === 'google' ? 'เข้าสู่ระบบด้วย Google' : 'สมาชิกทั่วไป'}</div>
        </div>
      </div>

      <div class="account-menu__links">
        <a href="/Fronend/pages/profile.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg> โปรไฟล์ของฉัน</a>
        <a href="/Fronend/pages/review.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M5 4h11l3 3v13H5V4Z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg> บันทึกส่วนตัว</a>
        ${adminLinkHtml}
        <button type="button" id="account-menu-signout" class="account-menu__signout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l4-5-4-5"/><path d="M20 12H9"/></svg> ออกจากระบบ</button>
      </div>
    `;
  }

  initAccountMenu();
}

function initAccountMenu() {
  const trigger = document.getElementById('account-menu-trigger');
  const menu = document.getElementById('account-menu');
  if (!trigger || !menu) return;

  const close = () => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    trigger.classList.remove('is-active');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    trigger.classList.add('is-active');
    trigger.setAttribute('aria-expanded', 'true');
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.contains('is-open') ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#account-menu') && !e.target.closest('#account-menu-trigger')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

  document.getElementById('account-menu-signout')?.addEventListener('click', async () => {
    await window.MNX_AUTH?.signOut();
    close();
  });
}

function initLifestyleMenu() {
  const trigger = document.getElementById('lifestyle-menu-trigger');
  const menu = document.getElementById('lifestyle-menu');
  if (!trigger || !menu) return;

  const close = () => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    trigger.classList.remove('is-active');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    trigger.classList.add('is-active');
    trigger.setAttribute('aria-expanded', 'true');
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.contains('is-open') ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#lifestyle-menu') && !e.target.closest('#lifestyle-menu-trigger')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
}

function initCheckinMenu() {
  const trigger = document.getElementById('checkin-menu-trigger');
  const menu = document.getElementById('checkin-menu');
  if (!trigger || !menu) return;

  const close = () => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    trigger.classList.remove('is-active');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    trigger.classList.add('is-active');
    trigger.setAttribute('aria-expanded', 'true');
    document.getElementById('checkin-menu-search-input')?.focus();
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.contains('is-open') ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#checkin-menu') && !e.target.closest('#checkin-menu-trigger')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  menu.querySelectorAll('.checkin-menu__link').forEach((a) => a.addEventListener('click', close));
}

function mnxSearchPlaces(query) {
  const q = query.trim().toLowerCase();
  if (!q || !window.MNX_PLACES) return [];
  return window.MNX_PLACES
    .filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q))
    .slice(0, 8);
}

function mnxGoToPlace(placeId) {
  window.location.href = `/Fronend/pages/attractions.html?place=${encodeURIComponent(placeId)}`;
}

function mnxRenderSearchResults(resultsEl, query) {
  const results = mnxSearchPlaces(query);
  if (!query.trim()) {
    resultsEl.innerHTML = '';
    resultsEl.classList.remove('is-open');
    return;
  }
  resultsEl.classList.add('is-open');
  resultsEl.innerHTML = results.length
    ? results.map((p) => `
        <button type="button" class="navbar__search-result" data-place-id="${p.id}">
          <img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0" />
          <span>
            <strong>${p.name}</strong>
            <small>${mnxPinIcon(11)} ${p.area}</small>
          </span>
        </button>
      `).join('')
    : `<p class="navbar__search-empty">ไม่พบสถานที่ที่ตรงกับ "${query.trim()}"</p>`;

  resultsEl.querySelectorAll('.navbar__search-result').forEach((btn) => {
    btn.addEventListener('click', () => mnxGoToPlace(btn.dataset.placeId));
  });
}

function initCheckinSearch(inputId, resultsId, formId) {
  const input = document.getElementById(inputId);
  const resultsEl = document.getElementById(resultsId);
  const form = document.getElementById(formId);
  if (!input || !resultsEl) return;

  input.addEventListener('input', () => mnxRenderSearchResults(resultsEl, input.value));
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const first = mnxSearchPlaces(input.value)[0];
    if (first) mnxGoToPlace(first.id);
  });
}

document.addEventListener('includes:loaded', () => {
  initBurgerMenu();
  initLangSwitch();
  initAuthState();
  initLifestyleMenu();
  initCheckinMenu();
  initCheckinSearch('checkin-menu-search-input', 'checkin-menu-search-results', 'checkin-menu-search-form');
  initCheckinSearch('checkin-menu-search-input-mobile', 'checkin-menu-search-results-mobile', 'checkin-menu-search-form-mobile');
});

document.addEventListener('auth:changed', initAuthState);
