import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadContext, extractRegister } from './context.mjs';
import { getCritiqueDir } from './lib/impeccable-paths.mjs';

function hasCode(cwd) {
  if (fs.existsSync(path.join(cwd, 'package.json'))) return true;
  for (const d of ['src', 'app', 'pages', 'site', 'public', 'components', 'lib']) {
    if (fs.existsSync(path.join(cwd, d))) return true;
  }
  return false;
}

function latestCritique(cwd) {
  try {
    const dir = getCritiqueDir(cwd);
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
    if (!files.length) return null;
    const newest = files[files.length - 1];
    const text = fs.readFileSync(path.join(dir, newest), 'utf-8');
    const front = text.split('---')[1] || '';
    const get = (k) => {
      const m = front.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
      return m ? m[1].trim() : null;
    };
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      slug: get('slug'),
      score: num(get('score')),
      p0: num(get('p0')),
      p1: num(get('p1')),
      timestamp: get('timestamp'),
      file: path.relative(cwd, path.join(dir, newest)),
    };
  } catch {
    return null;
  }
}

/** Branch + a scope hint: files changed vs the default branch, else working tree. */
function gitSignals(cwd) {
  const run = (args, { trim = true } = {}) => {
    try {
      const out = execFileSync('git', args, {
        cwd,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return trim ? out.trim() : out;
    } catch {
      return null;
    }
  };
  if (run(['rev-parse', '--is-inside-work-tree']) !== 'true') {
    return { isRepo: false, branch: null, base: null, changedFiles: [], changedCount: 0 };
  }
  const branch = run(['rev-parse', '--abbrev-ref', 'HEAD']);
  let base = null;
  for (const b of ['main', 'master']) {
    if (run(['rev-parse', '--verify', '--quiet', b]) !== null) {
      base = b;
      break;
    }
  }
  const diffBase = base && branch && branch !== base ? base : null;
  const fromDiff = diffBase ? run(['diff', '--name-only', `${diffBase}...HEAD`]) : null;
  const fromStatus = run(['-c', 'core.quotepath=false', 'status', '--porcelain'], { trim: false });
  let changed = [];
  if (fromDiff) {
    changed = fromDiff.split('\n').filter(Boolean);
  } else if (fromStatus) {
    changed = fromStatus.split(/\r?\n/).filter(Boolean).map((l) => {
      const p = l.slice(3);
      const arrow = p.indexOf(' -> ');
      return arrow === -1 ? p : p.slice(arrow + 4);
    });
  }
  return {
    isRepo: true,
    branch,
    base: diffBase,
    changedFiles: changed.slice(0, 50),
    changedCount: changed.length,
  };
}

const COMMON_DEV_PORTS = [4321, 3000, 5173, 5174, 8080, 8000, 4200];

function probePort(port, timeout = 250) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch { /* ignore */ }
      resolve(ok);
    };
    sock.setTimeout(timeout);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect(port, '127.0.0.1');
  });
}

async function devServerSignals() {
  const open = [];
  await Promise.all(
    COMMON_DEV_PORTS.map(async (p) => {
      if (await probePort(p)) open.push(p);
    }),
  );
  open.sort((a, b) => a - b);
  return { running: open.length > 0, ports: open };
}

const SCANNABLE_EXT = new Set([
  '.html', '.htm', '.css', '.scss',
  '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.astro',
]);
const SOURCE_DIRS = ['src', 'app', 'components', 'pages', 'public'];

function scanTargets(cwd, git) {
  if (git.isRepo && git.changedFiles.length) {
    const changed = git.changedFiles
      .filter((f) => SCANNABLE_EXT.has(path.extname(f).toLowerCase()))
      .filter((f) => fs.existsSync(path.join(cwd, f)));
    if (changed.length) return { targets: changed.slice(0, 50), via: 'git-changes' };
  }
  const dirs = SOURCE_DIRS.filter((d) => fs.existsSync(path.join(cwd, d)));
  if (dirs.length) return { targets: dirs, via: 'source-dir' };
  if (fs.existsSync(path.join(cwd, 'index.html'))) return { targets: ['index.html'], via: 'html' };
  if (hasCode(cwd)) return { targets: ['.'], via: 'root' };
  return { targets: [], via: null };
}

export async function gatherSignals(cwd = process.cwd()) {
  const ctx = loadContext(cwd);
  const git = gitSignals(cwd);
  return {
    setup: {
      hasProduct: ctx.hasProduct,
      productPath: ctx.productPath,
      hasDesign: ctx.hasDesign,
      designPath: ctx.designPath,
      hasCode: hasCode(cwd),
      register: extractRegister(ctx.product),
    },
    critique: { latest: latestCritique(cwd) },
    git,
    devServer: await devServerSignals(),
    scan: scanTargets(cwd, git),
  };
}

async function cli() {
  const signals = await gatherSignals(process.cwd());
  process.stdout.write(`${JSON.stringify(signals, null, 2)}\n`);
}

function invokedAsScript() {
  const arg = process.argv[1];
  if (!arg) return false;
  try {
    return fs.realpathSync(arg) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedAsScript()) {
  cli();
}
