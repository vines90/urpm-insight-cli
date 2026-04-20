#!/usr/bin/env bash
# URPM Insight CLI + Agent Skills 本地安装（在解压后的仓库根目录执行）
#
# 默认：Skills 只安装到「当前使用的 Agent」——
#   · 若本机只装了一个 Agent → 自动装到该 Agent
#   · 若装了多个 → 尝试根据终端环境猜测；猜不到则报错并提示设置 URPM_AGENT
#   · 显式指定：URPM_AGENT=trae-cn ./install.sh  或  ./install.sh --agent trae-cn
#   · 装到全部：URPM_AGENT=all 或 ./install.sh --all-agents
#
# 用法:
#   ./install.sh
#   URPM_AGENT=trae-cn ./install.sh
#   ./install.sh --agent trae-cn
#   ./install.sh --agent cursor --agent claude
#   ./install.sh --all-agents
#   ./install.sh --cli-only
#   ./install.sh --skills-only
#   ./install.sh --skills-dir DIR        # 可多次
#   ./install.sh --list-agents
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/install-common.sh"

CLI_SRC="$ROOT/skills/urpm-shared/bin/urpm-cli"
INSTALL_BIN="${INSTALL_BIN:-$HOME/.local/bin}"

DO_CLI=1
DO_SKILLS=1
LIST_ONLY=0
FORCE_ALL_AGENTS="${FORCE_ALL_AGENTS:-0}"
SKILLS_DIRS_CSV=""
declare -a EXPLICIT_AGENT_KEYS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli-only) DO_SKILLS=0 ;;
    --skills-only) DO_CLI=0 ;;
    --skills-dir)
      SKILLS_DIRS_CSV="${SKILLS_DIRS_CSV:+$SKILLS_DIRS_CSV,}$2"
      shift ;;
    --all-agents|--force-all-agents) FORCE_ALL_AGENTS=1 ;;
    --agent)
      EXPLICIT_AGENT_KEYS+=("$2")
      shift ;;
    --list-agents) LIST_ONLY=1 ;;
    -h|--help)
      sed -n '2,25p' "$0"
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

color() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
ok()   { color '0;32' "✓ $*"; }
warn() { color '1;33' "! $*"; }

EXPLICIT_KEYS_BLOB=""
for k in "${EXPLICIT_AGENT_KEYS[@]}"; do
  EXPLICIT_KEYS_BLOB+="$k"$'\n'
done

if [ "$LIST_ONLY" = "1" ]; then
  echo "已检测到下列 Agent（父目录存在）："
  urpm_list_installed_agent_keys | while IFS= read -r x; do
    [ -z "$x" ] && continue
    echo "  - $x"
  done
  echo ""
  echo "当前终端猜测：$(urpm_detect_agent_key | tr -d '\n' || true)"
  exit 0
fi

SKIP_SKILLS=0
[ "$DO_SKILLS" -eq 0 ] && SKIP_SKILLS=1

SK_DEST="${SKILLS_DEST:-}"
SK_DESTS="$SKILLS_DIRS_CSV"
[ -n "$SK_DESTS" ] && SK_DEST=""

set +e
urpm_resolve_skill_install_targets "$SKIP_SKILLS" "$FORCE_ALL_AGENTS" "${URPM_AGENT:-}" "$SK_DESTS" "$SK_DEST" "$EXPLICIT_KEYS_BLOB"
_rc=$?
set -e
if [ $_rc -eq 2 ]; then exit 2; fi
if [ $_rc -ne 0 ]; then exit 1; fi

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
  if [ ${#URPM_SKILL_TARGET_DIRS[@]} -eq 0 ]; then
    warn "未安装任何 Skills（0 个目标目录）。可尝试："
    echo "    URPM_AGENT=trae-cn $0"
    echo "    或 $0 --all-agents"
  else
    for idx in "${!URPM_SKILL_TARGET_DIRS[@]}"; do
      dest="${URPM_SKILL_TARGET_DIRS[$idx]}"
      label="${URPM_SKILL_TARGET_LABELS[$idx]}"
      cnt=$(urpm_copy_skill_folders "$ROOT/skills" "$dest")
      ok "Skills → $label ($dest): $cnt 个"
    done
  fi
fi

echo ""
echo "完成。验证:  export PATH=\"$INSTALL_BIN:\$PATH\"  &&  urpm --help"
