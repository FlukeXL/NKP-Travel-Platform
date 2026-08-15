(function () {
  function isMobile() {
    return document.documentElement.classList.contains('mnx-is-mobile');
  }

  const overlay = () => document.getElementById('mnx-m-overlay');
  const envSheet = () => document.getElementById('mnx-m-env-sheet');

  function showOverlay() {
    const ov = overlay();
    if (!ov) return;
    ov.classList.add('is-visible');
    ov.addEventListener('click', closeAllDropdowns, { once: true });
    document.body.style.overflow = 'hidden';
  }

  function hideOverlay() {
    overlay()?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  function markActiveTab() {
    const filename = (window.location.pathname.split('/').pop() || 'index.html');
    const lifestylePages = ['lifestyle-all.html', 'cafe.html', 'food.html', 'mutelu.html', 'shopping.html', 'culture.html', 'nature.html'];
    const checkinPages = ['review.html', 'videos.html'];
    let tab = null;
    if (filename === 'index.html' || filename === '') tab = 'home';
    else if (filename === 'attractions.html') tab = 'attractions';
    else if (lifestylePages.includes(filename)) tab = 'lifestyle';
    else if (filename === 'weather.html') tab = 'weather';
    else if (checkinPages.includes(filename)) tab = 'checkin';

    document.querySelectorAll('.mnx-m-tabbar__btn[data-tab]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
  }

  function initHeaderReveal() {
    const header = document.getElementById('mnx-m-header');
    const tabbar = document.getElementById('mnx-m-tabbar');
    if (!header && !tabbar) return;

    let cachedRevealAt = window.innerHeight;
    let ticking = false;

    const updateRevealAt = () => {
      const hero = document.querySelector('.hero');
      const pageHero = document.querySelector('.page-hero');
      if (hero) {
        cachedRevealAt = hero.offsetTop + hero.offsetHeight - 60;
      } else if (pageHero) {
        cachedRevealAt = pageHero.offsetTop + pageHero.offsetHeight - 60;
      } else {
        cachedRevealAt = Math.min(window.innerHeight * 0.4, 250);
      }
    };

    const updateMobileHeader = () => {
      const scrolled = window.scrollY >= cachedRevealAt;
      header?.classList.toggle('mnx-m-header--visible', scrolled);
      tabbar?.classList.toggle('mnx-m-tabbar--visible', scrolled);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateMobileHeader);
        ticking = true;
      }
    };

    updateRevealAt();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      updateRevealAt();
      onScroll();
    }, { passive: true });
    onScroll();
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.mnx-m-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.mnx-m-tabbar__btn.is-dropdown-active, .mnx-m-infobar__pill.is-dropdown-active').forEach((b) => {
      b.classList.remove('is-dropdown-active');
      b.setAttribute('aria-expanded', 'false');
    });
    hideOverlay();
  }

  function anchorDropdownToTrigger(trigger, dropdown, maxWidth) {
    const triggerRect = trigger.getBoundingClientRect();
    const dropdownWidth = Math.min(maxWidth, window.innerWidth - 28);
    const margin = 14;
    const idealLeft = triggerRect.left + triggerRect.width / 2;
    const clampedLeft = Math.max(margin + dropdownWidth / 2, Math.min(window.innerWidth - margin - dropdownWidth / 2, idealLeft));
    dropdown.style.setProperty('--mnx-m-dd-left', `${clampedLeft}px`);
  }

  function openDropdown(trigger, dropdown, maxWidth, onOpen) {
    const wasOpen = dropdown.classList.contains('is-open');
    closeAllDropdowns();
    if (wasOpen) return;
    anchorDropdownToTrigger(trigger, dropdown, maxWidth);
    dropdown.classList.add('is-open');
    dropdown.setAttribute('aria-hidden', 'false');
    trigger.classList.add('is-dropdown-active');
    trigger.setAttribute('aria-expanded', 'true');
    showOverlay();
    onOpen?.();
  }

  function initHeaderDropdown(triggerId, dropdownId, onOpen) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openDropdown(trigger, dropdown, 268, onOpen);
    });

    dropdown.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
          setTimeout(closeAllDropdowns, 150);
        } else {
          closeAllDropdowns();
        }
      });
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mnx-m-dropdown') && !e.target.closest('.mnx-m-tabbar__btn') && !e.target.closest('.mnx-m-infobar__pill')) {
      closeAllDropdowns();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDropdowns();
  });

  function initSwipeToClose(dropdownEl) {
    if (!dropdownEl) return;
    let startY = 0;
    dropdownEl.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    dropdownEl.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      const isTopAnchored = dropdownEl.classList.contains('mnx-m-dropdown--from-header');
      if ((isTopAnchored && dy < -70) || (!isTopAnchored && dy > 70)) closeAllDropdowns();
    }, { passive: true });
  }

  let mnxMChart = null;
  let mnxMActiveMetric = 'pm25';

  const METRIC_LABEL = { pm25: 'PM2.5', weather: 'สภาพอากาศ', mekong: 'ระดับแม่น้ำโขง', traffic: 'สภาพการจราจร' };

  function metricSeries(metric) {
    const env = window.MNX_ENV;
    if (!env) return null;
    switch (metric) {
      case 'pm25':
        return { value: env.pm25.provinceValue, unit: env.pm25.unit, history: env.pm25.history, percent: env.pm25.percent, color: env.resolveBand(env.pm25.percent).color, status: `คุณภาพอากาศ: ${env.resolveBand(env.pm25.percent).label}` };
      case 'weather':
        return { value: env.weather.temp, unit: '°C', history: env.weather.history, percent: env.weather.percent, color: env.resolveBand(env.weather.percent).color, status: env.weather.desc || '' };
      case 'mekong':
        return { value: env.mekong.level, unit: env.mekong.unit, history: env.mekong.history, percent: env.mekong.percent, color: env.resolveBand(env.mekong.percent, env.bands.mekong).color, status: env.mekong.trend || '' };
      case 'traffic':
        return { value: env.traffic.level, unit: '', history: [], percent: null, color: '#c9a227', status: env.traffic.desc || '' };
      default:
        return null;
    }
  }

  function renderHeaderChip() {
    const env = window.MNX_ENV;
    if (!env) return;

    const dotEl = document.getElementById('mnx-m-env-dot');
    if (dotEl) {
      const pct = env.pm25.percent ?? 0;
      dotEl.classList.remove('mnx-m-dot--moderate', 'mnx-m-dot--bad');
      if (pct > 75) dotEl.classList.add('mnx-m-dot--bad');
      else if (pct > 50) dotEl.classList.add('mnx-m-dot--moderate');
    }

    const setField = (name, html) => {
      const el = document.querySelector(`[data-field="${name}"]`);
      if (el) el.innerHTML = html;
    };
    setField('mnx-m-pm25-value', `${env.pm25.provinceValue ?? '--'}`);
    setField('mnx-m-weather-value', `${env.weather.temp ?? '--'}°`);
    setField('mnx-m-mekong-value', `${env.mekong.level ?? '--'}`);
    setField('mnx-m-traffic-value', `${env.traffic.level || '--'}`);
  }

  function renderEnvSheet(metric) {
    const series = metricSeries(metric);
    const valueEl = document.getElementById('mnx-m-env-body-value');
    const unitEl = document.getElementById('mnx-m-env-body-unit');
    const statusEl = document.getElementById('mnx-m-env-body-status');
    if (!series) return;

    valueEl.textContent = series.value ?? '--';
    unitEl.textContent = series.unit || '';
    statusEl.textContent = series.status || '';

    const canvas = document.getElementById('mnx-m-env-chart');
    if (mnxMChart) {
      mnxMChart.destroy();
      mnxMChart = null;
    }
    if (!canvas || typeof Chart === 'undefined') return;
    canvas.style.display = series.history?.length ? '' : 'none';
    if (!series.history?.length) return;

    const labels = series.history.map((h) => h.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
    const values = series.history.map((h) => h.value);

    mnxMChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: series.color,
          backgroundColor: series.color + '33',
          pointBackgroundColor: series.color,
          pointRadius: 3,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } } },
        },
      },
    });
  }

  function initEnvChip() {
    const sheet = envSheet();
    if (!sheet) return;
    document.querySelectorAll('.mnx-m-infobar__pill[data-metric]').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        mnxMActiveMetric = pill.dataset.metric;
        sheet.querySelectorAll('.mnx-m-env-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.metric === mnxMActiveMetric));
        renderEnvSheet(mnxMActiveMetric);
        openDropdown(pill, sheet, 300);
      });
    });

    sheet.querySelectorAll('.mnx-m-env-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        mnxMActiveMetric = tab.dataset.metric;
        sheet.querySelectorAll('.mnx-m-env-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
        renderEnvSheet(mnxMActiveMetric);
      });
    });

    document.getElementById('mnx-m-env-download')?.addEventListener('click', () => {
      const series = metricSeries(mnxMActiveMetric);
      if (!series?.history?.length) {
        alert('ยังไม่มีข้อมูลย้อนหลังให้ดาวน์โหลดสำหรับตัวชี้วัดนี้');
        return;
      }
      const filenames = { pm25: 'PM25_นครพนม', weather: 'สภาพอากาศ_นครพนม', mekong: 'ระดับแม่น้ำโขง_นครพนม' };
      window.mnxExportHistoryToExcel?.(filenames[mnxMActiveMetric] || mnxMActiveMetric, METRIC_LABEL[mnxMActiveMetric], series.history, series.unit);
    });
  }

  function renderSearchResults(container, query) {
    const q = query.trim().toLowerCase();
    if (!q || !window.MNX_PLACES) {
      container.innerHTML = '';
      container.classList.remove('is-open');
      return;
    }
    const hits = window.MNX_PLACES
      .filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q))
      .slice(0, 8);

    container.classList.add('is-open');
    const pinIcon = '<svg class="mnx-m-search-result__pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10Z"/><circle cx="12" cy="11" r="1.8"/></svg>';
    container.innerHTML = hits.length
      ? hits.map((p) => `
          <button type="button" class="mnx-m-search-result" data-place-id="${p.id}">
            <img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0" />
            <span><strong>${p.name}</strong><small>${pinIcon}${p.area}</small></span>
          </button>
        `).join('')
      : `<p class="mnx-m-search-empty">ไม่พบสถานที่ "${query.trim()}"</p>`;

    container.querySelectorAll('.mnx-m-search-result').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeAllDropdowns();
        window.location.href = `/Fronend/pages/attractions.html?place=${encodeURIComponent(btn.dataset.placeId)}`;
      });
    });
  }

  function initCheckinSearch() {
    const input = document.getElementById('mnx-m-checkin-search-input');
    const results = document.getElementById('mnx-m-checkin-search-results');
    const form = document.getElementById('mnx-m-checkin-search-form');
    if (!input || !results) return;

    input.addEventListener('input', () => renderSearchResults(results, input.value));
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim().toLowerCase();
      const first = (window.MNX_PLACES || []).find((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
      if (first) {
        closeAllDropdowns();
        window.location.href = `/Fronend/pages/attractions.html?place=${encodeURIComponent(first.id)}`;
      }
    });
  }

  function renderCheckinAccount() {
    const container = document.getElementById('mnx-m-checkin-account');
    if (!container || !window.MNX_AUTH) return;
    const session = window.MNX_AUTH.getSession();

    if (!session) {
      container.innerHTML = `
        <div class="mnx-m-menu-auth-row">
          <button class="btn btn-outline btn-sm" data-auth-open="login">เข้าสู่ระบบ</button>
          <button class="btn btn-gold btn-sm" data-auth-open="register">สมัครสมาชิก</button>
        </div>
      `;
      return;
    }

    const adminLink = session.role === 'admin'
      ? `<a href="/Fronend/pages/admin.html" class="mnx-m-menu-item"><span class="mnx-m-menu-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L3 12v3h3l8.7-8.7Z"/><path d="M13 5l3 3"/><path d="M3 21h18"/></svg></span>Admin Panel</a>`
      : '';

    const avatarUrl = window.MNX_AUTH.getAvatarUrl ? window.MNX_AUTH.getAvatarUrl(session.avatar) : (session.avatar || '/Fronend/assets/images/avatar-placeholder.png');

    container.innerHTML = `
      <div class="mnx-m-menu-account-head">
        <img src="${avatarUrl}" alt="${session.name}" />
        <div>
          <div class="mnx-m-menu-account-name">${session.name}</div>
          <div class="mnx-m-menu-account-email">${session.email || ''}</div>
        </div>
      </div>

      <a href="/Fronend/pages/profile.html" class="mnx-m-menu-item"><span class="mnx-m-menu-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg></span>โปรไฟล์ของฉัน</a>
      <a href="/Fronend/pages/review.html" class="mnx-m-menu-item"><span class="mnx-m-menu-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5V4Z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg></span>บันทึกส่วนตัว</a>
      ${adminLink}
      <button type="button" class="mnx-m-menu-item mnx-m-menu-item--danger" id="mnx-m-checkin-signout">
        <span class="mnx-m-menu-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l4-5-4-5"/><path d="M20 12H9"/></svg></span>ออกจากระบบ
      </button>
    `;

    document.getElementById('mnx-m-checkin-signout')?.addEventListener('click', async () => {
      await window.MNX_AUTH?.signOut();
      closeAllDropdowns();
      window.location.href = '/Fronend/index.html';
    });
  }

  /* ----------------------------------------------------------
     Boot — only on mobile
   ---------------------------------------------------------- */
  function boot() {
    if (!isMobile()) return;
    markActiveTab();
    initHeaderReveal();
    initHeaderDropdown('mnx-m-nav-lifestyle-trigger', 'mnx-m-dropdown-lifestyle');
    initHeaderDropdown('mnx-m-nav-checkin-trigger', 'mnx-m-dropdown-checkin', renderCheckinAccount);
    initEnvChip();
    initCheckinSearch();
    [envSheet(), document.getElementById('mnx-m-dropdown-lifestyle'), document.getElementById('mnx-m-dropdown-checkin')].forEach(initSwipeToClose);
    renderHeaderChip();
    renderCheckinAccount();
  }

  document.addEventListener('mnx:mobile-shell-loaded', boot);
  document.addEventListener('environment:ready', () => {
    if (isMobile()) renderHeaderChip();
  });
  document.addEventListener('auth:changed', () => {
    if (isMobile()) renderCheckinAccount();
  });
})();
