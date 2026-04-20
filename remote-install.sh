#!/usr/bin/env bash
# 生产环境「一键安装」脚本：下载 tarball 后解压，再 source 包内 install-common.sh
# 部署到 https://urpm.tclac.com/cli/install.sh
# 用法: curl -fsSL https://urpm.tclac.com/cli/install.sh | bash
#
# Skills 默认只装当前 Agent（与仓库内 ./install.sh 行为一致）：
#   URPM_AGENT=trae-cn curl -fsSL ... | bash
#   URPM_AGENT=all curl -fsSL ... | bash    # 装到全部已知目录
set -euo pipefail

URPM_BASE="${URPM_BASE:-https://urpm.tclac.com/cli}"
URPM_HOME="${URPM_HOME:-$HOME/.urpm-insight-cli}"
INSTALL_BIN="${INSTALL_BIN:-$HOME/.local/bin}"
TARBALL_URL="${URPM_BASE}/urpm-insight-cli.tar.gz"
SKIP_SKILLS="${SKIP_SKILLS:-0}"
FORCE_ALL="${FORCE_ALL_AGENTS:-0}"

color() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
info() { color '0;34' "▸ $*"; }
ok()   { color '0;32' "✓ $*"; }
warn() { color '1;33' "! $*"; }
fail() { color '0;31' "✗ $*" >&2; exit 1; }

info "URPM Insight CLI 安装"
echo "  下载源:    $TARBALL_URL"
echo "  安装目录:  $URPM_HOME"
echo "  CLI 软链:  $INSTALL_BIN/urpm"
if [ "$SKIP_SKILLS" = "1" ]; then
  echo "  Skills:    跳过（SKIP_SKILLS=1）"
elif [ -n "${URPM_AGENT:-}" ]; then
  echo "  Skills:    URPM_AGENT=${URPM_AGENT}"
elif [ "$FORCE_ALL" = "1" ]; then
  echo "  Skills:    全部 Agent（FORCE_ALL_AGENTS=1）"
else
  echo "  Skills:    自动选择（单 Agent 自动 / 多 Agent 需 URPM_AGENT 或环境猜测）"
fi
echo ""

command -v node >/dev/null 2>&1 || fail "未安装 node。请先安装 Node.js >= 18.17"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node 版本过低 ($(node -v))，需 >= 18.17"

if command -v curl >/dev/null 2>&1; then
  DOWNLOAD="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  DOWNLOAD="wget -qO-"
else
  fail "需要 curl 或 wget"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
info "下载 tarball..."
$DOWNLOAD "$TARBALL_URL" > "$TMP/cli.tar.gz" || fail "下载失败：$TARBALL_URL"
SIZE="$(wc -c < "$TMP/cli.tar.gz" | tr -d ' ')"
[ "$SIZE" -gt 1024 ] || fail "下载内容异常（仅 ${SIZE} 字节）"
ok "下载完成 (${SIZE} bytes)"

info "解压到 $URPM_HOME ..."
mkdir -p "$URPM_HOME"
find "$URPM_HOME" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
tar -xzf "$TMP/cli.tar.gz" -C "$URPM_HOME"
ok "解压完成"

COMMON="$URPM_HOME/install-common.sh"
[ -f "$COMMON" ] || fail "包内缺少 install-common.sh，请同步最新 urpm-insight-cli 再发布"

# shellcheck disable=SC1090
source "$COMMON"

set +e
urpm_resolve_skill_install_targets "$SKIP_SKILLS" "$FORCE_ALL" "${URPM_AGENT:-}" "${SKILLS_DESTS:-}" "${SKILLS_DEST:-}" ""
_rc=$?
set -e
if [ $_rc -eq 2 ]; then exit 2; fi
if [ $_rc -ne 0 ]; then exit 1; fi

CLI_SRC="$URPM_HOME/skills/urpm-shared/bin/urpm-cli"
[ -f "$CLI_SRC" ] || fail "未找到 $CLI_SRC"
chmod +x "$CLI_SRC"
mkdir -p "$INSTALL_BIN"
ln -sf "$CLI_SRC" "$INSTALL_BIN/urpm"
ok "CLI: $INSTALL_BIN/urpm -> $CLI_SRC"

INSTALLED=0
if [ "$SKIP_SKILLS" != "1" ]; then
  if [ ${#URPM_SKILL_TARGET_DIRS[@]} -eq 0 ]; then
    warn "未安装任何 Skills。请指定 Agent，例如："
    echo "    URPM_AGENT=trae-cn curl -fsSL $URPM_BASE/install.sh | bash" >&2
  else
    for idx in "${!URPM_SKILL_TARGET_DIRS[@]}"; do
      dest="${URPM_SKILL_TARGET_DIRS[$idx]}"
      label="${URPM_SKILL_TARGET_LABELS[$idx]}"
      cnt=$(urpm_copy_skill_folders "$URPM_HOME/skills" "$dest")
      ok "Skills → $label ($dest): $cnt 个"
      INSTALLED=$((INSTALLED + 1))
    done
  fi
fi

if [[ ":$PATH:" != *":$INSTALL_BIN:"* ]]; then
  echo ""
  warn "$INSTALL_BIN 未在 PATH 中，请追加："
  echo "    export PATH=\"$INSTALL_BIN:\$PATH\""
fi

echo ""
ok "安装完成！"
echo "  CLI:     $INSTALL_BIN/urpm"
[ "$INSTALLED" -gt 0 ] && echo "  Skills:  已写入 $INSTALLED 个目标"
echo ""
echo "  urpm auth login"
echo "  指南: https://www.feishu.cn/docx/KUb0dTUKqolmaHxZXVgcW6Kxncb"
