#!/usr/bin/env bash
# URPM 安装共用：解析「只装当前 Agent」的 skills 目标目录
# 由 install.sh（本地）与远程一键装脚本在解压后 source 使用。
# shellcheck shell=bash

URPM_AGENT_KEYS=(cursor claude trae trae-cn codex continue agents)
URPM_AGENT_NAMES=(Cursor "Claude Code" "Trae (Intl)" "Trae CN" "OpenAI Codex" Continue "Generic Agents")
URPM_AGENT_SKILL_DIRS=(
  "$HOME/.cursor/skills"
  "$HOME/.claude/skills"
  "$HOME/.trae/skills"
  "$HOME/.trae-cn/skills"
  "$HOME/.codex/skills"
  "$HOME/.continue/skills"
  "$HOME/.agents/skills"
)

# 输出：已安装（父目录存在）的 agent key，每行一个
urpm_list_installed_agent_keys() {
  local i parent
  for i in "${!URPM_AGENT_KEYS[@]}"; do
    parent="$(dirname "${URPM_AGENT_SKILL_DIRS[$i]}")"
    if [ -d "$parent" ]; then
      printf '%s\n' "${URPM_AGENT_KEYS[$i]}"
    fi
  done
}

# 根据环境 / 父进程链猜测当前是在哪个 Agent 里发起的安装（可能为空）
urpm_detect_agent_key() {
  [ -n "${CURSOR_TRACE_ID:-}" ] && { printf '%s\n' cursor; return 0; }
  [ -n "${CURSOR_AGENT:-}" ] && { printf '%s\n' cursor; return 0; }

  local pid line line_lc depth
  pid=${PPID:-0}
  depth=0
  while [ "${pid:-0}" -gt 1 ] && [ "$depth" -lt 10 ]; do
    line=$(ps -p "$pid" -o args= 2>/dev/null | tr '\0' ' ' || true)
    line_lc=$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')
    case "$line_lc" in
      *trae-cn*|*trae\ cn*|*traecn*) printf '%s\n' trae-cn; return 0 ;;
    esac
    case "$line_lc" in
      *"/trae/"*|*" trae"*|*electron*trae*) printf '%s\n' trae; return 0 ;;
    esac
    case "$line_lc" in
      *cursor*) printf '%s\n' cursor; return 0 ;;
    esac
    case "$line_lc" in
      *claude*) printf '%s\n' claude; return 0 ;;
    esac
    case "$line_lc" in
      *codex*) printf '%s\n' codex; return 0 ;;
    esac
    case "$line_lc" in
      *continue*) printf '%s\n' continue; return 0 ;;
    esac
    pid=$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' | head -1)
    depth=$((depth + 1))
  done
  printf '\n'
  return 0
}

# 将 key 规范化为 URPM_AGENT_KEYS 中的项
urpm_normalize_agent_key() {
  local k
  k=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
  case "$k" in
    trae-intl|trae_intl|traeintl) k=trae ;;
  esac
  printf '%s\n' "$k"
}

# 根据 key 追加一对 TARGET / LABEL；无效 key 返回 1
urpm_append_target_for_key() {
  local want="$1"
  local i
  [ -n "$want" ] || return 1
  for i in "${!URPM_AGENT_KEYS[@]}"; do
    if [ "${URPM_AGENT_KEYS[$i]}" = "$want" ]; then
      URPM_SKILL_TARGET_DIRS+=("${URPM_AGENT_SKILL_DIRS[$i]}")
      URPM_SKILL_TARGET_LABELS+=("${URPM_AGENT_NAMES[$i]}")
      return 0
    fi
  done
  echo "未知的 Agent: $want（可选: cursor claude trae trae-cn codex continue agents all）" >&2
  return 1
}

# 解析结果数组（调用方需先清空）
URPM_SKILL_TARGET_DIRS=()
URPM_SKILL_TARGET_LABELS=()

# 参数：
#   $1 SKIP_SKILLS (1/0)
#   $2 FORCE_ALL (1/0)  等价于 URPM_AGENT=all
#   $3 URPM_AGENT 环境值（可为空、逗号分隔）
#   $4 SKILLS_DESTS（逗号分隔，可为空）
#   $5 SKILLS_DEST（单目录，可为空）
#   $6 EXPLICIT_KEYS 换行分隔的 key（来自本地 --agent，可为空）
#
# 返回：0 成功（可能 0 个目标）；1 未知 key；2 多 Agent 需用户指定 URPM_AGENT
urpm_resolve_skill_install_targets() {
  local skip_skills="$1"
  local force_all="$2"
  local urpm_agent_env="$3"
  local skills_dests="$4"
  local skills_dest="$5"
  local explicit_keys="$6"

  URPM_SKILL_TARGET_DIRS=()
  URPM_SKILL_TARGET_LABELS=()

  [ "$skip_skills" = "1" ] && return 0

  if [ -n "$skills_dests" ]; then
    local part
    IFS=',' read -r -a _parts <<< "$skills_dests"
    for part in "${_parts[@]}"; do
      [ -z "$part" ] && continue
      URPM_SKILL_TARGET_DIRS+=("$part")
      URPM_SKILL_TARGET_LABELS+=("custom")
    done
    return 0
  fi

  if [ -n "$skills_dest" ]; then
    URPM_SKILL_TARGET_DIRS+=("$skills_dest")
    URPM_SKILL_TARGET_LABELS+=("custom")
    return 0
  fi

  if [ -n "$explicit_keys" ]; then
    local k norm
    while IFS= read -r k; do
      [ -z "$k" ] && continue
      norm=$(urpm_normalize_agent_key "$k") || true
      urpm_append_target_for_key "$norm" || return 1
    done <<< "$explicit_keys"
    [ ${#URPM_SKILL_TARGET_DIRS[@]} -gt 0 ] && return 0
  fi

  local lc
  lc=$(printf '%s' "$urpm_agent_env" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
  if [ "$lc" = "all" ] || [ "$force_all" = "1" ]; then
    local i
    for i in "${!URPM_AGENT_KEYS[@]}"; do
      URPM_SKILL_TARGET_DIRS+=("${URPM_AGENT_SKILL_DIRS[$i]}")
      URPM_SKILL_TARGET_LABELS+=("${URPM_AGENT_NAMES[$i]}")
    done
    return 0
  fi

  if [ -n "$lc" ]; then
    local key norm
    IFS=',' read -r -a _want <<< "$urpm_agent_env"
    for key in "${_want[@]}"; do
      norm=$(urpm_normalize_agent_key "$key") || true
      [ -z "$norm" ] && continue
      urpm_append_target_for_key "$norm" || return 1
    done
    return 0
  fi

  local installed=()
  local line
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    installed+=("$line")
  done < <(urpm_list_installed_agent_keys)

  local n=${#installed[@]}
  if [ "$n" -eq 0 ]; then
    return 0
  fi

  if [ "$n" -eq 1 ]; then
    urpm_append_target_for_key "${installed[0]}" || return 1
    return 0
  fi

  local hint
  hint=$(urpm_detect_agent_key)
  hint=$(urpm_normalize_agent_key "$hint")
  if [ -n "$hint" ]; then
    local k
    for k in "${installed[@]}"; do
      if [ "$k" = "$hint" ]; then
        urpm_append_target_for_key "$hint" || return 1
        return 0
      fi
    done
  fi

  echo "" >&2
  echo "检测到本机已安装多个 Agent：${installed[*]}" >&2
  echo "为避免误装到其它工具，请只选一个，例如：" >&2
  echo "  URPM_AGENT=trae-cn curl -fsSL https://urpm.tclac.com/cli/install.sh | bash" >&2
  echo "可选值: cursor | claude | trae | trae-cn | codex | continue | agents | all" >&2
  echo "" >&2
  return 2
}

urpm_copy_skill_folders() {
  local src_root="$1"
  local dest="$2"
  local names=(urpm-shared urpm-projects urpm-samples urpm-painpoints urpm-concepts urpm-consumers urpm-dashboard)
  local name src count
  count=0
  mkdir -p "$dest" 2>/dev/null || return 1
  for name in "${names[@]}"; do
    src="$src_root/$name"
    if [ -d "$src" ]; then
      rm -rf "$dest/$name"
      cp -R "$src" "$dest/$name"
      count=$((count + 1))
    fi
  done
  if [ -f "$src_root/README.md" ]; then
    cp "$src_root/README.md" "$dest/URPM_SKILLS_README.md" 2>/dev/null || true
  fi
  printf '%s' "$count"
}
