/**
 * 鉴权 HTTP 客户端
 */
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { ensureToken } from './auth.mjs';
import { getEnv, getBaseUrl } from './config.mjs';

function buildQuery(params) {
  if (!params) return '';
  const cleaned = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return cleaned.length ? `?${cleaned.join('&')}` : '';
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return await res.text();
}

/**
 * 通用请求, 自动注入 Bearer token
 *
 * options:
 *   method, query, body, headers, env, raw, formData
 *   anonymous=true 时不带 JWT（仅用于后端已放行的公开 GET，如 /api/insight/health）
 *   raw=true 时直接返回原始 Response
 */
export async function request(pathname, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    env,
    raw = false,
    formData,
    anonymous = false
  } = options;

  let baseUrl;
  let token;
  if (anonymous) {
    baseUrl = getBaseUrl(getEnv(env));
  } else {
    const t = await ensureToken({ env });
    baseUrl = t.baseUrl;
    token = t.token;
  }

  const url = `${baseUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}${buildQuery(query)}`;

  const finalHeaders = {
    Accept: 'application/json',
    ...headers
  };
  if (!anonymous && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers: finalHeaders, body: payload });

  if (raw) return res;

  const data = await parseResponse(res);
  if (!res.ok) {
    const message =
      (typeof data === 'object' && (data?.error || data?.message)) ||
      (typeof data === 'string' && data) ||
      `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    err.url = url;
    throw err;
  }

  return data;
}

/**
 * 上传文件 (multipart/form-data)
 *
 * fileSpecs: [{ field, filePath }] 或 [{ field, buffer, filename, contentType }]
 * fields: { key: value } 普通文本字段
 */
export async function upload(pathname, { fileSpecs = [], fields = {}, method = 'POST', env } = {}) {
  const form = new FormData();

  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  }

  for (const spec of fileSpecs) {
    let buffer, filename, contentType;
    if (spec.filePath) {
      const abs = path.resolve(spec.filePath);
      buffer = fs.readFileSync(abs);
      filename = spec.filename || path.basename(abs);
      contentType = spec.contentType || guessContentType(filename);
    } else {
      buffer = spec.buffer;
      filename = spec.filename || 'file';
      contentType = spec.contentType || 'application/octet-stream';
    }
    const blob = new Blob([buffer], { type: contentType });
    form.append(spec.field, blob, filename);
  }

  return request(pathname, { method, formData: form, env });
}

function guessContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return map[ext] || 'application/octet-stream';
}
