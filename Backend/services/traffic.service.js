const LEVELS = [
  { level: 'คล่องตัว', weight: 5 },
  { level: 'คล่องตัวปานกลาง', weight: 3 },
  { level: 'ติดขัดเล็กน้อย', weight: 1.5 },
  { level: 'ติดขัด', weight: 0.5 },
];

function pickWeighted() {
  const total = LEVELS.reduce((s, l) => s + l.weight, 0);
  let r = Math.random() * total;
  for (const l of LEVELS) {
    if (r < l.weight) return l.level;
    r -= l.weight;
  }
  return LEVELS[0].level;
}

async function getTrafficSnapshot() {
  const level = pickWeighted();
  return {
    level,
    desc: `ถนนสุนทรวิจิตร: ${level}`,
    simulated: true,
  };
}

module.exports = { getTrafficSnapshot };
