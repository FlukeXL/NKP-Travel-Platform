function mnxSingleStarIcon(filled = true) {
  return `<svg class="mnx-star${filled ? ' is-filled' : ''}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" width="13" height="13"><path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5Z"/></svg>`;
}

function mnxStarRowIcon(rating, max = 5) {
  const full = Math.round(rating);
  let html = '';
  for (let i = 0; i < max; i++) html += mnxSingleStarIcon(i < full);
  return html;
}

function mnxPinIcon(size = 13) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="vertical-align:-2px;"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10Z"/><circle cx="12" cy="11" r="1.8"/></svg>`;
}

function mnxArrowIcon(size = 13) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="vertical-align:-2px;"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
}

function mnxHeartIcon(filled = false, size = 15) {
  return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}"><path d="M12 20s-7-4.5-9.3-8.8C1.4 8 2.6 4.6 6 4c2-.4 3.8.6 6 3 2.2-2.4 4-3.4 6-3 3.4.6 4.6 4 3.3 7.2C19 15.5 12 20 12 20Z"/></svg>`;
}

function mnxImageIcon(size = 13) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="vertical-align:-2px;"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5.5-5.5L11 15l-2.5-2.5L3 18"/></svg>`;
}

/* Small chevron used for "อ่านต่อ ▾ / ย่อลง ▴" expand-collapse
   toggles — direction "down" (default) or "up". */
function mnxChevronIcon(direction = 'down', size = 10) {
  const d = direction === 'up' ? 'M2 7L6 3L10 7' : 'M2 3L6 7L10 3';
  return `<svg viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size * 10 / 12}" style="vertical-align:-1px;"><path d="${d}"/></svg>`;
}

/* ============================================================
   Mobile / Desktop TRUE separation (Task 25).

   Decided once per page load, BEFORE any [data-include] is
   fetched: on mobile viewports, elements marked [data-desktop-only]
   (the .floating-header wrapping navbar.html + infobar.html) are
   removed from the DOM entirely rather than fetched — so desktop
   navbar.js / infobar.js never get a #site-navbar / #site-infobar
   node to attach to, and there is no CSS override or hide/show
   step involved at all. Symmetrically, [data-mobile-only] (the
   independent mobile-shell.html header/tab-bar/sheets) is only
   ever fetched on mobile and is removed on desktop.

   Breakpoint matches the one already used for hiding the desktop
   dropdown panels (.lifestyle-menu/.checkin-menu/.account-menu) —
   below this width the old panels were already non-functional, so
   900px is the natural mobile/desktop cutover.
   ============================================================ */
const MNX_MOBILE_BREAKPOINT = 900;

function mnxIsMobileViewport() {
  return window.matchMedia(`(max-width: ${MNX_MOBILE_BREAKPOINT}px)`).matches;
}

async function loadIncludes() {
  const isMobile = mnxIsMobileViewport();
  document.documentElement.classList.toggle('mnx-is-mobile', isMobile);

  const slots = document.querySelectorAll('[data-include]');
  await Promise.all(
    Array.from(slots).map(async (slot) => {
      const desktopWrap = slot.closest('[data-desktop-only]');
      const mobileWrap = slot.closest('[data-mobile-only]');

      if (desktopWrap && isMobile) {
        desktopWrap.remove();
        return;
      }
      if (mobileWrap && !isMobile) {
        mobileWrap.remove();
        return;
      }

      const path = slot.getAttribute('data-include');
      try {
        const cacheBuster = `?v=${Date.now()}`;
        const res = await fetch(path + cacheBuster, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        slot.innerHTML = await res.text();
      } catch (err) {
        console.error('[main.js] include error:', err);
        slot.innerHTML = '';
      }
    })
  );
  document.dispatchEvent(new CustomEvent('includes:loaded'));
  if (isMobile) document.dispatchEvent(new CustomEvent('mnx:mobile-shell-loaded'));
}

function loadAOSScript() {
  return new Promise((resolve) => {
    if (window.AOS) return resolve(window.AOS);
    const existing = document.querySelector('script[src*="aos.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AOS));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
    script.async = true;
    script.onload = () => resolve(window.AOS);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

async function initAOS() {
  // Convert any elements with .fade-in to data-aos="fade-up" automatically
  document.querySelectorAll('.fade-in:not([data-aos])').forEach((el) => {
    el.setAttribute('data-aos', 'fade-up');
  });

  const aos = await loadAOSScript();
  if (aos) {
    if (!window.__mnx_aos_inited) {
      aos.init({
        duration: 700,
        easing: 'ease-out-cubic',
        once: false,       // allows animation when scrolling both down AND up
        mirror: true,      // animates elements out and back in when scrolling past them
        offset: 50,
      });
      window.__mnx_aos_inited = true;
    } else {
      aos.refresh();
    }
  }
}

function initHeaderReveal() {
  const header = document.getElementById('site-floating-header');
  if (!header) return;

  let cachedRevealAt = window.innerHeight;
  let ticking = false;

  const updateRevealAt = () => {
    const showcase = document.getElementById('showcase');
    const pageHero = document.querySelector('.page-hero');
    if (showcase) {
      cachedRevealAt = showcase.offsetTop - 80;
    } else if (pageHero) {
      cachedRevealAt = pageHero.offsetTop + pageHero.offsetHeight - 80;
    } else {
      cachedRevealAt = Math.min(window.innerHeight * 0.4, 250);
    }
  };

  const updateHeader = () => {
    const scrolled = window.scrollY >= cachedRevealAt;
    header.classList.toggle('floating-header--visible', scrolled);
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  };

  updateRevealAt();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateRevealAt();
    onScroll();
  }, { passive: true });

  document.addEventListener('includes:loaded', () => {
    updateRevealAt();
    onScroll();
  });
  document.addEventListener('app:content-updated', () => {
    updateRevealAt();
    onScroll();
  });

  onScroll();
}

function loadI18nScript() {
  return new Promise((resolve) => {
    if (window.MNX_I18N) return resolve(window.MNX_I18N);
    const existing = document.querySelector('script[src*="i18n.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.MNX_I18N));
      return;
    }
    const script = document.createElement('script');
    script.src = '/Fronend/js/i18n.js?v=38';
    script.async = false;
    script.onload = () => resolve(window.MNX_I18N);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

function initSiteLinkInteractions() {
  const currentPath = window.location.pathname;
  const isFronendRoot = currentPath.includes('/Fronend/');

  document.querySelectorAll('a[href]').forEach((link) => {
    const rawHref = link.getAttribute('href');
    if (!rawHref) return;

    // Ignore javascript:, mailto:, tel:, external links
    if (rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
      return;
    }

    // Auto-normalize path if needed
    let targetHref = rawHref;
    if (isFronendRoot && !targetHref.startsWith('/Fronend/')) {
      targetHref = '/Fronend' + (targetHref.startsWith('/') ? targetHref : '/' + targetHref);
      link.setAttribute('href', targetHref);
    } else if (!isFronendRoot && targetHref.startsWith('/Fronend/')) {
      targetHref = targetHref.replace(/^\/Fronend/, '');
      link.setAttribute('href', targetHref);
    }

    // Handle hash jumps (e.g. #panel-weather, #panel-pm25, etc)
    if (targetHref.includes('#')) {
      const parts = targetHref.split('#');
      const pagePart = parts[0];
      const hashPart = parts[1];

      link.addEventListener('click', (e) => {
        const curPage = currentPath.split('/').pop() || 'index.html';
        const targetPage = pagePart.split('/').pop();

        if (!pagePart || curPage === targetPage) {
          e.preventDefault();
          const targetEl = document.getElementById(hashPart);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, '', '#' + hashPart);
          } else {
            window.location.href = targetHref;
          }
        }
      });
    }
  });

  // Handle Privacy & Terms alert modals when tapped
  document.querySelectorAll('.footer [data-i18n="footer.privacy"], .footer [data-i18n="footer.terms"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const isPrivacy = link.getAttribute('data-i18n') === 'footer.privacy';
      const isEn = window.MNX_I18N && window.MNX_I18N.getLang() === 'EN';
      const title = isPrivacy
        ? (isEn ? 'Privacy Policy' : 'นโยบายความเป็นส่วนตัว')
        : (isEn ? 'Terms of Service' : 'ข้อกำหนดการใช้งาน');
      const msg = isPrivacy
        ? (isEn ? 'Nakhon Phanom Lifestyle Travel Platform prioritizes user data privacy in accordance with PDPA regulations.' : 'แพลตฟอร์ม Nakhon Phanom Lifestyle Travel Platform ให้ความสำคัญสูงสุดต่อการรักษาความปลอดภัยของข้อมูลส่วนบุคคลตามมาตรฐาน PDPA')
        : (isEn ? 'By accessing this platform, you agree to comply with our community terms and guidelines.' : 'การใช้งานแพลตฟอร์มนี้ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขการให้บริการของชุมชนเพื่อการท่องเที่ยวอย่างสร้างสรรค์');
      alert(`${title}\n\n${msg}`);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadI18nScript();
  await loadIncludes();
  initHeaderReveal();
  initAOS();
  if (window.MNX_I18N) {
    window.MNX_I18N.translateDom(window.MNX_I18N.getLang());
  }
  document.dispatchEvent(new CustomEvent('app:ready'));
});

document.addEventListener('app:content-updated', () => {
  initAOS();
  if (window.MNX_I18N) {
    window.MNX_I18N.translateDom(window.MNX_I18N.getLang());
  }
});

document.addEventListener('includes:loaded', () => {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.location.pathname.includes('about.html') || document.body.classList.contains('page-about')) {
    const socialSec = document.querySelector('.footer__social-section');
    if (socialSec) socialSec.style.display = 'none';
  }
  initSiteLinkInteractions();
  initAOS();
  if (window.MNX_I18N) {
    window.MNX_I18N.translateDom(window.MNX_I18N.getLang());
  }
});






