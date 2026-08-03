const METRIC_TITLES = {
  pm25: 'PM 2.5 — ข้อมูลย้อนหลัง 7 วัน',
  weather: 'สภาพอากาศ / อุณหภูมิ — ข้อมูลย้อนหลัง 7 วัน',
  mekong: 'ระดับแม่น้ำโขง — ข้อมูลย้อนหลัง 7 วัน',
  traffic: 'สภาพการจราจร — รายละเอียด',
};

function mnxMetricStatusLine(metric) {
  const env = window.MNX_ENV;
  if (!env) return '';
  switch (metric) {
    case 'pm25':
      return `คุณภาพอากาศ: ${env.resolveBand(env.pm25.percent).label} · อัปเดตล่าสุดเมื่อ 5 นาทีที่แล้ว`;
    case 'weather':
      return `${env.weather.desc} · อัปเดตล่าสุดเมื่อ 5 นาทีที่แล้ว`;
    case 'mekong':
      return `${env.mekong.trend} · อัปเดตล่าสุดวันนี้ 06:00`;
    case 'traffic':
      return env.traffic.desc;
    default:
      return '';
  }
}

function mnxInfobarMetricSeries(metric) {
  const env = window.MNX_ENV;
  if (!env) return null;
  switch (metric) {
    case 'pm25':
      return { history: env.pm25.history, unit: env.pm25.unit, color: env.resolveBand(env.pm25.percent).color };
    case 'weather':
      return { history: env.weather.history, unit: '°C', color: env.resolveBand(env.weather.percent).color };
    case 'mekong':
      return { history: env.mekong.history, unit: env.mekong.unit, color: env.resolveBand(env.mekong.percent, env.bands.mekong).color };
    default:
      return null;
  }
}

let mnxInfobarChart = null;

function mnxRenderInfobarChart(metric) {
  const canvas = document.getElementById('infobar-history-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const series = mnxInfobarMetricSeries(metric);
  if (mnxInfobarChart) {
    mnxInfobarChart.destroy();
    mnxInfobarChart = null;
  }
  canvas.style.display = series?.history?.length ? '' : 'none';
  if (!series?.history?.length) return;

  const labels = series.history.map((h) => h.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
  const values = series.history.map((h) => h.value);

  mnxInfobarChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: series.color,
        backgroundColor: series.color + '33',
        pointBackgroundColor: series.color,
        pointRadius: 3,
        pointHoverRadius: 5,
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
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} ${series.unit}` } },
      },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } } },
      },
    },
  });
}

function mnxDownloadInfobarChart(metric) {
  const series = mnxInfobarMetricSeries(metric);
  if (!series?.history?.length) {
    alert('ยังไม่มีข้อมูลย้อนหลังให้ดาวน์โหลดสำหรับตัวชี้วัดนี้');
    return;
  }
  const filenames = { pm25: 'PM25_นครพนม', weather: 'สภาพอากาศ_นครพนม', mekong: 'ระดับแม่น้ำโขง_นครพนม' };
  const sheetNames = { pm25: 'PM2.5', weather: 'Weather', mekong: 'Mekong' };
  window.mnxExportHistoryToExcel(filenames[metric] || metric, sheetNames[metric] || metric, series.history, series.unit);
}

function initInfobar() {
  const cards = document.querySelectorAll('.infobar__card');
  const panel = document.getElementById('infobar-history-panel');
  const title = document.getElementById('infobar-panel-title');
  const statusEl = document.getElementById('infobar-panel-status');
  const closeBtn = document.getElementById('infobar-panel-close');
  const downloadBtn = document.getElementById('infobar-download-chart');

  if (!cards.length || !panel) return;

  let activeMetric = null;

  function openPanel(metric, card) {
    cards.forEach((c) => c.classList.toggle('is-active', c === card));
    title.textContent = METRIC_TITLES[metric] || 'ข้อมูลย้อนหลัง 7 วัน';
    if (statusEl) statusEl.textContent = mnxMetricStatusLine(metric);
    panel.classList.add('is-open');
    activeMetric = metric;
    mnxRenderInfobarChart(metric);
    if (downloadBtn) downloadBtn.style.display = metric === 'traffic' ? 'none' : '';
    document.dispatchEvent(new CustomEvent('infobar:open', { detail: { metric } }));
  }

  function closePanel() {
    panel.classList.remove('is-open');
    cards.forEach((c) => c.classList.remove('is-active'));
    activeMetric = null;
  }

  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const metric = card.dataset.metric;
      if (activeMetric === metric) {
        closePanel();
      } else {
        openPanel(metric, card);
      }
    });
  });

  closeBtn?.addEventListener('click', closePanel);

  document.addEventListener('click', (e) => {
    if (activeMetric && !e.target.closest('.infobar')) closePanel();
  });

  downloadBtn?.addEventListener('click', () => {
    if (activeMetric) mnxDownloadInfobarChart(activeMetric);
  });
}

function fillInfobarPlaceholders() {
  const env = window.MNX_ENV;
  if (!env) return;

  const map = {
    'pm25-value': `${env.pm25.provinceValue} <small>${env.pm25.unit}</small>`,
    'weather-temp': `${env.weather.temp}°<small>C</small>`,
    'mekong-level': `${env.mekong.level} <small>${env.mekong.unit}</small>`,
    'traffic-level': env.traffic.level,
  };
  Object.entries(map).forEach(([field, value]) => {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (el) el.innerHTML = value;
  });

  const dotClass = (percent) => {
    if (percent <= 50) return 'infobar__status-dot--good';
    if (percent <= 75) return 'infobar__status-dot--moderate';
    return 'infobar__status-dot--bad';
  };

  document.querySelector('[data-field="pm25-dot"]')?.classList.add(dotClass(env.pm25.percent));
  document.querySelector('[data-field="traffic-dot"]')?.classList.add('infobar__status-dot--good');
}

document.addEventListener('includes:loaded', () => {
  initInfobar();
});

document.addEventListener('environment:ready', fillInfobarPlaceholders);