# URPM Skills — TCL 用户洞察平台 Agent 工具集

一套 7 个 skills，封装 URPM（TCL 用户与产品企划数据中台）「用户洞察」板块所有 API 操作，供 Cursor agent 直接调用。

> 本文件位于独立 Git 仓库 `urpm-insight-cli` 的 `skills/` 目录。安装见仓库根目录 [README.md](../README.md)。

| Skill | 作用 |
|---|---|
| `urpm-shared` | CLI 共享基础（登录、HTTP、配置）。所有业务 skill 的依赖 |
| `urpm-projects` | 研究项目 CRUD + 成员管理 |
| `urpm-samples` | 访谈样本 CRUD + AI 摘要/深度分析/抽痛点 + 任务跟踪 |
| `urpm-painpoints` | 痛点库 CRUD + 标签 + 自动打标 + AI 视角分析 |
| `urpm-concepts` | 概念库 CRUD + 从痛点合成产品/功能概念（FABES + 013 卖点） |
| `urpm-consumers` | 消费者 Agent CRUD + 学习画像 + AI 对话 |
| `urpm-dashboard` | 平台总览 + 全局搜索 + 健康检查 + 用户工作量 |

## 快速开始

在**本仓库根目录**执行 `./install.sh` 后，或使用下列路径（克隆后的 `skills` 目录）：

```bash
# 1) 让 urpm 命令全局可用（与 install.sh 二选一）
ln -sf "$(pwd)/skills/urpm-shared/bin/urpm-cli" ~/.local/bin/urpm
export PATH="$HOME/.local/bin:$PATH"

# 2) 登录生产环境
urpm auth login --env=prod

# 3) 试一下
urpm dashboard overview
urpm projects list --product-line "家用空调"
```

## 环境

| env | URL | 用途 |
|---|---|---|
| `prod` (默认) | `https://urpm.tclac.com` | 生产环境，可读写 |
| `local` | `http://localhost:5001` | 本地开发，需后端在本机启动 |

切换：`--env=local` 或 `URPM_ENV=local`。

## 架构

```
skills/
├── urpm-shared/             # CLI 工具源码 + 共享 SKILL.md
│   ├── bin/urpm-cli         # Node 18+ 入口
│   ├── cli/
│   │   ├── index.mjs        # 主路由
│   │   ├── auth.mjs         # 登录、token 续期
│   │   ├── http.mjs         # 鉴权 fetch + multipart 上传
│   │   ├── config.mjs       # ~/.urpm/credentials.json (chmod 600)
│   │   ├── output.mjs       # json / table / tsv 渲染
│   │   ├── args.mjs         # 极简参数解析 + dry-run/yes 约定
│   │   └── commands/        # 6 个业务模块实现
│   ├── package.json
│   └── SKILL.md
└── urpm-{projects,samples,painpoints,concepts,consumers,dashboard}/
    └── SKILL.md             # 触发场景 + 字段速查 + 命令示例
```

## 全局约定

- **认证**：JWT，凭据存 `~/.urpm/credentials.json`，按 env 隔离，自动检查过期
- **写操作默认 dry-run**：`create / update / delete / 触发 AI 任务` 必须显式加 `--yes` 才会真正发请求
- **输出**：默认人类可读 table，`--json` 给 agent 解析，`--tsv` 给 sheet
- **错误**：失败统一退出码非零，`URPM_DEBUG=1` 看堆栈

## 依赖

- Node.js ≥ 18.17（用到原生 `fetch` 和 `FormData`）
- 无第三方依赖（package.json 仅声明 `bin`，没有 deps）

## 安全

- `~/.urpm/credentials.json` 自动 `chmod 600`
- 不在日志中打印 token
- AI/删除操作严格 dry-run-first，需要 `--yes` 二次确认
- 多 env 凭据独立存放，避免误操作生产
