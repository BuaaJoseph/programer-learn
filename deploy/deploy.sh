#!/usr/bin/env bash
# 在服务器上运行的一键部署脚本（需 root）。
# 用法：在仓库根目录执行  sudo bash deploy/deploy.sh
#
# 它会：
#   1) 如果装了 node，就用源码构建 dist；否则直接使用仓库里已有的 dist/
#   2) 把 dist/ 同步到 /var/www/learn
#   3) 安装 nginx 配置（域名 learn.aihaven.site + 单独端口 8081）
#   4) 校验并 reload nginx
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBROOT="/var/www/learn"
NGINX_CONF="/etc/nginx/conf.d/learn.aihaven.site.conf"

echo "==> 项目目录: $ROOT"

# 1) 构建（有 node 用 node，没有就解包仓库内预构建的 tarball）
#    低内存服务器现场构建容易在「rendering chunks」处假死/OOM——
#    可设 PREBUILT=1 直接用仓库内预构建包，跳过构建：  sudo PREBUILT=1 bash deploy/deploy.sh
if [ "${PREBUILT:-0}" != "1" ] && command -v npm >/dev/null 2>&1; then
  echo "==> 检测到 npm，开始构建"
  cd "$ROOT"
  npm ci || npm install
  # 显式放宽 Node 堆上限，避免默认上限在大体量站点构建时过早 OOM。
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}" npm run build
elif [ -f "$ROOT/deploy/learn-site.tar.gz" ]; then
  echo "==> 使用预构建包 deploy/learn-site.tar.gz（PREBUILT=1 或未检测到 npm）"
  rm -rf "$ROOT/dist"
  mkdir -p "$ROOT/dist"
  tar -xzf "$ROOT/deploy/learn-site.tar.gz" -C "$ROOT/dist"
else
  echo "!! 既无 npm 也无预构建包，无法部署。" >&2
  exit 1
fi

if [ ! -f "$ROOT/dist/index.html" ]; then
  echo "!! 找不到 dist/index.html，构建失败或仓库未带预构建包。" >&2
  exit 1
fi

# 2) 同步静态文件
echo "==> 部署静态文件到 $WEBROOT"
mkdir -p "$WEBROOT"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$ROOT/dist/" "$WEBROOT/"
else
  rm -rf "${WEBROOT:?}/"*
  cp -r "$ROOT/dist/." "$WEBROOT/"
fi
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true

# 3) 安装 nginx 配置
echo "==> 安装 nginx 配置到 $NGINX_CONF"
cp "$ROOT/deploy/nginx-learn.aihaven.site.conf" "$NGINX_CONF"

# 4) 校验并 reload
echo "==> 校验 nginx 配置"
nginx -t
echo "==> reload nginx"
nginx -s reload || systemctl reload nginx

echo ""
echo "✅ 部署完成"
echo "   - 单独端口自测:  curl -I http://127.0.0.1:8081/"
echo "   - 域名访问:      http://learn.aihaven.site/"
echo "   （请确认 DNS：learn.aihaven.site 的 A 记录已指向本机公网 IP 8.211.163.94，"
echo "     且安全组/防火墙放行 80 端口）"
