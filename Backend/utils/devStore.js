const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '.devdata');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readAll(name) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAll(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf-8');
}

function get(name, id) {
  return readAll(name)[id] || null;
}

function set(name, id, value) {
  const all = readAll(name);
  all[id] = value;
  writeAll(name, all);
  return value;
}

function remove(name, id) {
  const all = readAll(name);
  delete all[id];
  writeAll(name, all);
}

function findOne(name, predicate) {
  const all = readAll(name);
  return Object.values(all).find(predicate) || null;
}

module.exports = { readAll, writeAll, get, set, remove, findOne };
