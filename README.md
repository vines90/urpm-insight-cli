# urpm-insight-cli

**URPM 用户洞察** 板块的命令行工具（`urpm`）与 **7 个 Cursor Agent Skills**，可从本仓库克隆后一键安装。面向 TCL 内部 [URPM](https://urpm.tclac.com)（生产默认 `https://urpm.tclac.com`）。

- **CLI**：Node.js ≥ 18，零 npm 依赖，JWT 登录后调用 `/api/insight/*`。
- **Skills**：`urpm-shared` + 6 个业务 skill，供 Cursor 等 IDE 的 Agent 读取 `SKILL.md` 并编排命令。

## 一键安装（推荐）

```bash
git clone https://github.com/<你的用户名>/urpm-insight-cli.git
cd urpm-insight-cli
chmod +x install.sh
./install.sh
```

安装内容：

- 将 `urpm` 链到 `~/.local/bin/urpm`（可用环境变量 `INSTALL_BIN` 覆盖）
- 将各 `urpm-*` 目录复制到 `~/.cursor/skills/`（可用 `SKILLS_DEST` 或 `--skills-dir` 覆盖）

若 `urpm` 仍找不到，把下面加入 `~/.zshrc`：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## 仅安装 CLI 或仅安装 Skills

```bash
./install.sh --cli-only
./install.sh --skills-only
./install.sh --skills-dir /path/to/.cursor/skills
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

1. 克隆本仓库并执行 `./install.sh`，或把 `skills/` 下目录复制到目标环境的 `~/.cursor/skills/`。
2. 确保 Node 18+：`node -v`
3. 用户需自行 `urpm auth login`；凭据在 `~/.urpm/credentials.json`，勿提交到 git。
4. 写操作默认 dry-run，需显式 `--yes`。

## 开源与合规

本工具仅封装贵司已部署的 URPM HTTP API；发布前请确认符合 **TCL 代码与数据外发** 政策。若不能公开仓库，可使用 **GitHub Private** 或内部 GitLab，安装方式相同（`git clone` 使用内网 URL）。

## License

内部工具，默认 **TCL 专有**；如需添加许可证文件请由法务/仓库所有者补充。
