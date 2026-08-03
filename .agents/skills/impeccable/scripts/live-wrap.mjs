import fs from 'node:fs';
import path from 'node:path';
import { isGeneratedFile } from './lib/is-generated.mjs';
import { readBuffer as readManualEditsBuffer } from './live/manual-edits-buffer.mjs';
import {
  buildSvelteComponentCssAuthoring,
  scaffoldSvelteComponentSession,
  shouldUseSvelteComponentInjection,
} from './live/svelte-component.mjs';

const EXTENSIONS = ['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'];

export async function wrapCli() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: impeccable wrap [options]

Find an element in source and wrap it in a variant container.

Required:
  --id ID            Session ID for the variant wrapper
  --count N          Number of expected variants (1-8)

Element identification (at least one required):
  --element-id ID    HTML id attribute of the element
  --classes A,B,C    Comma- or space-separated CSS class names
  --tag TAG          Tag name (div, section, etc.)
  --query TEXT       Fallback: raw text to search for

Optional:
  --file PATH        Source file to search in (skips auto-detection)
  --text TEXT        Picked element's textContent. Used to disambiguate when
                     classes/tag match multiple sibling elements (e.g. a list
                     of <Card>s with the same className). Pass the first ~80
                     chars of event.element.textContent.
  --page-url URL     Current page URL. Required when pending manual edits may
                     affect the picked source block. Pending edits are filtered
                     to this page so an edit on /a doesn't bleed into /b.
  --help             Show this help message

Output (JSON):
  { file, startLine, endLine, insertLine, commentSyntax }

The agent should insert variant HTML at insertLine.`);
    process.exit(0);
  }

  const id = argVal(args, '--id');
  const count = parseInt(argVal(args, '--count') || '3');
  const elementId = argVal(args, '--element-id');
  const classes = argVal(args, '--classes');
  const tag = argVal(args, '--tag');
  const query = argVal(args, '--query');
  const filePath = argVal(args, '--file');
  const text = argVal(args, '--text');
  const pageUrl = argVal(args, '--page-url');

  if (!id) { console.error('Missing --id'); process.exit(1); }
  if (!elementId && !classes && !query) {
    console.error('Need at least one of: --element-id, --classes, --query');
    process.exit(1);
  }

  const queries = buildSearchQueries(elementId, classes, tag, query);
  const genOpts = { cwd: process.cwd() };

  let targetFile = filePath;
  let matchedQuery = null;
  if (!targetFile) {
    for (const q of queries) {
      targetFile = findFileWithQuery(q, process.cwd(), genOpts);
      if (targetFile) { matchedQuery = q; break; }
    }
    if (!targetFile) {
      let generatedHit = null;
      for (const q of queries) {
        generatedHit = findFileWithQuery(q, process.cwd(), { ...genOpts, includeGenerated: true });
        if (generatedHit) break;
      }
      if (generatedHit) {
        console.error(JSON.stringify({
          error: 'element_not_in_source',
          fallback: 'agent-driven',
          generatedMatch: path.relative(process.cwd(), generatedHit),
          hint: 'Element found only in a generated file. See "Handle fallback" in live.md.',
        }));
      } else {
        console.error(JSON.stringify({
          error: 'element_not_found',
          fallback: 'agent-driven',
          hint: 'Element not found in any project file. It may be runtime-injected (JS component, etc.). See "Handle fallback" in live.md.',
        }));
      }
      process.exit(1);
    }
  } else {
    if (isGeneratedFile(targetFile, genOpts)) {
      console.error(JSON.stringify({
        error: 'file_is_generated',
        fallback: 'agent-driven',
        file: path.relative(process.cwd(), path.resolve(process.cwd(), targetFile)),
        hint: 'Explicit --file points at a generated file. Writing here gets wiped by the next build. See "Handle fallback" in live.md.',
      }));
      process.exit(1);
    }
    matchedQuery = queries[0];
  }

  const content = fs.readFileSync(targetFile, 'utf-8');
  const lines = content.split('\n');

  let match = null;
  if (text) {
    const candidates = [];
    for (const q of queries) {
      const all = findAllElements(lines, q, tag);
      for (const c of all) {
        if (!candidates.some((x) => x.startLine === c.startLine)) {
          candidates.push(c);
        }
      }
      if (candidates.length === 1) break;
    }
    if (candidates.length === 0) {
      console.error(JSON.stringify({ error: 'Found file but could not locate element in ' + targetFile + '. Searched for: ' + queries.join(', ') }));
      process.exit(1);
    }
    if (candidates.length === 1) {
      match = candidates[0];
    } else {
      const filtered = filterByText(candidates, lines, text);
      if (filtered.length === 1) {
        match = filtered[0];
      } else if (filtered.length === 0) {
        match = candidates[0];
      } else {
        console.error(JSON.stringify({
          error: 'element_ambiguous',
          fallback: 'agent-driven',
          file: path.relative(process.cwd(), targetFile),
          candidates: filtered.map((c) => ({
            startLine: c.startLine + 1,
            endLine: c.endLine + 1,
          })),
          hint: 'Multiple source elements match both classes/tag and textContent. Pass --element-id, a more specific --text, or write the wrapper manually. See "Handle fallback" in live.md.',
        }));
        process.exit(1);
      }
    }
  } else {
    for (const q of queries) {
      match = findElement(lines, q, tag);
      if (match) break;
    }
    if (!match) {
      console.error(JSON.stringify({ error: 'Found file but could not locate element in ' + targetFile + '. Searched for: ' + queries.join(', ') }));
      process.exit(1);
    }
  }

  const { startLine, endLine } = match;
  const commentSyntax = detectCommentSyntax(targetFile);
  const styleMode = detectStyleMode(targetFile);
  const isJsx = commentSyntax.open === '{/*';
  const indent = lines[startLine].match(/^(\s*)/)[1];
  let originalLines = lines.slice(startLine, endLine + 1);
  let pendingBuffer = { entries: [] };
  try { pendingBuffer = readManualEditsBuffer(process.cwd()); } catch { }
  const pendingEntriesForTarget = pageUrl
    ? []
    : pendingEntriesThatMayAffectWrap(pendingBuffer.entries, targetFile, originalLines, startLine, process.cwd());
  if (pendingEntriesForTarget.length > 0) {
    console.error(JSON.stringify({
      error: 'missing_page_url_with_pending_edits',
      pendingEntries: pendingEntriesForTarget.length,
      hint: 'Pending manual edits may affect the selected source block. Pass --page-url=$event.pageUrl so the wrap block reflects the user\'s staged DOM.',
    }));
    process.exit(1);
  }
  if (pageUrl) {
    const failedBufferedOps = [];
    for (const entry of pendingBuffer.entries || []) {
      if (entry.pageUrl !== pageUrl) continue;
      for (const op of entry.ops || []) {
        const mayAffectWrap = manualEditMayAffectWrap(op, targetFile, originalLines, startLine, process.cwd());
        const result = applyBufferedManualEditToLines(originalLines, startLine, op);
        if (result.changed) {
          originalLines = result.lines;
          continue;
        }
        if (!mayAffectWrap) continue;
        failedBufferedOps.push({
          entryId: entry.id,
          ref: op?.ref || null,
          originalText: op?.originalText || null,
          reason: 'ambiguous_or_unmatched_pending_edit',
        });
      }
    }
    if (failedBufferedOps.length > 0) {
      console.error(JSON.stringify({
        error: 'manual_edit_buffer_apply_failed',
        pendingOps: failedBufferedOps,
        hint: 'A staged copy edit appears to affect the selected source block, but could not be applied unambiguously to the wrap original. Apply or discard copy edits first, or write the wrapper manually.',
      }));
      process.exit(1);
    }
  }

  const originalBaseIndent = minLeadingSpaces(originalLines);
  const reindentOriginal = (extra) => originalLines
    .map((l) => (l.trim() === '' ? '' : indent + extra + l.slice(originalBaseIndent)))
    .join('\n');
  const originalIndented = reindentOriginal('    ');
  const relTargetFile = path.relative(process.cwd(), targetFile).split(path.sep).join('/');
  const useSvelteComponent = shouldUseSvelteComponentInjection(targetFile);
  const styleContents = isJsx ? 'style={{ display: "contents" }}' : 'style="display: contents"';
  const wrapperLines = isJsx ? [
    indent + '<div data-impeccable-variants="' + id + '" data-impeccable-variant-count="' + count + '" ' + styleContents + '>',
    indent + '  ' + commentSyntax.open + ' impeccable-variants-start ' + id + ' ' + commentSyntax.close,
    indent + '  ' + commentSyntax.open + ' Original ' + commentSyntax.close,
    indent + '  <div data-impeccable-variant="original">',
    reindentOriginal('    '),
    indent + '  </div>',
    indent + '  ' + commentSyntax.open + ' Variants: insert below this line ' + commentSyntax.close,
    indent + '  ' + commentSyntax.open + ' impeccable-variants-end ' + id + ' ' + commentSyntax.close,
    indent + '</div>',
  ] : [
    indent + commentSyntax.open + ' impeccable-variants-start ' + id + ' ' + commentSyntax.close,
    indent + '<div data-impeccable-variants="' + id + '" data-impeccable-variant-count="' + count + '" ' + styleContents + '>',
    indent + '  ' + commentSyntax.open + ' Original ' + commentSyntax.close,
    indent + '  <div data-impeccable-variant="original">',
    originalIndented,
    indent + '  </div>',
    indent + '  ' + commentSyntax.open + ' Variants: insert below this line ' + commentSyntax.close,
    indent + '</div>',
    indent + commentSyntax.open + ' impeccable-variants-end ' + id + ' ' + commentSyntax.close,
  ];

  let outputFile = targetFile;
  let outputLines;
  let outputStartLine = startLine + 1;
  let outputEndLine = startLine + wrapperLines.length + (originalLines.length - 1);
  let insertLine;
  let svelteSession = null;

  if (useSvelteComponent) {
    svelteSession = scaffoldSvelteComponentSession({
      id,
      count,
      sourceFile: relTargetFile,
      sourceStartLine: startLine + 1,
      sourceEndLine: endLine + 1,
      originalLines,
      cwd: process.cwd(),
    });
    outputFile = path.resolve(process.cwd(), svelteSession.manifestFile);
    outputStartLine = 1;
    outputEndLine = 1;
    insertLine = 1;
  } else {
    const newLines = [
      ...lines.slice(0, startLine),
      ...wrapperLines,
      ...lines.slice(endLine + 1),
    ];
    fs.writeFileSync(targetFile, newLines.join('\n'), 'utf-8');
    insertLine = startLine + 6 + (originalLines.length - 1) + 1;
  }

  const outputRelFile = path.relative(process.cwd(), outputFile).split(path.sep).join('/');

  const svelteComponentAuthoring = useSvelteComponent ? buildSvelteComponentCssAuthoring(count) : null;

  console.log(JSON.stringify({
    file: outputRelFile,
    sourceFile: useSvelteComponent ? relTargetFile : undefined,
    previewMode: useSvelteComponent ? 'svelte-component' : undefined,
    componentDir: svelteSession?.componentDir,
    propContract: svelteSession?.propContract,
    sourceStartLine: useSvelteComponent ? startLine + 1 : undefined,
    sourceEndLine: useSvelteComponent ? endLine + 1 : undefined,
    startLine: outputStartLine,
    endLine: outputEndLine,
    insertLine,
    commentSyntax: commentSyntax,
    styleMode: useSvelteComponent ? 'svelte-component' : styleMode.mode,
    styleTag: useSvelteComponent ? null : styleMode.styleTag,
    cssSelectorPrefixExamples: useSvelteComponent ? [] : buildCssSelectorPrefixExamples(styleMode.mode, count),
    cssAuthoring: useSvelteComponent ? svelteComponentAuthoring : buildCssAuthoring(styleMode, count),
    originalLineCount: originalLines.length,
  }));
}

function argVal(args, flag) {
  const prefix = flag + '=';
  for (const arg of args) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

function pendingEntriesThatMayAffectWrap(entries, targetFile, originalLines, selectionStartLine, cwd) {
  const targetAbs = path.resolve(cwd, targetFile);
  return (entries || []).filter((entry) => {
    return (entry.ops || []).some((op) => {
      return manualEditMayAffectWrap(op, targetAbs, originalLines, selectionStartLine, cwd);
    });
  });
}

function manualEditMayAffectWrap(op, targetFile, originalLines, selectionStartLine, cwd) {
  const targetAbs = path.resolve(cwd, targetFile);
  if (manualEditHintFallsInsideSelection(op, targetAbs, originalLines, selectionStartLine, cwd)) return true;
  if (manualEditLocatorMatchesSelection(op, originalLines)) return true;
  if (typeof op?.originalText === 'string' && op.originalText.length > 0) {
    return originalLines.join('\n').includes(op.originalText);
  }
  return false;
}

function manualEditHintFallsInsideSelection(op, targetAbs, originalLines, selectionStartLine, cwd) {
  const hintFile = op?.sourceHint?.file;
  const hintedLine = Number(op?.sourceHint?.line);
  if (!hintFile || !Number.isFinite(hintedLine)) return false;
  const hintAbs = path.isAbsolute(hintFile) ? hintFile : path.resolve(cwd, hintFile);
  if (path.resolve(hintAbs) !== targetAbs) return false;
  const hintedIndex = hintedLine - 1 - selectionStartLine;
  return hintedIndex >= 0
    && hintedIndex < originalLines.length
    && typeof op?.originalText === 'string'
    && originalLines[hintedIndex].includes(op.originalText);
}

function manualEditLocatorMatchesSelection(op, originalLines) {
  if (!op || typeof op.originalText !== 'string' || op.originalText.length === 0) return false;
  return originalLines.some((line) => (
    line.includes(op.originalText) && lineMatchesManualEditLocator(line, op)
  ));
}

function applyBufferedManualEditToLines(originalLines, selectionStartLine, op) {
  if (
    !op
    || typeof op.originalText !== 'string'
    || op.originalText.length === 0
    || typeof op.newText !== 'string'
  ) {
    return { lines: originalLines, changed: false };
  }

  const replaceLine = (lineIndex) => ({
    lines: originalLines.map((line, index) => (
      index === lineIndex ? replaceOnce(line, op.originalText, op.newText) : line
    )),
    changed: true,
  });

  const hintedLine = Number(op.sourceHint?.line);
  if (Number.isFinite(hintedLine)) {
    const hintedIndex = hintedLine - 1 - selectionStartLine;
    if (hintedIndex >= 0 && hintedIndex < originalLines.length && originalLines[hintedIndex].includes(op.originalText)) {
      return replaceLine(hintedIndex);
    }
  }

  const locatorMatches = [];
  for (let index = 0; index < originalLines.length; index += 1) {
    const line = originalLines[index];
    if (!line.includes(op.originalText)) continue;
    if (!lineMatchesManualEditLocator(line, op)) continue;
    locatorMatches.push(index);
  }
  if (locatorMatches.length === 1) return replaceLine(locatorMatches[0]);

  const originalBlock = originalLines.join('\n');
  if (countOccurrences(originalBlock, op.originalText) === 1) {
    return {
      lines: replaceOnce(originalBlock, op.originalText, op.newText).split('\n'),
      changed: true,
    };
  }

  return { lines: originalLines, changed: false };
}

function lineMatchesManualEditLocator(line, op) {
  if (op.tag) {
    const tagRe = new RegExp('<\\s*' + escapeRegExp(op.tag) + '(?=[\\s>/]|$)', 'i');
    if (!tagRe.test(line)) return false;
  }

  if (op.elementId) {
    const id = escapeRegExp(op.elementId);
    const idRe = new RegExp('\\bid\\s*=\\s*["\']' + id + '["\']');
    if (!idRe.test(line)) return false;
  }

  const classes = Array.isArray(op.classes) ? op.classes.filter(Boolean) : [];
  for (const className of classes) {
    if (!line.includes(className)) return false;
  }

  return true;
}

function replaceOnce(value, needle, replacement) {
  const index = value.indexOf(needle);
  if (index === -1) return value;
  return value.slice(0, index) + replacement + value.slice(index + needle.length);
}

function countOccurrences(value, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    index = value.indexOf(needle, index);
    if (index === -1) return count;
    count += 1;
    index += needle.length;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchQueries(elementId, classes, tag, query) {
  const queries = [];
  if (elementId) {
    queries.push('id="' + elementId + '"');
  }

  if (classes) {
    const classList = splitClassList(classes);
    if (classList.length > 1) {
      const joined = classList.join(' ');
      const sorted = [...classList].sort((a, b) => b.length - a.length);
      queries.push('class="' + joined + '"');
      queries.push('className="' + joined + '"');
      for (const className of sorted) {
        queries.push(className);
      }
    } else if (classList.length === 1) {
      queries.push(classList[0]);
    }
  }

  // 3. Tag + class combo (e.g., <section class="hero">).
  // Same dual-emit for JSX compatibility.
  if (tag && classes) {
    const firstClass = splitClassList(classes)[0];
    queries.push('<' + tag + ' class="' + firstClass);
    queries.push('<' + tag + ' className="' + firstClass);
  }

  // 4. Raw fallback query
  if (query) {
    queries.push(query);
  }

  return queries;
}

function splitClassList(classes) {
  return String(classes).split(/[,\s]+/).map(c => c.trim()).filter(Boolean);
}

function attrEscapeDouble(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detectCommentSyntax(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jsx' || ext === '.tsx') {
    return { open: '{/*', close: '*/}' };
  }
  return { open: '<!--', close: '-->' };
}

function detectStyleMode(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.astro') {
    return {
      mode: 'astro-global-prefixed',
      styleTag: '<style is:inline data-impeccable-css="SESSION_ID">',
    };
  }
  return {
    mode: 'scoped',
    styleTag: '<style data-impeccable-css="SESSION_ID">',
  };
}

function buildCssSelectorPrefixExamples(styleMode, count) {
  if (styleMode !== 'astro-global-prefixed') return [];
  return Array.from({ length: count }, (_, i) => `[data-impeccable-variant="${i + 1}"]`);
}

function buildCssAuthoring(styleMode, count) {
  const variantNumbers = Array.from({ length: count }, (_, i) => i + 1);
  if (styleMode.mode === 'astro-global-prefixed') {
    return {
      mode: styleMode.mode,
      styleTag: styleMode.styleTag,
      strategy: 'global-prefixed',
      rulePattern: '[data-impeccable-variant="N"] > .variant-class { ... }',
      selectorExamples: variantNumbers.map((n) => `[data-impeccable-variant="${n}"] > .variant-class`),
      requirements: [
        'Use the styleTag exactly; the is:inline attribute is required for this file.',
        'Put raw CSS directly between the styleTag opening and a plain </style> close.',
        'Prefix every preview selector with the matching [data-impeccable-variant="N"] selector.',
        'Keep selectors anchored to the generated variant wrapper; do not rely on component CSS scoping for preview rules.',
      ],
      forbidden: [
        'Do not use @scope for this styleMode.',
        'Do not wrap style content in a JSX/TSX template literal ({` ... `}); that syntax is for .tsx/.jsx only.',
        'Do not put { immediately after the style opening tag; Astro parses { as expression syntax.',
      ],
    };
  }
  return {
    mode: styleMode.mode,
    styleTag: styleMode.styleTag,
    strategy: 'scope-rule',
    rulePattern: '@scope ([data-impeccable-variant="N"]) { :scope > .variant-class { ... } }',
    selectorExamples: variantNumbers.map((n) => `@scope ([data-impeccable-variant="${n}"]) { :scope > .variant-class { ... } }`),
    requirements: [
      'Use @scope blocks keyed to each [data-impeccable-variant="N"] wrapper.',
      'Inside each @scope block, make :scope rules step into the replacement element with a descendant combinator.',
      'Use the styleTag exactly; do not add framework-specific style attributes unless this object says to.',
    ],
    forbidden: [
      'Do not use global [data-impeccable-variant="N"] selector prefixes for this styleMode.',
      'Do not add is:inline to the style tag for this styleMode.',
    ],
  };
}
function findFileWithQuery(query, cwd, genOpts = {}) {
  const searchDirs = ['src', 'app', 'pages', 'components', 'public', 'views', 'templates', '.'];
  const seen = new Set();

  for (const dir of searchDirs) {
    const absDir = path.join(cwd, dir);
    if (!fs.existsSync(absDir)) continue;
    const result = searchDir(absDir, query, seen, 0, genOpts);
    if (result) return result;
  }
  return null;
}

function searchDir(dir, query, seen, depth, genOpts) {
  if (depth > 5) return null; // don't go too deep
  const realDir = fs.realpathSync(dir);
  if (seen.has(realDir)) return null;
  seen.add(realDir);

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return null; }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;

    const filePath = path.join(dir, entry.name);
    if (!genOpts.includeGenerated && isGeneratedFile(filePath, genOpts)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(query)) return filePath;
    } catch { /* skip unreadable files */ }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const result = searchDir(path.join(dir, entry.name), query, seen, depth + 1, genOpts);
    if (result) return result;
  }

  return null;
}

const OPENER_RE = /<([A-Za-z][A-Za-z0-9]*)(?=[\s/>]|$)/;
function minLeadingSpaces(lines) {
  let min = Infinity;
  for (const l of lines) {
    if (l.trim() === '') continue;
    const m = l.match(/^(\s*)/);
    if (m && m[1].length < min) min = m[1].length;
  }
  return min === Infinity ? 0 : min;
}

function findElement(lines, query, tag = null) {
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(query)) continue;

    const stripped = lines[i].trim();
    if (stripped.startsWith('<!--') || stripped.startsWith('{/*') || stripped.startsWith('//')) continue;
    if (lines[i].includes('data-impeccable-variant')) continue;

    const openerLine = findOpenerLine(lines, i, tag);
    if (openerLine === -1) continue;

    const endLine = findClosingLine(lines, openerLine);
    return { startLine: openerLine, endLine };
  }

  return null;
}

function findAllElements(lines, query, tag = null) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(query)) continue;
    const stripped = lines[i].trim();
    if (stripped.startsWith('<!--') || stripped.startsWith('{/*') || stripped.startsWith('//')) continue;
    if (lines[i].includes('data-impeccable-variant')) continue;
    const openerLine = findOpenerLine(lines, i, tag);
    if (openerLine === -1) continue;
    if (seen.has(openerLine)) continue; // multiple matches inside the same element
    seen.add(openerLine);
    const endLine = findClosingLine(lines, openerLine);
    out.push({ startLine: openerLine, endLine });
  }
  return out;
}

function filterByText(candidates, lines, text) {
  const trimmed = text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80);
  if (trimmed.length < 8) return [];
  const targetSpaced = trimmed;
  const targetCompact = trimmed.replace(/\s+/g, '');

  return candidates.filter((c) => {
    const body = lines.slice(c.startLine, c.endLine + 1).join(' ');
    const inner = body
      .replace(/<[^>]*>/g, ' ')   // strip HTML/JSX tags
      .replace(/\{[^}]*\}/g, ' ')  // strip JSX expressions
      .toLowerCase();
    const sourceSpaced = inner.replace(/\s+/g, ' ').trim();
    const sourceCompact = inner.replace(/\s+/g, '');
    return sourceSpaced.includes(targetSpaced) || sourceCompact.includes(targetCompact);
  });
}

function findOpenerLine(lines, matchLine, tag) {
  const self = lines[matchLine].match(OPENER_RE);
  if (self) {
    if (!tag || self[1] === tag) return matchLine;
    return -1;
  }
  const MAX_BACKWALK = 10;
  for (let i = matchLine - 1; i >= Math.max(0, matchLine - MAX_BACKWALK); i--) {
    const opener = lines[i].match(OPENER_RE);
    if (!opener) continue;
    if (!tag || opener[1] === tag) return i;
    return -1;
  }
  return -1;
}

function findClosingLine(lines, start) {
  const openMatch = lines[start].match(OPENER_RE);
  if (!openMatch) return start;

  const tagName = openMatch[1];
  let depth = 0;
  const openRe = new RegExp('<' + tagName + '(?=[\\s/>]|$)', 'g');
  const selfCloseRe = new RegExp('<' + tagName + '[^>]*/>', 'g');
  const closeRe = new RegExp('</' + tagName + '\\s*>', 'g');

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(openRe) || []).length;
    const selfCloses = (line.match(selfCloseRe) || []).length;
    const closes = (line.match(closeRe) || []).length;

    depth += opens - selfCloses - closes;

    if (depth <= 0) return i;
  }
  return Math.min(start + 50, lines.length - 1);
}

const _running = process.argv[1];
if (_running?.endsWith('live-wrap.mjs') || _running?.endsWith('live-wrap.mjs/')) {
  wrapCli();
}

export {
  buildSearchQueries,
  findElement,
  findClosingLine,
  detectCommentSyntax,
  findAllElements,
  filterByText,
  findFileWithQuery,
  detectStyleMode,
  buildCssAuthoring,
  buildCssSelectorPrefixExamples,
};
