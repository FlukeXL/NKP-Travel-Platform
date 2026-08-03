import { runHook, writeAuditLog } from './hook-lib.mjs';

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

async function main() {
  const inheritedEnv = { ...process.env };
  process.env.IMPECCABLE_HOOK_DEPTH = process.env.IMPECCABLE_HOOK_DEPTH || '1';

  let stdinJson = '';
  try { stdinJson = await readStdin(); } catch { /* fall through */ }

  const result = await runHook({
    stdinJson,
    env: inheritedEnv,
    cwd: process.cwd(),
  });

  writeAuditLog(process.env, result.audit, process.cwd());

  if (result.stdout) process.stdout.write(result.stdout);
  process.exit(result.exitCode || 0);
}

main().catch((err) => {
  try {
    writeAuditLog(process.env, {
      ts: new Date().toISOString(),
      event: 'PostToolUse',
      error: String(err && err.message ? err.message : err),
    });
  } catch { /* swallow */ }
  if (process.env.IMPECCABLE_HOOK_DEBUG) {
    process.stderr.write(`[impeccable-hook] ${err}\n`);
  }
  process.exit(0);
});
