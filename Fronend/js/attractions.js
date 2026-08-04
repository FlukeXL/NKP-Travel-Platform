const mnxAttractionsRenderGenerations = {};

async function renderCategoryRail(trackId, category) {
  const track = document.getElementById(trackId);
  if (!track || !window.mnxGetPlacesByCategory) return;

  const myGeneration = (mnxAttractionsRenderGenerations[trackId] = (mnxAttractionsRenderGenerations[trackId] || 0) + 1);
  const places = window.mnxGetPlacesByCategory(category);
  await Promise.all(places.map((p) => window.MNX_REVIEWS?.fetch(p.id)));
  if (myGeneration !== mnxAttractionsRenderGenerations[trackId]) return;

  track.innerHTML = places.map((p) => {
    const stats = window.MNX_REVIEWS?.stats(p.id);
    const ratingHtml = stats ? `<span class="stars">${mnxSingleStarIcon()}</span> ${stats.avg.toFixed(1)}` : 'ยังไม่มีคะแนน';
    return `
    <article class="place-card" data-place-open="${p.id}" style="cursor: pointer;">
      <div class="place-card__img-wrap" data-place-open="${p.id}">
        <img src="${p.img}" alt="${p.name}" draggable="false" />
        <span class="place-card__gallery-hint">${mnxImageIcon()} ${p.images.length} รูป · ดูรายละเอียด</span>
        <button class="place-card__favorite" data-favorite-id="${p.id}" aria-label="บันทึกเป็นรายการที่ชอบ">${mnxHeartIcon(false)}</button>
      </div>
      <div class="place-card__body" data-place-open="${p.id}">
        <div class="place-card__rating">${ratingHtml}</div>
        <h4 class="place-card__title">${p.name}</h4>
        <p class="place-card__desc">${p.desc}</p>
        <div class="place-card__meta">
          <span>${mnxPinIcon()} ${p.area}</span>
          <strong>${p.price}</strong>
        </div>
      </div>
    </article>
  `;
  }).join('');

  track.querySelectorAll('.place-card__favorite').forEach((btn) => {
    const placeId = btn.dataset.favoriteId;
    if (placeId && window.MNX_FAVORITES?.isFavorite(placeId)) {
      btn.classList.add('is-active');
      btn.innerHTML = mnxHeartIcon(true);
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
        btn.innerHTML = mnxHeartIcon(nowFavorited);
      } catch (err) {
        alert(err.message || 'ไม่สามารถบันทึกรายการที่ชอบได้ กรุณาลองใหม่');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function initScrollRows() {
  document.querySelectorAll('.scroll-row').forEach((row) => {
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

/* ----------------------------------------------------------
   Quick-jump active state (optional nicety) + boot
---------------------------------------------------------- */
async function renderAllCategoryRails() {
  await Promise.all([
    renderCategoryRail('cafe-track', 'cafe'),
    renderCategoryRail('restaurant-track', 'restaurant'),
    renderCategoryRail('temple-track', 'temple'),
    renderCategoryRail('fitness-track', 'fitness'),
  ]);
}

document.addEventListener('includes:loaded', async () => {
  await window.MNX_FAVORITES?.load();
  await renderAllCategoryRails();
  requestAnimationFrame(initScrollRows);
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});

document.addEventListener('auth:changed', async () => {
  await window.MNX_FAVORITES?.load();
  await renderAllCategoryRails();
  requestAnimationFrame(initScrollRows);
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});

document.addEventListener('places:updated', async () => {
  await renderAllCategoryRails();
  requestAnimationFrame(initScrollRows);
  document.dispatchEvent(new CustomEvent('app:content-updated'));
});
