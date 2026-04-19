#!/usr/bin/env bash
# URPM Insight CLI + Agent Skills 本地安装脚本（在解压后的 urpm-insight-cli 目录下执行）
#
# 自动探测下列 Agent 的 skills 目录并全部安装：
#   ~/.cursor/skills        Cursor
#   ~/.claude/skills        Claude Code
#   ~/.trae/skills          Trae (国际版)
#   ~/.trae-cn/skills       Trae CN
#   ~/.codex/skills         OpenAI Codex
#   ~/.continue/skills      Continue
#   ~/.agents/skills        通用 Agents 约定
#
# 用法:
#   bash ./install.sh                       # 默认：安装 CLI + 探测到的所有 Agent
#   bash ./install.sh --cli-only            # 只安装 CLI
#   bash ./install.sh --skills-only         # 只安装 skills（不创建 urpm 软链）
#   bash ./install.sh --skills-dir DIR      # 只安装到 DIR（覆盖自动探测）
#   bash ./install.sh --force-all-agents    # 即使 Agent 未安装也建目录写入 skills
#   bash ./install.sh --list-agents         # 仅列出探测到的 Agent，不安装
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_SRC="$ROOT/skills/urpm-shared/bin/urpm-cli"
INSTALL_BIN="${INSTALL_BIN:-$HOME/.local/bin}"

DO_CLI=1
DO_SKILLS=1
LIST_ONLY=0
FORCE_ALL_AGENTS="${FORCE_ALL_AGENTS:-0}"
EXPLICIT_DIRS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli-only) DO_SKILLS=0 ;;
    --skills-only) DO_CLI=0 ;;
    --skills-dir)
      EXPLICIT_DIRS+=("$2"); shift ;;
    --force-all-agents) FORCE_ALL_AGENTS=1 ;;
    --list-agents) LIST_ONLY=1 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

color() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
ok()   { color '0;32' "✓ $*"; }
warn() { color '1;33' "! $*"; }

AGENT_NAMES=(Cursor "Claude Code" "Trae (Intl)" "Trae CN" "OpenAI Codex" Continue "Generic Agents")
AGENT_DIRS=(
  "$HOME/.cursor/skills"
  "$HOME/.claude/skills"
  "$HOME/.trae/skills"
  "$HOME/.trae-cn/skills"
  "$HOME/.codex/skills"
  "$HOME/.continue/skills"
  "$HOME/.agents/skills"
)

declare -a TARGETS=()
declare -a LABELS=()

if [ ${#EXPLICIT_DIRS[@]} -gt 0 ]; then
  for d in "${EXPLICIT_DIRS[@]}"; do
    TARGETS+=("$d"); LABELS+=("custom")
  done
else
  for i in "${!AGENT_DIRS[@]}"; do
    parent="$(dirname "${AGENT_DIRS[$i]}")"
    if [ -d "${AGENT_DIRS[$i]}" ] || [ -d "$parent" ] || [ "$FORCE_ALL_AGENTS" = "1" ]; then
      TARGETS+=("${AGENT_DIRS[$i]}")
      LABELS+=("${AGENT_NAMES[$i]}")
    fi
  done
fi

if [ "$LIST_ONLY" = "1" ]; then
  echo "探测到的 Agent skills 目录："
  for i in "${!TARGETS[@]}"; do
    echo "  - ${LABELS[$i]}: ${TARGETS[$i]}"
  done
  [ ${#TARGETS[@]} -eq 0 ] && echo "  （无）"
  exit 0
fi

if [ "$DO_CLI" -eq 1 ]; then
  [ -f "$CLI_SRC" ] || { echo "ERROR: missing $CLI_SRC" >&2; exit 1; }
  chmod +x "$CLI_SRC"
  mkdir -p "$INSTALL_BIN"
  ln -sf "$CLI_SRC" "$INSTALL_BIN/urpm"
  ok "CLI: $INSTALL_BIN/urpm -> $CLI_SRC"
  if [[ ":$PATH:" != *":$INSTALL_BIN:"* ]]; then
    warn "$INSTALL_BIN 不在 PATH 中，请追加："
    echo "    export PATH=\"$INSTALL_BIN:\$PATH\""
  fi
fi

if [ "$DO_SKILLS" -eq 1 ]; then
  if [ ${#TARGETS[@]} -eq 0 ]; then
    warn "未探测到任何 Agent 目录，跳过 skills（可加 --force-all-agents 强制安装）"
  fi
  SKILL_NAMES=(urpm-shared urpm-projects urpm-samples urpm-painpoints urpm-concepts urpm-consumers urpm-dashboard)
  for i in "${!TARGETS[@]}"; do
    dest="${TARGETS[$i]}"
    label="${LABELS[$i]}"
    mkdir -p "$dest" 2>/dev/null || { warn "无法创建 $dest，跳过"; continue; }
    count=0
    for name in "${SKILL_NAMES[@]}"; do
      src="$ROOT/skills/$name"
      [ -d "$src" ] || continue
      rm -rf "$dest/$name"
      cp -R "$src" "$dest/$name"
      count=$((count + 1))
    done
    [ -f "$ROOT/skills/README.md" ] && \
      cp "$ROOT/skills/README.md" "$dest/URPM_SKILLS_README.md"
    ok "Skills → $label ($dest): $count 个"
  done
fi

echo ""
echo "完成。验证:  export PATH=\"$INSTALL_BIN:\$PATH\"  &&  urpm --help"
