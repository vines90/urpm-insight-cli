#!/usr/bin/env bash
# 在本机终端执行（需能访问 GitHub，且已 gh auth login）
# 用法: ./push-to-github.sh
# 自定义仓库名: REPO_NAME=my-repo ./push-to-github.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

REPO_NAME="${REPO_NAME:-urpm-insight-cli}"

if git remote get-url origin &>/dev/null; then
  echo "已有 origin: $(git remote get-url origin)"
  echo "执行: git push -u origin main"
  git push -u origin main
else
  echo "创建 GitHub 仓库 ${REPO_NAME} 并推送..."
  gh repo create "${REPO_NAME}" --public --source=. --remote=origin --push
fi

echo ""
echo "完成。验证: git remote -v && git log -1 --oneline"
