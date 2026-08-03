import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLiveConfigPath } from './lib/impeccable-paths.mjs';
import {
  applySvelteKitLiveAdapter,
  detectSvelteKitProject,
  removeSvelteKitLiveAdapter,
} from './live/sveltekit-adapter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolveLiveConfigPath({ cwd: process.cwd(), scriptsDir: __dirname });
const MARKER_OPEN_TEXT = 'impeccable-live-start';
const MARKER_CLOSE_TEXT = 'impeccable-live-end';
const IGNORE_MARKER_OPEN = '# impeccable-live-ignore-start';
const IGNORE_MARKER_CLOSE = '# impeccable-live-ignore-end';

export const LIVE_IGNORE_PATTERNS = Object.freeze([
  '.impeccable/hook.cache.json',
  '.impeccable/hook.pending.json',
  '.impeccable/config.local.json',
  '.impeccable/live/server.json',
  '.impeccable/live/sessions/',
  '.impeccable/live/previews/',
  '.impeccable/live/annotations/',
  '.impeccable/live/cache/',
  '.impeccable/live/manual-edit-apply-transaction.json',
  '.impeccable/live/manual-edit-events.jsonl',
  '.impeccable/live/manual-edit-evidence/',
  '.impeccable/live/pending-manual-edits.json',
  '.impeccable/live/deferred-svelte-component-accepts.json',
  '.impeccable-live.json',
  '.impeccable-live/',
  'node_modules/.impeccable-live/',
  'src/lib/impeccable/ImpeccableLiveRoot.svelte',
  'src/lib/impeccable/__runtime.js',
  'src/lib/impeccable/[0-9a-f]*/',
]);

/**
 * Hard-excluded directory patterns. These are NEVER user-facing pages and
 * matching them would silently inject tracking scripts into third-party
 * code. The user cannot turn these off via config — they are the floor.
 */
const HARD_EXCLUDES = [
  '**/node_modules/**',
  '**/.git/**',
];

export async function injectCli() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: node live-inject.mjs [options]

Insert or remove the live mode script tag in the project's HTML entry point.
Reads configuration from .impeccable/live/config.json.

Modes:
  --port PORT   Insert script tag pointing at http://localhost:PORT/live.js
  --remove      Remove the script tag (if present)
  --check       Print whether .impeccable/live/config.json exists and its content

Output (JSON):
  { ok, file, inserted|removed, config? }`);
    process.exit(0);
  }

  if (args.includes('--check')) {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log(JSON.stringify({ ok: false, error: 'config_missing', path: CONFIG_PATH }));
      process.exit(0);
    }
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      console.log(JSON.stringify({ ok: false, error: 'config_invalid', message: err.message, path: CONFIG_PATH }));
      return;
    }
    try {
      validateConfig(cfg);
    } catch (err) {
      console.log(JSON.stringify({ ok: false, error: 'config_invalid', message: err.message, path: CONFIG_PATH }));
      return;
    }
    console.log(JSON.stringify({ ok: true, config: cfg, path: CONFIG_PATH }));
    return;
  }

  // Load config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(JSON.stringify({ ok: false, error: 'config_missing', path: CONFIG_PATH }));
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  validateConfig(config);

  const resolvedFiles = resolveFiles(process.cwd(), config);
  const svelteKit = detectSvelteKitProject(process.cwd(), config);

  if (args.includes('--remove')) {
    if (svelteKit) {
      const adapterResult = removeSvelteKitLiveAdapter({ cwd: process.cwd(), config });
      console.log(JSON.stringify({ ok: true, adapter: 'sveltekit', results: [adapterResult] }));
      return;
    }
    const results = resolvedFiles.map((relFile) => {
      const absFile = path.resolve(process.cwd(), relFile);
      if (!fs.existsSync(absFile)) return { file: relFile, error: 'file_not_found' };
      const content = fs.readFileSync(absFile, 'utf-8');
      const detagged = removeTag(content, config.commentSyntax);
      const updated = revertCspMeta(detagged);
      if (updated === content) return { file: relFile, removed: false, note: 'no tag present' };
      fs.writeFileSync(absFile, updated, 'utf-8');
      return {
        file: relFile,
        removed: detagged !== content,
        cspReverted: updated !== detagged,
      };
    });
    console.log(JSON.stringify({ ok: true, results }));
    return;
  }

  // Insert mode — need --port
  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : NaN;
  if (!Number.isFinite(port)) {
    console.error(JSON.stringify({ ok: false, error: 'missing_port' }));
    process.exit(1);
  }
  const gitIgnore = ensureLiveGitIgnores(process.cwd());

  if (svelteKit) {
    const adapterResult = applySvelteKitLiveAdapter({ cwd: process.cwd(), port, config });
    console.log(JSON.stringify({ ok: true, port, adapter: 'sveltekit', gitIgnore, results: [adapterResult] }));
    return;
  }

  const results = resolvedFiles.map((relFile) => {
    const absFile = path.resolve(process.cwd(), relFile);
    if (!fs.existsSync(absFile)) return { file: relFile, error: 'file_not_found' };
    const content = fs.readFileSync(absFile, 'utf-8');
    const withoutOld = revertCspMeta(removeTag(content, config.commentSyntax));
    const withTag = insertTag(withoutOld, config, port, relFile);
    if (withTag === withoutOld) {
      return { file: relFile, error: 'insertion_point_not_found', anchor: config.insertBefore || config.insertAfter };
    }
    const updated = patchCspMeta(withTag, port);
    fs.writeFileSync(absFile, updated, 'utf-8');
    return {
      file: relFile,
      inserted: true,
      cspPatched: updated !== withTag,
    };
  });
  const anyInserted = results.some((r) => r.inserted);
  console.log(JSON.stringify({ ok: anyInserted, port, gitIgnore, results }));
  if (!anyInserted) process.exit(1);
}

export function ensureLiveGitIgnores(cwd = process.cwd()) {
  const target = resolveIgnoreTarget(cwd);
  const existing = fs.existsSync(target.path) ? fs.readFileSync(target.path, 'utf-8') : '';
  const block = [
    IGNORE_MARKER_OPEN,
    ...LIVE_IGNORE_PATTERNS,
    IGNORE_MARKER_CLOSE,
  ].join('\n');
  const markerRe = new RegExp(`${escapeRegExp(IGNORE_MARKER_OPEN)}[\\s\\S]*?${escapeRegExp(IGNORE_MARKER_CLOSE)}`);

  let updated;
  if (markerRe.test(existing)) {
    updated = existing.replace(markerRe, block);
  } else {
    const prefix = existing.length === 0 ? '' : existing.endsWith('\n') ? existing : existing + '\n';
    updated = `${prefix}${prefix.endsWith('\n\n') || prefix === '' ? '' : '\n'}${block}\n`;
  }

  if (updated !== existing) {
    fs.mkdirSync(path.dirname(target.path), { recursive: true });
    fs.writeFileSync(target.path, updated, 'utf-8');
  }

  return {
    file: path.relative(cwd, target.path).split(path.sep).join('/'),
    mode: target.mode,
    changed: updated !== existing,
    patterns: [...LIVE_IGNORE_PATTERNS],
  };
}

function resolveIgnoreTarget(cwd) {
  const gitExcludePath = resolveGitInfoExcludePath(cwd);
  if (gitExcludePath) {
    return { path: gitExcludePath, mode: 'git-info-exclude' };
  }
  return { path: path.join(cwd, '.gitignore'), mode: 'gitignore' };
}

function resolveGitInfoExcludePath(cwd) {
  const dotGit = path.join(cwd, '.git');
  if (!fs.existsSync(dotGit)) return null;

  const stat = fs.statSync(dotGit);
  if (stat.isDirectory()) return path.join(dotGit, 'info', 'exclude');
  if (!stat.isFile()) return null;

  const body = fs.readFileSync(dotGit, 'utf-8').trim();
  const match = body.match(/^gitdir:\s*(.+)$/i);
  if (!match) return null;
  const gitDir = path.isAbsolute(match[1]) ? match[1] : path.resolve(cwd, match[1]);
  return path.join(gitDir, 'info', 'exclude');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveFiles(rootDir, config) {
  const patterns = config.files;
  const userExcludes = Array.isArray(config.exclude) ? config.exclude : [];
  const allExcludes = [...HARD_EXCLUDES, ...userExcludes];
  const excludeRegexes = allExcludes.map(globToRegex);

  const isExcluded = (relPath) => excludeRegexes.some((re) => re.test(relPath));
  const isGlob = (s) => /[*?[]/.test(s);

  const seen = new Set();
  const out = [];
  for (const pat of patterns) {
    if (!isGlob(pat)) {
      if (!seen.has(pat)) {
        seen.add(pat);
        out.push(pat);
      }
      continue;
    }
    let matches;
    try {
      matches = fs.globSync(pat, { cwd: rootDir, withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of matches) {
      if (!ent.isFile || !ent.isFile()) continue;
      const abs = path.join(ent.parentPath || ent.path || rootDir, ent.name);
      const rel = path.relative(rootDir, abs).split(path.sep).join('/');
      if (isExcluded(rel)) continue;
      if (seen.has(rel)) continue;
      seen.add(rel);
      out.push(rel);
    }
  }
  return out;
}

function globToRegex(pattern) {
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      re += '\\' + c;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  return new RegExp('^' + re + '$');
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

function validateConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') throw new Error('config.json must be an object');
  if (!Array.isArray(cfg.files) || cfg.files.length === 0) {
    throw new Error('config.files (non-empty string array) required');
  }
  if (!cfg.files.every((f) => typeof f === 'string' && f.length > 0)) {
    throw new Error('config.files must contain only non-empty strings');
  }
  if (cfg.exclude !== undefined) {
    if (!Array.isArray(cfg.exclude)) {
      throw new Error('config.exclude, if present, must be a string array');
    }
    if (!cfg.exclude.every((f) => typeof f === 'string' && f.length > 0)) {
      throw new Error('config.exclude must contain only non-empty strings');
    }
  }
  if (typeof cfg.insertBefore !== 'string' && typeof cfg.insertAfter !== 'string') {
    throw new Error('config.insertBefore or config.insertAfter (string) required');
  }
  if (cfg.commentSyntax !== 'html' && cfg.commentSyntax !== 'jsx') {
    throw new Error("config.commentSyntax must be 'html' or 'jsx'");
  }
  if (cfg.cspChecked !== undefined && typeof cfg.cspChecked !== 'boolean') {
    throw new Error("config.cspChecked, if present, must be a boolean");
  }
}

function commentOpen(syntax) { return syntax === 'jsx' ? '{/*' : '<!--'; }
function commentClose(syntax) { return syntax === 'jsx' ? '*/}' : '-->'; }

function buildTagBlock(syntax, port, filePath) {
  const open = commentOpen(syntax);
  const close = commentClose(syntax);
  const isAstro = typeof filePath === 'string' && filePath.endsWith('.astro');
  const scriptAttrs = isAstro ? 'is:inline ' : '';
  return (
    open + ' ' + MARKER_OPEN_TEXT + ' ' + close + '\n' +
    '<script ' + scriptAttrs + 'src="http://localhost:' + port + '/live.js"></script>\n' +
    open + ' ' + MARKER_CLOSE_TEXT + ' ' + close + '\n'
  );
}

function detectLineEnding(content) {
  if (content.includes('\r\n')) return '\r\n';
  if (content.includes('\r')) return '\r';
  return '\n';
}

function normalizeLineEndings(content, lineEnding) {
  return lineEnding === '\n' ? content : content.replace(/\n/g, lineEnding);
}

function readLineEndingAt(content, index) {
  if (content[index] === '\r' && content[index + 1] === '\n') return '\r\n';
  if (content[index] === '\n') return '\n';
  if (content[index] === '\r') return '\r';
  return '';
}

function insertTag(content, config, port, filePath) {
  const lineEnding = detectLineEnding(content);
  const block = normalizeLineEndings(buildTagBlock(config.commentSyntax, port, filePath), lineEnding);
  if (config.insertBefore) {
    const idx = content.lastIndexOf(config.insertBefore);
    if (idx === -1) return content;
    return content.slice(0, idx) + block + content.slice(idx);
  }
  const idx = content.indexOf(config.insertAfter);
  if (idx === -1) return content;
  const after = idx + config.insertAfter.length;
  const existingNewline = readLineEndingAt(content, after);
  const prefix = content.slice(0, after) + (existingNewline || lineEnding);
  const rest = content.slice(after + existingNewline.length);
  return prefix + block + rest;
}

function removeTag(content, _syntax) {
  const patterns = [
    /([ \t]*)<!--\s*impeccable-live-start\s*-->[\s\S]*?<!--\s*impeccable-live-end\s*-->([ \t]*(?:\r\n|\n|\r|$)?)/,
    /([ \t]*)\{\/\*\s*impeccable-live-start\s*\*\/\}[\s\S]*?\{\/\*\s*impeccable-live-end\s*\*\/\}([ \t]*(?:\r\n|\n|\r|$)?)/,
  ];
  for (const pat of patterns) {
    let changed = false;
    let next = content;
    do {
      content = next;
      next = content.replace(pat, (_match, leadingIndent, trailing = '') => {
        if (/[\r\n]/.test(trailing)) return leadingIndent;
        return leadingIndent || trailing || '';
      });
      if (next !== content) changed = true;
    } while (next !== content);
    if (changed) return next;
  }
  return content;
}

const CSP_MARKER_ATTR = 'data-impeccable-csp-original';

function findCspMetaTags(content) {
  const out = [];
  const tagRe = /<meta\s+([^>]*?)\/?>/gis;
  let m;
  while ((m = tagRe.exec(content)) !== null) {
    const attrs = m[1];
    if (!/(http-equiv|httpEquiv)\s*=\s*(['"])Content-Security-Policy\2/i.test(attrs)) continue;
    out.push({ start: m.index, end: m.index + m[0].length, full: m[0], attrs });
  }
  return out;
}

function getAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'i');
  const m = attrs.match(re);
  return m ? { quote: m[1], value: m[2], full: m[0] } : null;
}

function appendOriginToDirective(csp, directive, origin) {
  const re = new RegExp(`(^|;)(\\s*)(${directive})\\s+([^;]*)`, 'i');
  const m = csp.match(re);
  if (m) {
    const tokens = m[4].trim().split(/\s+/);
    if (tokens.includes(origin)) return csp;
    return csp.replace(re, `${m[1]}${m[2]}${m[3]} ${[...tokens, origin].join(' ')}`);
  }
  return csp.trim().replace(/;?\s*$/, '') + `; ${directive} 'self' ${origin}`;
}

export function patchCspMeta(content, port) {
  const tags = findCspMetaTags(content);
  if (tags.length === 0) return content;
  const origin = `http://localhost:${port}`;

  let result = content;
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    const attrs = tag.attrs;
    if (getAttr(attrs, CSP_MARKER_ATTR)) continue;
    const contentAttr = getAttr(attrs, 'content');
    if (!contentAttr) continue;

    const original = contentAttr.value;
    let patched = original;
    patched = appendOriginToDirective(patched, 'script-src', origin);
    patched = appendOriginToDirective(patched, 'connect-src', origin);
    patched = appendOriginToDirective(patched, 'img-src', 'blob:');
    if (patched === original) continue;

    const newContentAttr = `content=${contentAttr.quote}${patched}${contentAttr.quote}`;
    const marker = `${CSP_MARKER_ATTR}="${Buffer.from(original, 'utf-8').toString('base64')}"`;
    const trailingWs = (attrs.match(/[ \t]*$/) || [''])[0];
    const attrsBody = attrs.slice(0, attrs.length - trailingWs.length);
    const newAttrs = attrsBody.replace(contentAttr.full, newContentAttr) + ' ' + marker + trailingWs;
    const newTag = tag.full.replace(attrs, newAttrs);

    result = result.slice(0, tag.start) + newTag + result.slice(tag.end);
  }
  return result;
}

export function revertCspMeta(content) {
  const tags = findCspMetaTags(content);
  if (tags.length === 0) return content;

  let result = content;
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    const origAttr = getAttr(tag.attrs, CSP_MARKER_ATTR);
    if (!origAttr) continue;
    const contentAttr = getAttr(tag.attrs, 'content');
    if (!contentAttr) continue;

    let originalValue;
    try { originalValue = Buffer.from(origAttr.value, 'base64').toString('utf-8'); }
    catch { continue; }

    const newContentAttr = `content=${contentAttr.quote}${originalValue}${contentAttr.quote}`;
    let newAttrs = tag.attrs.replace(contentAttr.full, newContentAttr);
    newAttrs = newAttrs.replace(new RegExp(`\\s*${origAttr.full}`), '');
    const newTag = tag.full.replace(tag.attrs, newAttrs);

    result = result.slice(0, tag.start) + newTag + result.slice(tag.end);
  }
  return result;
}

const _running = process.argv[1];
if (_running?.endsWith('live-inject.mjs') || _running?.endsWith('live-inject.mjs/')) {
  injectCli();
}

export { insertTag, removeTag, validateConfig, buildTagBlock };
