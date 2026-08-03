const MNX_BANDS_DEFAULT = [
  { max: 10, label: 'สดใส', color: '#4fae67' },
  { max: 25, label: 'ดี', color: '#7fbf6a' },
  { max: 50, label: 'ปกติ', color: '#c9a227' },
  { max: 75, label: 'เริ่มไม่ดี', color: '#e08a3c' },
  { max: 90, label: 'ควรดูแลสุขภาพ', color: '#d9622f' },
  { max: 100, label: 'สถานการณ์เข้าขั้นวิกฤต', color: '#c9392f' },
];

const MNX_BANDS_MEKONG = [
  { max: 10, label: 'น้ำน้อยวิกฤต', color: '#c9392f' },
  { max: 25, label: 'น้ำน้อย', color: '#d9622f' },
  { max: 50, label: 'ระดับน้ำปกติ', color: '#4fae67' },
  { max: 75, label: 'น้ำเริ่มสูง', color: '#e08a3c' },
  { max: 90, label: 'น้ำล้นตลิ่ง', color: '#d9622f' },
  { max: 100, label: 'น้ำท่วมอุทกภัยวิกฤต', color: '#c9392f' },
];

function mnxResolveBand(percent, bands = MNX_BANDS_DEFAULT) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  return bands.find((b) => p <= b.max) || bands[bands.length - 1];
}

const MNX_DISTRICTS = [
  'เมืองนครพนม', 'ปลาปาก', 'ท่าอุเทน', 'บ้านแพง',
  'ธาตุพนม', 'เรณูนคร', 'นาแก', 'ศรีสงคราม',
  'นาหว้า', 'โพนสวรรค์', 'นาทม', 'วังยาง',
];

function mnxPm25ToPercent(value) {
  if (typeof value !== 'number') return null;
  return Math.round(Math.min(100, (value / 150) * 100));
}

function mnxTempToPercent(value) {
  if (typeof value !== 'number') return null;
  return Math.round(Math.min(100, Math.max(0, ((value - 24) / (42 - 24)) * 100)));
}

function mnxRowsToHistory(rows) {
  return (rows || []).map((r) => ({ date: new Date(r.date), value: r.value }));
}

window.MNX_ENV = {
  loading: true,
  bands: { default: MNX_BANDS_DEFAULT, mekong: MNX_BANDS_MEKONG },
  resolveBand: mnxResolveBand,
  districts: MNX_DISTRICTS,
  pm25: {
    provinceValue: null, unit: 'µg/m³', percent: null, byDistrict: {}, toPercent: mnxPm25ToPercent, history: [], historyByDistrict: {},
    pm10: null, co: null, no2: null, so2: null, o3: null, usAqi: null, europeanAqi: null,
  },
  weather: {
    temp: null, desc: '', humidity: null, rainChance: null, percent: null, history: [],
    feelsLike: null, pressure: null, windSpeed: null, windDeg: null, visibility: null, uvIndex: null,
  },
  temperature: {
    provinceValue: null, unit: '°C', percent: null, byDistrict: {}, toPercent: mnxTempToPercent, history: [], historyByDistrict: {},
    feelsLike: null,
  },
  mekong: { level: null, unit: 'm³/s', percent: null, trend: '', history: [] },
  traffic: { level: '', desc: '' },
};

async function mnxLoadEnvironmentData() {
  try {
    const [snapshot, pm25History, weatherHistory, mekongHistory] = await Promise.all([
      window.MNX_API.get('/environment/snapshot'),
      window.MNX_API.get('/environment/history?metric=pm25&days=7'),
      window.MNX_API.get('/environment/history?metric=weather&days=7'),
      window.MNX_API.get('/environment/history?metric=mekong&days=7'),
    ]);

    const env = window.MNX_ENV;
    env.loading = false;
    env.bands = snapshot.bands || env.bands;

    env.pm25.provinceValue = snapshot.pm25.value;
    env.pm25.percent = snapshot.pm25.percent;
    env.pm25.unit = snapshot.pm25.unit;
    env.pm25.history = mnxRowsToHistory(pm25History.rows);
    env.pm25.pm10 = snapshot.pm25.pm10;
    env.pm25.co = snapshot.pm25.co;
    env.pm25.no2 = snapshot.pm25.no2;
    env.pm25.so2 = snapshot.pm25.so2;
    env.pm25.o3 = snapshot.pm25.o3;
    env.pm25.usAqi = snapshot.pm25.usAqi;
    env.pm25.europeanAqi = snapshot.pm25.europeanAqi;

    env.weather.temp = snapshot.weather.temp;
    env.weather.desc = snapshot.weather.desc;
    env.weather.humidity = snapshot.weather.humidity;
    env.weather.rainChance = snapshot.weather.rainChance;
    env.weather.percent = mnxTempToPercent(snapshot.weather.temp);
    env.weather.history = mnxRowsToHistory(weatherHistory.rows);
    env.weather.feelsLike = snapshot.weather.feelsLike;
    env.weather.pressure = snapshot.weather.pressure;
    env.weather.windSpeed = snapshot.weather.windSpeed;
    env.weather.windDeg = snapshot.weather.windDeg;
    env.weather.visibility = snapshot.weather.visibility;
    env.weather.uvIndex = snapshot.weather.uvIndex;

    env.temperature.provinceValue = snapshot.weather.temp;
    env.temperature.percent = mnxTempToPercent(snapshot.weather.temp);
    env.temperature.history = mnxRowsToHistory(weatherHistory.rows);
    env.temperature.feelsLike = snapshot.weather.feelsLike;

    env.mekong.level = snapshot.mekong.level;
    env.mekong.unit = snapshot.mekong.unit;
    env.mekong.percent = snapshot.mekong.percent;
    env.mekong.trend = snapshot.mekong.trend;
    env.mekong.history = mnxRowsToHistory(mekongHistory.rows);

    env.traffic.level = snapshot.traffic.level;
    env.traffic.desc = snapshot.traffic.desc;

    document.dispatchEvent(new CustomEvent('environment:ready', { detail: { env } }));
  } catch (err) {
    console.error('[environment-data.js] Failed to load live environment data:', err.message);
    document.dispatchEvent(new CustomEvent('environment:error', { detail: { message: err.message } }));
  }
}

async function mnxLoadDistrictDetail() {
  try {
    const [current, pm25Hist, tempHist] = await Promise.all([
      window.MNX_API.get('/environment/snapshot/districts'),
      window.MNX_API.get('/environment/history/districts?metric=pm25&days=7'),
      window.MNX_API.get('/environment/history/districts?metric=temperature&days=7'),
    ]);

    const env = window.MNX_ENV;
    env.pm25.byDistrict = current.pm25ByDistrict;
    env.temperature.byDistrict = Object.fromEntries(
      Object.entries(current.temperatureByDistrict).map(([name, value]) => [name, { value, unit: '°C', percent: mnxTempToPercent(value) }])
    );
    env.pm25.historyByDistrict = Object.fromEntries(
      Object.entries(pm25Hist.byDistrict).map(([name, rows]) => [name, mnxRowsToHistory(rows)])
    );
    env.temperature.historyByDistrict = Object.fromEntries(
      Object.entries(tempHist.byDistrict).map(([name, rows]) => [name, mnxRowsToHistory(rows)])
    );

    document.dispatchEvent(new CustomEvent('environment:districts-ready', { detail: { env } }));
  } catch (err) {
    console.error('[environment-data.js] Failed to load district detail:', err.message);
  }
}

window.MNX_ENV_LOAD = mnxLoadEnvironmentData;
window.MNX_ENV_LOAD_DISTRICTS = mnxLoadDistrictDetail;

document.addEventListener('includes:loaded', mnxLoadEnvironmentData);
