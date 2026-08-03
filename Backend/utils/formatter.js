function round(value, decimals = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function hourlyToDailyAverage(times, values) {
  const byDate = new Map();
  times.forEach((t, i) => {
    const date = t.slice(0, 10);
    const v = values[i];
    if (typeof v !== 'number' || Number.isNaN(v)) return;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(v);
  });
  return [...byDate.entries()].map(([date, vals]) => ({
    date,
    value: round(vals.reduce((s, v) => s + v, 0) / vals.length, 1),
  }));
}

function dailyToRows(times, values, decimals = 1) {
  return times.map((date, i) => ({ date, value: round(values[i], decimals) }));
}

function formatThaiDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

module.exports = { round, hourlyToDailyAverage, dailyToRows, formatThaiDate };
