function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function calcAge(birthdate) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() >= b.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function lastNDates(n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

module.exports = { asyncHandler, ok, calcAge, lastNDates };
