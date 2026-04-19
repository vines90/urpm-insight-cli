/**
 * 输出格式化: json / table / tsv / yaml-lite
 */

function truncate(value, max = 60) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function asString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function printJSON(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export function printTSV(rows, columns) {
  if (!rows || rows.length === 0) {
    process.stderr.write('(empty)\n');
    return;
  }
  const cols = columns || Object.keys(rows[0]);
  process.stdout.write(cols.join('\t') + '\n');
  for (const r of rows) {
    process.stdout.write(cols.map((c) => asString(r[c]).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t') + '\n');
  }
}

export function printTable(rows, columns, { maxColWidth = 40 } = {}) {
  if (!rows || rows.length === 0) {
    process.stderr.write('(empty)\n');
    return;
  }
  const cols = columns || Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.min(maxColWidth, Math.max(c.length, ...rows.map((r) => asString(r[c]).length)))
  );

  const fmt = (parts) =>
    parts.map((p, i) => truncate(asString(p), widths[i]).padEnd(widths[i])).join('  ');

  process.stdout.write(fmt(cols) + '\n');
  process.stdout.write(widths.map((w) => '-'.repeat(w)).join('  ') + '\n');
  for (const r of rows) {
    process.stdout.write(fmt(cols.map((c) => r[c])) + '\n');
  }
  process.stderr.write(`\n(${rows.length} rows)\n`);
}

/**
 * 统一渲染入口
 *
 * format: 'json' | 'table' | 'tsv' | 'raw'
 * 数据约定:
 *   - 列表: { rows: [...], columns?: [...] }
 *   - 单条: { item: {...} }
 *   - 任意: { raw: ... }
 */
export function render({ rows, columns, item, raw }, { format = 'table', summary } = {}) {
  if (format === 'json') {
    if (rows !== undefined) printJSON(rows);
    else if (item !== undefined) printJSON(item);
    else printJSON(raw);
    return;
  }
  if (format === 'tsv') {
    if (rows) printTSV(rows, columns);
    else if (item) printTSV([item], columns || Object.keys(item));
    else printJSON(raw);
    return;
  }
  if (rows) {
    printTable(rows, columns);
    if (summary) process.stderr.write(`${summary}\n`);
    return;
  }
  if (item) {
    const entries = Object.entries(item);
    const keyW = Math.max(...entries.map(([k]) => k.length));
    for (const [k, v] of entries) {
      process.stdout.write(`${k.padEnd(keyW)}  ${truncate(asString(v), 200)}\n`);
    }
    return;
  }
  printJSON(raw);
}

export function printError(message, { details } = {}) {
  process.stderr.write(`✗ ${message}\n`);
  if (details) process.stderr.write(`  ${typeof details === 'string' ? details : JSON.stringify(details)}\n`);
}

export function printSuccess(message) {
  process.stderr.write(`✓ ${message}\n`);
}
