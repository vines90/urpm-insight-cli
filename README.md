# urpm-insight-cli

**URPM 用户洞察** 板块的命令行工具（`urpm`）与 **7 个 Cursor Agent Skills**，可从本仓库克隆后一键安装。面向 TCL 内部 [URPM](https://urpm.tclac.com)（生产默认 `https://urpm.tclac.com`）。

- **CLI**：Node.js ≥ 18，零 npm 依赖，JWT 登录后调用 `/api/insight/*`。
- **Skills**：`urpm-shared` + 6 个业务 skill，供 Cursor 等 IDE 的 Agent 读取 `SKILL.md` 并编排命令。

## 一键安装（推荐）

```bash
git clone https://github.com/<你的用户名>/urpm-insight-cli.git
cd urpm-insight-cli
chmod +x install.sh
# 只把 Skills 装到你正在用的 Agent（示例：Trae CN）
URPM_AGENT=trae-cn ./install.sh
```

安装内容：

- 将 `urpm` 链到 `~/.local/bin/urpm`（可用环境变量 `INSTALL_BIN` 覆盖）
- 将各 `urpm-*` 目录复制到**指定 Agent** 的 skills 目录（**不会**默认给所有 Agent 各装一份）

**`URPM_AGENT` 取值**：`cursor` · `claude` · `trae` · `trae-cn` · `codex` · `continue` · `agents` · `all`（装到全部已知路径）

**自动选择**：若未设置 `URPM_AGENT`，且本机检测到的已安装 Agent **恰好只有一个**，则自动装到该 Agent；若装了多个且无法从终端环境判断，脚本会报错并提示你设置 `URPM_AGENT`。

若 `urpm` 仍找不到，把下面加入 `~/.zshrc`：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## 仅安装 CLI 或仅安装 Skills

```bash
./install.sh --cli-only
URPM_AGENT=cursor ./install.sh --skills-only
./install.sh --skills-dir /path/a --skills-dir /path/b
./install.sh --all-agents                    # 等价于 URPM_AGENT=all
./install.sh --list-agents                   # 查看本机已检测到哪些 Agent
```

## 一行克隆并安装（给其他机器 / Agent）

将 `<USER>` 换成你的 GitHub 用户名或组织名：

```bash
git clone --depth 1 https://github.com/<USER>/urpm-insight-cli.git /tmp/urpm-insight-cli \
  && (cd /tmp/urpm-insight-cli && chmod +x install.sh && ./install.sh) \
  && rm -rf /tmp/urpm-insight-cli
```

## 登录与验证

```bash
urpm auth login --env=prod
urpm auth whoami --env=prod --json
urpm dashboard health
urpm projects list --pageSize 5
```

未登录也可使用部分 dashboard 只读接口（见 `skills/urpm-shared/SKILL.md`）。

## 目录结构

```
skills/
├── README.md              # Skills 索引与说明
├── urpm-shared/           # CLI 源码 + 共享 SKILL
│   ├── bin/urpm-cli
│   └── cli/
└── urpm-{projects,samples,painpoints,concepts,consumers,dashboard}/
    └── SKILL.md
```

## 给其他 Agent 的说明

1. 克隆本仓库并执行 `URPM_AGENT=<你的工具> ./install.sh`，或把 `skills/` 下各 `urpm-*` 目录**只**复制到你正在用的 Agent 的 skills 目录（见 `install-common.sh` 内路径表）。
2. 确保 Node 18+：`node -v`
3. 用户需自行 `urpm auth login`；凭据在 `~/.urpm/credentials.json`，勿提交到 git。
4. 写操作默认 dry-run，需显式 `--yes`。

## 开源与合规

本工具仅封装贵司已部署的 URPM HTTP API；发布前请确认符合 **TCL 代码与数据外发** 政策。若不能公开仓库，可使用 **GitHub Private** 或内部 GitLab，安装方式相同（`git clone` 使用内网 URL）。

## 发布到 GitHub（首次）

本目录是**独立 Git 仓库**（内含 `.git/`），可与外层「企划用研中台」仓库分开推送。

1. 在 GitHub 上 **New repository**，名称建议 `urpm-insight-cli`，**不要**勾选 “Add a README”（本地已有）。
2. 在本机执行（将 URL 换成你的仓库）：

```bash
cd /path/to/企划用研中台_1205/urpm-insight-cli
git remote add origin https://github.com/<USER_OR_ORG>/urpm-insight-cli.git
git push -u origin main
```

若已安装 [GitHub CLI](https://cli.github.com/) 且已登录：

```bash
cd urpm-insight-cli
gh repo create urpm-insight-cli --public --source=. --remote=origin --push
```

**合规**：若代码不可公开，创建 **Private** 仓库即可，其他 Agent 凭权限 `git clone` 同样可安装。

## License

内部工具，默认 **TCL 专有**；如需添加许可证文件请由法务/仓库所有者补充。
