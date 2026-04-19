#!/usr/bin/env bash
# URPM Insight CLI + Cursor Skills 安装脚本
# 用法: ./install.sh [--cli-only] [--skills-only] [--skills-dir DIR]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_SRC="$ROOT/skills/urpm-shared/bin/urpm-cli"
INSTALL_BIN="${INSTALL_BIN:-$HOME/.local/bin}"
SKILLS_DEST="${SKILLS_DEST:-$HOME/.cursor/skills}"

DO_CLI=1
DO_SKILLS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli-only) DO_SKILLS=0 ;;
    --skills-only) DO_CLI=0 ;;
    --skills-dir)
      SKILLS_DEST="$2"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--cli-only] [--skills-only] [--skills-dir PATH]"
      echo "  INSTALL_BIN=$INSTALL_BIN (symlink urpm here)"
      echo "  SKILLS_DEST=$SKILLS_DEST (copy urpm-* skill folders here)"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ ! -x "$CLI_SRC" ]] && [[ -f "$CLI_SRC" ]]; then
  chmod +x "$CLI_SRC"
fi

if [[ "$DO_CLI" -eq 1 ]]; then
  if [[ ! -f "$CLI_SRC" ]]; then
    echo "ERROR: missing $CLI_SRC" >&2
    exit 1
  fi
  mkdir -p "$INSTALL_BIN"
  ln -sf "$CLI_SRC" "$INSTALL_BIN/urpm"
  echo "✓ CLI: $INSTALL_BIN/urpm -> $CLI_SRC"
  if [[ ":$PATH:" != *":$INSTALL_BIN:"* ]]; then
    echo ""
    echo "  请将下列行加入 ~/.zshrc 或 ~/.bashrc 后执行 source："
    echo "  export PATH=\"$INSTALL_BIN:\$PATH\""
    echo ""
  fi
fi

if [[ "$DO_SKILLS" -eq 1 ]]; then
  mkdir -p "$SKILLS_DEST"
  for name in urpm-shared urpm-projects urpm-samples urpm-painpoints urpm-concepts urpm-consumers urpm-dashboard; do
    src="$ROOT/skills/$name"
    if [[ ! -d "$src" ]]; then
      echo "WARN: skip missing $src" >&2
      continue
    fi
    rm -rf "$SKILLS_DEST/$name"
    cp -R "$src" "$SKILLS_DEST/$name"
    echo "✓ Skill: $SKILLS_DEST/$name"
  done
  if [[ -f "$ROOT/skills/README.md" ]]; then
    cp "$ROOT/skills/README.md" "$SKILLS_DEST/URPM_SKILLS_README.md"
    echo "✓ Copied skills index -> $SKILLS_DEST/URPM_SKILLS_README.md"
  fi
fi

echo ""
echo "完成。验证:  export PATH=\"$INSTALL_BIN:\$PATH\"  &&  urpm --version"
