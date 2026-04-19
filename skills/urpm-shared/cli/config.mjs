/**
 * 配置与环境管理
 *
 * 凭据存储位置: ~/.urpm/credentials.json (chmod 600)
 * 默认环境: prod (https://urpm.tclac.com)
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.urpm');
const CRED_FILE = path.join(CONFIG_DIR, 'credentials.json');

const ENVIRONMENTS = {
  prod: { baseUrl: 'https://urpm.tclac.com' },
  local: { baseUrl: process.env.URPM_LOCAL_URL || 'http://localhost:5001' }
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadCredentials() {
  if (!fs.existsSync(CRED_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CRED_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}

export function saveCredentials(data) {
  ensureConfigDir();
  const merged = { ...loadCredentials(), ...data };
  fs.writeFileSync(CRED_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
  fs.chmodSync(CRED_FILE, 0o600);
}

export function clearCredentials(env) {
  const data = loadCredentials();
  if (env) {
    delete data[env];
  } else {
    Object.keys(data).forEach((k) => delete data[k]);
  }
  fs.writeFileSync(CRED_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

/**
 * 获取当前生效环境，优先级: --env > URPM_ENV > prod
 */
export function getEnv(envFlag) {
  const env = envFlag || process.env.URPM_ENV || 'prod';
  if (!ENVIRONMENTS[env]) {
    throw new Error(`未知环境: ${env}. 可选: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return env;
}

export function getBaseUrl(env) {
  return ENVIRONMENTS[env].baseUrl;
}

export function getEnvCredentials(env) {
  const all = loadCredentials();
  return all[env] || null;
}

export function setEnvCredentials(env, payload) {
  const all = loadCredentials();
  all[env] = payload;
  saveCredentials(all);
}

export const CONFIG_PATHS = { CONFIG_DIR, CRED_FILE };
