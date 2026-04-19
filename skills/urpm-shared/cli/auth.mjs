/**
 * 登录、token 管理
 */
import readline from 'node:readline';
import { Buffer } from 'node:buffer';
import {
  getEnv,
  getBaseUrl,
  getEnvCredentials,
  setEnvCredentials,
  clearCredentials
} from './config.mjs';

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * 密码输入：不能用 readline + 同时 stdin.on('data')，会抢 stdin 导致卡住。
 * TTY 下用 raw mode 读一行；非 TTY（管道）则退化为普通 question（会回显）。
 */
function promptPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (!stdin.isTTY) {
      stdout.write('(非交互终端，密码将回显；建议改用 URPM_PASSWORD 环境变量)\n');
      return prompt(question).then(resolve);
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let pass = '';
    const cleanup = () => {
      try {
        stdin.setRawMode(false);
      } catch (_) {
        /* ignore */
      }
      stdin.removeListener('data', onData);
    };

    const onData = (chunk) => {
      const s = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      for (const c of s) {
        if (c === '\n' || c === '\r') {
          cleanup();
          stdout.write('\n');
          resolve(pass);
          return;
        }
        if (c === '\u0004') {
          /* Ctrl+D EOF */
          cleanup();
          stdout.write('\n');
          resolve(pass);
          return;
        }
        if (c === '\u0003') {
          cleanup();
          stdout.write('\n');
          process.exit(130);
        }
        if (c === '\u007f' || c === '\b') {
          if (pass.length > 0) {
            pass = pass.slice(0, -1);
            stdout.write('\b \b');
          }
        } else if (c >= ' ' || c === '\t') {
          pass += c;
          stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

function decodeJwtExpiry(token) {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return json.exp ? json.exp * 1000 : null;
  } catch (_) {
    return null;
  }
}

/**
 * 执行登录, 返回 { token, user }
 */
export async function login({ env, username, password } = {}) {
  const finalEnv = getEnv(env);
  const baseUrl = getBaseUrl(finalEnv);

  const u =
    username ||
    process.env.URPM_USERNAME ||
    (await prompt(`URPM 用户名/邮箱 [${finalEnv}]: `));
  const p =
    password ||
    process.env.URPM_PASSWORD ||
    (await promptPassword('URPM 密码: '));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  });

  let body;
  try {
    body = await res.json();
  } catch (_) {
    throw new Error(`登录失败: HTTP ${res.status}`);
  }

  if (!res.ok || !body.success) {
    throw new Error(body.error || body.message || `登录失败: HTTP ${res.status}`);
  }

  const token = body.data?.token;
  const user = body.data?.user;
  if (!token) throw new Error('登录响应缺少 token');

  const expiresAt = decodeJwtExpiry(token);
  setEnvCredentials(finalEnv, {
    token,
    user,
    username: u,
    savedAt: Date.now(),
    expiresAt
  });

  return { env: finalEnv, baseUrl, token, user, expiresAt };
}

/**
 * 拿到当前 env 的有效 token, 自动检查是否过期
 */
export async function ensureToken({ env, autoLogin = false } = {}) {
  const finalEnv = getEnv(env);
  const cred = getEnvCredentials(finalEnv);

  if (cred?.token) {
    if (!cred.expiresAt || cred.expiresAt > Date.now() + 60_000) {
      return { env: finalEnv, baseUrl: getBaseUrl(finalEnv), token: cred.token, user: cred.user };
    }
  }

  if (autoLogin) {
    return await login({ env: finalEnv });
  }

  throw new Error(
    `未登录或 token 已过期 (env=${finalEnv}). 请运行: urpm auth login --env=${finalEnv}`
  );
}

export async function logout({ env } = {}) {
  const finalEnv = getEnv(env);
  clearCredentials(finalEnv);
  return { env: finalEnv };
}

export function whoami({ env } = {}) {
  const finalEnv = getEnv(env);
  const cred = getEnvCredentials(finalEnv);
  if (!cred?.token) return { env: finalEnv, loggedIn: false };
  return {
    env: finalEnv,
    baseUrl: getBaseUrl(finalEnv),
    loggedIn: true,
    user: cred.user,
    username: cred.username,
    savedAt: cred.savedAt ? new Date(cred.savedAt).toISOString() : null,
    expiresAt: cred.expiresAt ? new Date(cred.expiresAt).toISOString() : null
  };
}
