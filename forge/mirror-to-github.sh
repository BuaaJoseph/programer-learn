#!/usr/bin/env bash
# 把这个 forge/ 目录镜像推送到独立的 GitHub 仓库 https://github.com/BuaaJoseph/forge
#
# 背景：本课程的源码维护在 programer-learn 仓库的 forge/ 子目录里，方便和课程一起演进。
# 但 forge 本身要作为一个可独立 npm 安装的项目存在于它自己的仓库。这个脚本负责同步。
#
# 用法（在本机、已配置好对 BuaaJoseph/forge 的推送权限后运行）：
#   cd forge
#   ./mirror-to-github.sh "提交说明"
#
# 它会把 forge/ 的当前内容作为一次提交推送到 forge 仓库的 main 分支。
set -euo pipefail

REMOTE_URL="${FORGE_REMOTE:-git@github.com:BuaaJoseph/forge.git}"
MSG="${1:-sync from course repo}"
HERE="$(cd "$(dirname "$0")" && pwd)"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "→ 克隆 $REMOTE_URL"
if git clone --depth 1 "$REMOTE_URL" "$WORK" 2>/dev/null; then
  # 清掉旧内容（保留 .git），再拷入当前 forge 内容
  find "$WORK" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
else
  echo "→ 远端为空或克隆失败，初始化新仓库"
  rm -rf "$WORK"; mkdir -p "$WORK"
  git -C "$WORK" init -q
  git -C "$WORK" remote add origin "$REMOTE_URL"
fi

# 拷贝 forge 源码（排除 node_modules / dist / .git）
rsync -a --exclude node_modules --exclude dist --exclude '.git' "$HERE"/ "$WORK"/

cd "$WORK"
git add -A
if git diff --cached --quiet; then
  echo "→ 无变更，跳过"
  exit 0
fi
git -c user.name="BuaaJoseph" -c user.email="duchangchun1991@gmail.com" commit -q -m "$MSG"
git branch -M main
git push -u origin main
echo "✓ 已推送到 $REMOTE_URL (main)"
