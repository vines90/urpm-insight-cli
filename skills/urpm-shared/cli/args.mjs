/**
 * 极简参数解析: 支持 --key=value, --key value, --flag, 位置参数
 *
 * 使用约定: 写操作类命令默认 dryRun, 需 --yes 确认
 */

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        const key = arg.slice(2, eq);
        flags[key] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
    i++;
  }
  return { positional, flags };
}

export function pickFields(flags, fieldNames) {
  const out = {};
  for (const name of fieldNames) {
    if (flags[name] !== undefined) {
      out[name] = coerce(flags[name]);
    }
  }
  return out;
}

function coerce(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
    try { return JSON.parse(value); } catch (_) { /* keep string */ }
  }
  return value;
}

export function requireArg(value, name) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`缺少必填参数: ${name}`);
  }
  return value;
}

export function shouldExecute(flags) {
  if (flags['dry-run']) return false;
  if (flags.yes || flags.y) return true;
  return false;
}

export function getFormat(flags) {
  if (flags.json) return 'json';
  if (flags.tsv) return 'tsv';
  if (flags.format) return flags.format;
  return 'table';
}
