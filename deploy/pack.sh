#!/usr/bin/env bash
# 开发侧使用：重新构建并刷新预构建包 deploy/learn-site.tar.gz。
# 当目标服务器没有 Node 时，部署依赖这个包——所以每次内容更新后、推送前都应跑一次。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 构建"
npm run build

echo "==> 打包到 deploy/learn-site.tar.gz"
tar -czf deploy/learn-site.tar.gz -C dist .

echo "✅ 完成：$(ls -lh deploy/learn-site.tar.gz | awk '{print $5}')"
echo "   记得 git add deploy/learn-site.tar.gz && commit && push"
