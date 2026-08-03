let mnxCharts = {}; // metricKey -> Chart.js instance
let mnxSelectedDistrict = 'ทั้งจังหวัด';

function mnxThaiDateLabel(date) {
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

/* ----------------------------------------------------------
   District filter chips (affects PM2.5 + Temperature panels only)
---------------------------------------------------------- */
function renderDistrictChips() {
  const wrap = document.getElementById('district-chips');
  const env = window.MNX_ENV;
  if (!wrap || !env) return;

  const options = ['ทั้งจังหวัด', ...env.districts];
  wrap.innerHTML = options.map((d) => `
    <button class="district-chip ${d === mnxSelectedDistrict ? 'is-active' : ''}" data-district="${d}">${d}</button>
  `).join('');

  wrap.querySelectorAll('.district-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      mnxSelectedDistrict = chip.dataset.district;
      wrap.querySelectorAll('.district-chip').forEach((c) => c.classList.toggle('is-active', c === chip));
      renderPm25Panel();
      renderTemperaturePanel();
    });
  });
}

/* ----------------------------------------------------------
   Shared gauge + chart + table renderer
---------------------------------------------------------- */
function renderGauge(elId, percent, valueLabel, unitLabel, band, districtNote) {
  const el = document.getElementById(elId);
  if (!el) return;
  const gauge = el.querySelector('.gauge');
  gauge.style.setProperty('--gauge-percent', percent);
  gauge.style.setProperty('--gauge-color', band.color);
  el.querySelector('.gauge__value').innerHTML = `${valueLabel}<small>${unitLabel}</small>`;
  const statusEl = el.querySelector('.gauge-card__status');
  statusEl.style.setProperty('--gauge-color', band.color);
  statusEl.textContent = `${band.label} · ${percent}%`;
  const districtEl = el.querySelector('.gauge-card__district');
  if (districtEl) districtEl.innerHTML = districtNote || '';
}

function renderChart(canvasId, metricKey, history, unit, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = history.map((h) => mnxThaiDateLabel(h.date));
  const values = history.map((h) => h.value);

  if (mnxCharts[metricKey]) mnxCharts[metricKey].destroy();

  mnxCharts[metricKey] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: unit,
        data: values,
        borderColor: color,
        backgroundColor: color + '26',
        pointBackgroundColor: color,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} ${unit}`,
          },
        },
      },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderTable(tbodyId, history, unit) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = history
    .map((h) => `<tr><td>${mnxThaiDateLabel(h.date)}</td><td>${h.value} ${unit}</td></tr>`)
    .join('');
}

const exportHistoryToExcel = window.mnxExportHistoryToExcel;

function renderStatGrid(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = items.map((it) => `
    <div class="stat-grid__item">
      <div class="stat-grid__icon">${it.icon}</div>
      <div class="stat-grid__value">${it.value != null ? it.value : '--'}${it.unit ? `<small> ${it.unit}</small>` : ''}</div>
      <span class="stat-grid__label">${it.label}</span>
    </div>
  `).join('');
}

/** Converts wind degrees to a compass direction label (e.g. 91° -> "ตะวันออก"). */
function mnxWindDegToCompassTh(deg) {
  if (typeof deg !== 'number') return '';
  const dirs = ['เหนือ', 'ตะวันออกเฉียงเหนือ', 'ตะวันออก', 'ตะวันออกเฉียงใต้', 'ใต้', 'ตะวันตกเฉียงใต้', 'ตะวันตก', 'ตะวันตกเฉียงเหนือ'];
  return dirs[Math.round(deg / 45) % 8];
}

/* ----------------------------------------------------------
   Panel 1 — PM2.5 (province avg OR selected district)
---------------------------------------------------------- */
function renderPm25Panel() {
  const env = window.MNX_ENV;
  if (!env) return;

  const isProvince = mnxSelectedDistrict === 'ทั้งจังหวัด';
  const value = isProvince ? env.pm25.provinceValue : env.pm25.byDistrict[mnxSelectedDistrict].value;
  const percent = isProvince ? env.pm25.percent : env.pm25.toPercent(value);
  const band = env.resolveBand(percent);
  const history = isProvince ? env.pm25.history : env.pm25.historyByDistrict[mnxSelectedDistrict];

  renderGauge('pm25-gauge', percent, value, ` ${env.pm25.unit}`, band,
    isProvince ? 'ค่าเฉลี่ยทั้งจังหวัด' : `เขตอำเภอ: <strong>${mnxSelectedDistrict}</strong>`);
  renderChart('pm25-chart', 'pm25', history, env.pm25.unit, band.color);
  renderTable('pm25-table-body', history, env.pm25.unit);

  renderStatGrid('pm25-stat-grid', [
    { icon: '', value: env.pm25.pm10, unit: 'µg/m³', label: 'PM10' },
    { icon: '', value: env.pm25.co, unit: 'µg/m³', label: 'คาร์บอนมอนอกไซด์' },
    { icon: '', value: env.pm25.no2, unit: 'µg/m³', label: 'ไนโตรเจนไดออกไซด์' },
    { icon: '', value: env.pm25.so2, unit: 'µg/m³', label: 'ซัลเฟอร์ไดออกไซด์' },
    { icon: '', value: env.pm25.o3, unit: 'µg/m³', label: 'โอโซน' },
    { icon: '', value: env.pm25.usAqi, unit: 'US AQI', label: 'ดัชนีแวดล้อมประเทศไทย' },
  ]);

  const pm25ExportBtn = document.getElementById('pm25-export');
  if (pm25ExportBtn) pm25ExportBtn.onclick = () => exportHistoryToExcel(`PM25_${mnxSelectedDistrict}`, 'PM2.5', history, env.pm25.unit);
}

/* ----------------------------------------------------------
   Panel 2 — Weather condition (province-wide only)
---------------------------------------------------------- */
function renderWeatherPanel() {
  const env = window.MNX_ENV;
  if (!env) return;

  const band = env.resolveBand(env.weather.percent);
  renderGauge('weather-gauge', env.weather.percent, env.weather.temp, '°C', band,
    `${env.weather.desc} · ความชื้น ${env.weather.humidity}% · ฝนตก ${env.weather.rainChance ?? '--'}%`);
  renderChart('weather-chart', 'weather', env.weather.history, '°C', band.color);
  renderTable('weather-table-body', env.weather.history, '°C');

  renderStatGrid('weather-stat-grid', [
    { icon: '', value: env.weather.feelsLike, unit: '°C', label: 'อุณหภูมิที่รู้สึกได้' },
    { icon: '', value: env.weather.humidity, unit: '%', label: 'ความชื้นสัมพัทธ์' },
    { icon: '', value: env.weather.rainChance, unit: '%', label: 'โอกาสเกิดฝน' },
    { icon: '', value: env.weather.windSpeed, unit: 'กม./ชม.', label: `ความเร็วลม${env.weather.windDeg != null ? ` (${mnxWindDegToCompassTh(env.weather.windDeg)})` : ''}` },
    { icon: '', value: env.weather.pressure, unit: 'hPa', label: 'ความกดอากาศ' },
    { icon: '', value: env.weather.visibility != null ? Math.round(env.weather.visibility / 1000) : null, unit: 'กม.', label: 'ระยะมองเห็น' },
    { icon: '', value: env.weather.uvIndex, unit: 'UV', label: 'ดัชนีรังสียูวี' },
  ]);

  const weatherExportBtn = document.getElementById('weather-export');
  if (weatherExportBtn) weatherExportBtn.onclick = () => exportHistoryToExcel('สภาพอากาศ_นครพนม', 'Weather', env.weather.history, '°C');
}

/* ----------------------------------------------------------
   Panel 3 — Temperature (province avg OR selected district)
---------------------------------------------------------- */
function renderTemperaturePanel() {
  const env = window.MNX_ENV;
  if (!env) return;

  const isProvince = mnxSelectedDistrict === 'ทั้งจังหวัด';
  const value = isProvince ? env.temperature.provinceValue : env.temperature.byDistrict[mnxSelectedDistrict].value;
  const percent = isProvince ? env.temperature.percent : env.temperature.toPercent(value);
  const band = env.resolveBand(percent);
  const history = isProvince ? env.temperature.history : env.temperature.historyByDistrict[mnxSelectedDistrict];

  renderGauge('temp-gauge', percent, value, `°${env.temperature.unit.replace('°', '')}`, band,
    isProvince ? 'ค่าเฉลี่ยทั้งจังหวัด' : `เขตอำเภอ: <strong>${mnxSelectedDistrict}</strong>`);
  renderChart('temp-chart', 'temperature', history, env.temperature.unit, band.color);
  renderTable('temp-table-body', history, env.temperature.unit);

  const values = history.map((h) => h.value);
  renderStatGrid('temp-stat-grid', [
    { icon: '', value: isProvince ? env.temperature.feelsLike : null, unit: '°C', label: 'อุณหภูมิที่รู้สึกได้' },
    { icon: '⬆', value: values.length ? Math.max(...values).toFixed(1) : null, unit: '°C', label: 'สูงสุด (7 วัน)' },
    { icon: '⬇', value: values.length ? Math.min(...values).toFixed(1) : null, unit: '°C', label: 'ต่ำสุด (7 วัน)' },
    { icon: '', value: values.length ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : null, unit: '°C', label: 'ค่าเฉลี่ย (7 วัน)' },
  ]);

  const tempExportBtn = document.getElementById('temp-export');
  if (tempExportBtn) tempExportBtn.onclick = () => exportHistoryToExcel(`อุณหภูมิ_${mnxSelectedDistrict}`, 'Temperature', history, env.temperature.unit);
}

/* ----------------------------------------------------------
   Panel 4 — Mekong river level (province-wide, U-shaped bands)
---------------------------------------------------------- */
function renderMekongPanel() {
  const env = window.MNX_ENV;
  if (!env) return;

  const band = env.resolveBand(env.mekong.percent, env.bands.mekong);
  renderGauge('mekong-gauge', env.mekong.percent, env.mekong.level, ` ${env.mekong.unit}`, band, env.mekong.trend);
  renderChart('mekong-chart', 'mekong', env.mekong.history, env.mekong.unit, band.color);
  renderTable('mekong-table-body', env.mekong.history, env.mekong.unit);

  const values = env.mekong.history.map((h) => h.value);
  renderStatGrid('mekong-stat-grid', [
    { icon: '', value: env.mekong.trend, unit: '', label: 'แนวโน้ม' },
    { icon: '⬆', value: values.length ? Math.max(...values).toFixed(1) : null, unit: 'm³/s', label: 'สูงสุด (7 วัน)' },
    { icon: '⬇', value: values.length ? Math.min(...values).toFixed(1) : null, unit: 'm³/s', label: 'ต่ำสุด (7 วัน)' },
    { icon: '', value: values.length ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : null, unit: 'm³/s', label: 'ค่าเฉลี่ย (7 วัน)' },
  ]);

  const mekongExportBtn = document.getElementById('mekong-export');
  if (mekongExportBtn) mekongExportBtn.onclick = () => exportHistoryToExcel('ระดับแม่น้ำโขง_นครพนม', 'Mekong', env.mekong.history, env.mekong.unit);
}

/* ----------------------------------------------------------
   Render band legend strips (10/25/50/75/90/100%) per panel
---------------------------------------------------------- */
function renderBandLegends() {
  const env = window.MNX_ENV;
  if (!env) return;

  document.querySelectorAll('[data-band-legend]').forEach((el) => {
    const type = el.dataset.bandLegend === 'mekong' ? 'mekong' : 'default';
    const bands = env.bands[type];
    el.innerHTML = bands.map((b) => `
      <span class="band-legend__item"><span class="band-legend__dot" style="background:${b.color}"></span>${b.max}% ${b.label}</span>
    `).join('');
  });
}

function renderAllPanels() {
  renderBandLegends();
  renderPm25Panel();
  renderWeatherPanel();
  renderTemperaturePanel();
  renderMekongPanel();
}

document.addEventListener('includes:loaded', () => {
  if (!window.MNX_ENV) {
    console.error('[weather.js] window.MNX_ENV not found — check environment-data.js is loaded first.');
    return;
  }
  renderDistrictChips();
  window.MNX_ENV_LOAD_DISTRICTS?.();
});

document.addEventListener('environment:ready', renderAllPanels);
document.addEventListener('environment:districts-ready', () => {
  renderDistrictChips();
  renderAllPanels();
});
