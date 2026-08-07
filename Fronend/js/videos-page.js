let mnxVideosPageFilter = 'all';

async function renderVideosGrid() {
  const grid = document.getElementById('videos-grid');
  if (!grid || !window.MNX_REVIEWS) return;

  grid.innerHTML = `<p class="videos-page__empty">กำลังโหลด...</p>`;
  const videos = await window.MNX_REVIEWS.getVideosByCategory(mnxVideosPageFilter);

  if (!videos.length) {
    grid.innerHTML = `
      <div class="videos-page__empty">
        <div class="videos-page__empty-icon"></div>
        <p>ยังไม่มีวิดีโอรีวิวในหมวดนี้ เป็นคนแรกที่อัพโหลดวิดีโอรีวิวเลย!</p>
      </div>
    `;
    return;
  }

  window.mnxRenderVideoCards(grid, videos);
}

function initVideosFilters() {
  document.querySelectorAll('#videos-filters .videos-page__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#videos-filters .videos-page__filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      mnxVideosPageFilter = btn.dataset.category;
      renderVideosGrid();
    });
  });
}

document.addEventListener('includes:loaded', () => {
  initVideosFilters();
  renderVideosGrid();
});

document.addEventListener('DOMContentLoaded', () => {
  initVideosFilters();
  renderVideosGrid();
});

document.addEventListener('places:updated', renderVideosGrid);
document.addEventListener('reviews:updated', renderVideosGrid);
document.addEventListener('videos:updated', renderVideosGrid);
