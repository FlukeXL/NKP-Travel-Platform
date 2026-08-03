/* Inline-SVG line icons (no fill on the outer wrapper needed since
   the map pin marker itself already carries the category color as
   its background) replace the old emoji glyphs used inside each
   map pin/popover. stroke="#fff" so each icon reads clearly against
   the colored pin background. */
const MNX_MAP_ICON_SVG = {
  temple: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 3h12l3 5-9 13L3 8Z"/><path d="M3 8h18M9 3l3 5 3-5M6 8l6 13 6-13"/></svg>',
  cafe: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M5 9h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Z"/><path d="M17 10h1.5a2 2 0 0 1 0 4H17"/><path d="M8 4c0 1-1 1-1 2M12 4c0 1-1 1-1 2"/></svg>',
  restaurant: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 10v11"/><path d="M15 3c-1.4 0-2 1.4-2 3v4c0 1 .6 2 2 2s2-1 2-2V3"/><path d="M15 12v9"/></svg>',
  fitness: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  nature: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M20 4c-8 0-14 6-14 14 8 0 14-6 14-14Z"/><path d="M6 18c2-4 5-7 9-9"/></svg>',
  landmark: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10Z"/><circle cx="12" cy="11" r="1.8"/></svg>',
  culture: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M4 21V9l8-5 8 5v12"/><path d="M4 21h16M9 21v-6h6v6"/></svg>',
};

const MNX_MAP_CATEGORY_STYLE = {
  temple: { color: '#c9a227', icon: MNX_MAP_ICON_SVG.temple, label: 'วัด / สถานที่ศักดิ์สิทธิ์' },
  cafe: { color: '#a9744f', icon: MNX_MAP_ICON_SVG.cafe, label: 'คาเฟ่' },
  restaurant: { color: '#d9573b', icon: MNX_MAP_ICON_SVG.restaurant, label: 'ร้านอาหาร' },
  fitness: { color: '#2f8f6f', icon: MNX_MAP_ICON_SVG.fitness, label: 'กิจกรรม / เทศกาล' },
  nature: { color: '#2f8f6f', icon: MNX_MAP_ICON_SVG.nature, label: 'ธรรมชาติ' },
  landmark: { color: '#2f8f6f', icon: MNX_MAP_ICON_SVG.landmark, label: 'แลนด์มาร์ก' },
  culture: { color: '#2f8f6f', icon: MNX_MAP_ICON_SVG.culture, label: 'วัฒนธรรม' },
};

const MNX_MAP_EVENTS = [
  {
    name: 'งานประเพณีไหลเรือไฟ',
    category: 'fitness',
    lat: 17.4078,
    lng: 104.7801,
    start: '2026-10-24',
    end: '2026-11-02',
    note: 'เทศกาลประจำปี ริมแม่น้ำโขง',
  },
];

function mnxFormatThaiDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function mnxBuildMapIcon(category) {
  const style = MNX_MAP_CATEGORY_STYLE[category] || MNX_MAP_CATEGORY_STYLE.landmark;
  return L.divIcon({
    className: 'mnx-map-pin-wrap',
    html: `<span class="mnx-map-pin" style="background:${style.color}"><span>${style.icon}</span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function mnxBuildPopupHtml({ name, category, area, price, start, end, note }) {
  const style = MNX_MAP_CATEGORY_STYLE[category] || MNX_MAP_CATEGORY_STYLE.landmark;
  const calendarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>';
  const dateRow = start && end
    ? `<div class="map-popover__dates">${calendarIcon} ${mnxFormatThaiDateShort(start)} – ${mnxFormatThaiDateShort(end)}</div>`
    : '';
  const noteRow = note ? `<div class="map-popover__dates">${note}</div>` : '';
  const metaRow = area ? `<div class="map-popover__dates">${mnxPinIcon(13)} ${area}${price ? ` · ${price}` : ''}</div>` : '';
  return `
    <span class="map-popover__type">${style.label}</span>
    <h5 class="map-popover__title">${name}</h5>
    ${dateRow}${metaRow}${noteRow}
  `;
}

function initAttractionsMap() {
  const container = document.getElementById('site-map-leaflet');
  if (!container || typeof L === 'undefined') return;

  const map = L.map(container, {
    center: [17.35, 104.72],
    zoom: 10,
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  map.on('click', () => map.scrollWheelZoom.enable());
  container.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  const bounds = [];

  (window.MNX_PLACES || []).forEach((place) => {
    if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;
    const marker = L.marker([place.lat, place.lng], { icon: mnxBuildMapIcon(place.category) }).addTo(map);
    marker.bindPopup(
      mnxBuildPopupHtml({ name: place.name, category: place.category, area: place.area, price: place.price }),
      { className: 'mnx-map-popup', closeButton: true }
    );
    bounds.push([place.lat, place.lng]);
  });

  MNX_MAP_EVENTS.forEach((evt) => {
    const marker = L.marker([evt.lat, evt.lng], { icon: mnxBuildMapIcon(evt.category) }).addTo(map);
    marker.bindPopup(mnxBuildPopupHtml(evt), { className: 'mnx-map-popup', closeButton: true });
    bounds.push([evt.lat, evt.lng]);
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });

  setTimeout(() => map.invalidateSize(), 400);
}

document.addEventListener('includes:loaded', () => {

  initAttractionsMap();
});

// Leaflet map is only built once (no cheap "re-render" hook), and
// MNX_PLACES may still be seed data at the moment initAttractionsMap()
// first runs (places:updated fires moments later once the API sync
// resolves) — simplest correct fix is to just rebuild the whole map
// once real data arrives, since this only happens once per page load.
document.addEventListener('places:updated', () => {
  const container = document.getElementById('site-map-leaflet');
  if (container && container._leaflet_id) {
    container.innerHTML = '';
    delete container._leaflet_id;
  }
  initAttractionsMap();
});
