#!/usr/bin/env node
/**
 * urpm-cli 主入口
 *
 * 用法: urpm <module> <subcommand> [options]
 *
 * Modules:
 *   auth        login | logout | whoami
 *   projects    研究项目
 *   samples     访谈样本
 *   painpoints  痛点库
 *   concepts    概念库
 *   consumers   消费者 Agent
 *   dashboard   总览/搜索
 */
import { parseArgs } from './args.mjs';
import { login, logout, whoami } from './auth.mjs';
import { printError, printSuccess, render } from './output.mjs';
import * as projects from './commands/projects.mjs';
import * as samples from './commands/samples.mjs';
import * as painpoints from './commands/painpoints.mjs';
import * as concepts from './commands/concepts.mjs';
import * as consumers from './commands/consumers.mjs';
import * as dashboard from './commands/dashboard.mjs';

const VERSION = '0.1.0';

const MODULES = {
  projects: projects.run,
  samples: samples.run,
  painpoints: painpoints.run,
  concepts: concepts.run,
  consumers: consumers.run,
  dashboard: dashboard.run
};

function topLevelHelp() {
  process.stderr.write(`urpm-cli v${VERSION}  —  TCL URPM 用户洞察平台 CLI

Usage:
  urpm <module> <subcommand> [options]

Modules:
  auth         登录/登出/查看当前身份
  dashboard    平台总览 / 全局搜索 / 健康检查
  projects     研究项目 (research_projects)
  samples      访谈样本 (research_samples + AI 分析)
  painpoints   痛点库 (painpoints + 标签 + 自动打标)
  concepts     概念库 (concepts + 痛点合成生成)
  consumers    消费者 Agent (profiles + learn + chat)

Auth:
  urpm auth login [--env=prod|local]
  urpm auth logout [--env]
  urpm auth whoami [--env]

Global flags:
  --env=prod|local     默认 prod (https://urpm.tclac.com)
  --json | --tsv       机器可读输出
  --yes                确认执行写操作
  --dry-run            仅打印不执行 (写操作默认即 dry-run)
  -h, --help           显示帮助

Examples:
  urpm auth login --env=prod
  urpm dashboard overview --json
  urpm projects list --product-line "家用空调"
  urpm samples create --title "C7回访" --project_id 12 --file ./访谈.docx --yes
  urpm painpoints list --priority 高优先级 --json
  urpm consumers chat 22 --question "你买空调最看重什么?"

完整命令请使用: urpm <module> --help
`);
}

async function handleAuth(argv) {
  const { positional, flags } = parseArgs(argv);
  const sub = positional[0];
  switch (sub) {
    case 'login': {
      const result = await login({ env: flags.env, username: flags.username, password: flags.password });
      printSuccess(`登录成功: env=${result.env} user=${result.user?.username || result.user?.fullName || '?'}`);
      if (result.expiresAt) {
        process.stderr.write(`  token 过期时间: ${new Date(result.expiresAt).toISOString()}\n`);
      }
      return;
    }
    case 'logout': {
      const r = await logout({ env: flags.env });
      printSuccess(`已登出 env=${r.env}`);
      return;
    }
    case 'whoami': {
      const info = whoami({ env: flags.env });
      render({ item: info }, { format: flags.json ? 'json' : 'table' });
      return;
    }
    default:
      process.stderr.write(`urpm auth <login|logout|whoami> [--env=prod|local]\n`);
      if (sub) throw new Error(`未知子命令: auth ${sub}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const [module, ...rest] = argv;

  if (!module || module === '-h' || module === '--help' || module === 'help') {
    topLevelHelp();
    return;
  }
  if (module === '-v' || module === '--version' || module === 'version') {
    process.stdout.write(VERSION + '\n');
    return;
  }
  if (module === 'auth') {
    await handleAuth(rest);
    return;
  }

  const handler = MODULES[module];
  if (!handler) {
    topLevelHelp();
    throw new Error(`未知模块: ${module}`);
  }
  await handler(rest);
}

main().catch((err) => {
  printError(err.message || String(err), { details: err.body });
  if (process.env.URPM_DEBUG) {
    process.stderr.write((err.stack || '') + '\n');
  }
  process.exit(1);
});
