---
name: urpm-shared
description: TCL URPM 用户洞察平台 CLI 共享基础。提供 urpm-cli 命令行工具的认证、配置、HTTP 客户端等基础能力，被 urpm-projects/urpm-samples/urpm-painpoints/urpm-concepts/urpm-consumers/urpm-dashboard 这 6 个业务 skill 复用。当用户首次使用 URPM 相关 skill、需要 `urpm auth login` 登录、需要切换 prod/local 环境、遇到 401 鉴权错误、或想了解 urpm-cli 全局参数（--env --json --yes --dry-run）时使用。
---

# urpm-shared — URPM CLI 共享基础

URPM (User Research & Product Management) 是 TCL 用户与产品企划数据中台。本 skill 提供 `urpm-cli` 工具，封装 URPM 用户洞察板块（insight 模块）所有 HTTP 接口，供 6 个业务 skill 调用。

## 0. 触发场景

- 第一次使用 urpm-* 系列 skill 时（必须先登录）
- 用户提到："登录 URPM"、"切到本地环境"、"我没登录、token 过期了"
- 任何 urpm-* skill 报 `未登录或 token 已过期` / `HTTP 401`
- 想批量或脚本化操作 URPM 平台

## 1. 安装与验证

```bash
# 克隆 urpm-insight-cli 后，在仓库根目录执行 ./install.sh；或直接使用：
skills/urpm-shared/bin/urpm-cli --help

# 手动软链（与 install.sh 二选一）
ln -sf "$(pwd)/skills/urpm-shared/bin/urpm-cli" ~/.local/bin/urpm
export PATH="$HOME/.local/bin:$PATH"
urpm --version
```

后续示例统一用 `urpm` 简写代表上面的二进制。

## 2. 登录与身份

```bash
# 交互式登录生产环境（默认 env=prod）
urpm auth login

# 切到本地开发环境
urpm auth login --env=local

# 非交互（CI / 脚本）
URPM_USERNAME=xxx URPM_PASSWORD=yyy urpm auth login --env=prod

# 当前身份
urpm auth whoami            # 当前 env
urpm auth whoami --env=local

# 登出
urpm auth logout
urpm auth logout --env=local
```

凭据存放在 `~/.urpm/credentials.json`（chmod 600），按 env 分别保存 token，自动检查到期时间。

## 3. 全局参数约定

| 参数 | 作用 | 默认 |
|---|---|---|
| `--env=prod\|local` | 选择环境 | prod (`https://urpm.tclac.com`) |
| `--json` | 输出原始 JSON（agent 友好） | 关 |
| `--tsv` | TSV（excel/sheet 友好） | 关 |
| `--yes` / `-y` | 确认执行写操作 | 关 |
| `--dry-run` | 仅打印不调用 | 写操作默认即 dry-run |

**⚠️ 重要安全约束**：
- 所有 `create` / `update` / `delete` / 触发 AI 任务的命令，**默认是 dry-run**，必须显式加 `--yes` 才会真正发请求。
- 当用户没明确说 "执行/确认/提交/删除/创建" 时，**绝不要加 `--yes`**，先用 dry-run 让用户确认。

## 4. 未登录也能用的命令

以下 `dashboard` 子命令走后端**公开 GET**（不带 JWT），适合先做连通性自检：

- `urpm dashboard health`
- `urpm dashboard overview`
- `urpm dashboard search --q "关键词"`
- `urpm dashboard product-lines`
- `urpm dashboard user-stats`

其余模块（projects / samples / painpoints / concepts / consumers）的读写均需先 `urpm auth login`。

## 5. 错误诊断速查

| 报错 | 原因 | 解决 |
|---|---|---|
| `未登录或 token 已过期` | 该 env 还没登录，或超过 7 天 | `urpm auth login --env=<env>` |
| `HTTP 401` | token 无效 | 同上 |
| `HTTP 403 只有创建人才能编辑` | 数据归属问题 | 确认登录账号；或换登录身份 |
| `ECONNREFUSED 5001` | local 环境后端没启动 | 项目根 `./start.sh` |
| `ENOTFOUND urpm.tclac.com` | 网络/VPN 问题 | 检查 TCL VPN |

设 `URPM_DEBUG=1` 可查看完整堆栈。

## 6. 业务模块入口（必读）

具体用法看对应 skill：

| 模块 | skill | 适用场景 |
|---|---|---|
| 项目 | `urpm-projects` | 创建/检索研究项目，管理项目成员 |
| 样本 | `urpm-samples` | 上传访谈记录、跑 AI 摘要/深度分析、抽取痛点 |
| 痛点 | `urpm-painpoints` | 维护痛点库、打标签、关联样本 |
| 概念 | `urpm-concepts` | 从痛点合成产品/功能概念，FABES + 013 卖点 |
| Consumer | `urpm-consumers` | 数字消费者档案，让 Agent 学习并对话 |
| 总览 | `urpm-dashboard` | 平台 stats、全局搜索、用户工作量 |

## 7. 给 Agent 的协作建议

1. 涉及读取/分析时优先 `--json` 输出，便于解析。
2. 涉及写入时**先 dry-run，让用户确认字段**，再追加 `--yes` 发请求。
3. 多步操作（如：创建项目 → 上传样本 → 抽痛点 → 合成概念）应**串行**而非并行，因后端任务依赖 ID。
4. 列表类命令默认 pageSize=20，需更大用 `--pageSize=100`。
5. AI 类操作（analyze / extract-painpoints / deep-analyze / generate-* / chat）**耗时较长**且按调用计费，谨慎重复触发。
