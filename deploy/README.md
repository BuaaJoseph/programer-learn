# 部署到 learn.aihaven.site

> 说明：构建环境的网络策略禁止对外 SSH（22 端口），无法从这里直接登录服务器部署。
> 因此把站点打包好并附上一键脚本，请在你自己的服务器 SSH 会话里执行。

## 方案概览

- 站点是纯静态 SPA（Vite 打包产物）。
- nginx 在**单独端口 8081** 上提供静态文件；域名 `learn.aihaven.site` 在 80 端口反代到 8081。
- 完全不动你现有的「80 默认站点 / 8080 服务」。

> ℹ️ **生产服务器（8.211.163.94）已安装 Node**。因此 `deploy.sh` 默认走「源码现场构建」，
> 始终部署最新内容，**无需再手动刷新预构建包**。下文的预构建包相关说明仅作为「无 Node 环境」的备用方案保留。
> 项目目录在服务器上为 `/home/learn/programer-learn`。

## 一键部署（服务器上执行，需 root）

```bash
# 1) 拉取代码（服务器需能访问 GitHub）
git clone -b claude/hopeful-feynman-dpgge3 https://github.com/BuaaJoseph/programer-learn.git
cd programer-learn

# 2) 运行部署脚本
sudo bash deploy/deploy.sh
```

脚本会自动：装了 node 就源码构建，没装就解包 `deploy/learn-site.tar.gz`；
把站点同步到 `/var/www/learn`；安装 nginx 配置并 reload。

## 更新已部署的站点 / 上新课

```bash
cd programer-learn
git pull        # 或：git fetch origin && git reset --hard origin/<分支>
sudo bash deploy/deploy.sh
```

更新后强刷浏览器（Ctrl/Cmd + Shift + R）或用无痕窗口查看。

### 两条部署路径，区别很重要

`deploy.sh` 会根据服务器**有没有 Node** 走不同路径：

| 服务器环境 | deploy.sh 行为 | 注意事项 |
| --- | --- | --- |
| **装了 Node/npm** | 用最新源码 `npm run build` 现场构建 | 一劳永逸，永远是最新内容 |
| **没装 Node** | 解包仓库内预构建的 `deploy/learn-site.tar.gz` | 该包需在**开发侧**更新内容后重新生成并提交，否则 `git pull` 拉到的还是旧内容 |

> ⚠️ 如果你服务器没装 Node，又发现「更新代码后页面没变」，几乎都是因为预构建包没刷新。
> 开发侧用 `bash deploy/pack.sh` 重新打包并提交即可。

### 推荐：给服务器装 Node（一劳永逸）

装上后 `deploy.sh` 直接走源码构建，再不依赖预构建包：

```bash
# CentOS / RHEL / 阿里云 Linux
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

node -v && npm -v   # 验证
```

装完流程不变，仍是 `git pull && sudo bash deploy/deploy.sh`，但会自动用最新源码构建。

## 开发侧：内容更新后刷新预构建包

> 仅在「服务器没装 Node」时需要。

```bash
bash deploy/pack.sh                      # 重新构建并打包 deploy/learn-site.tar.gz
git add deploy/learn-site.tar.gz && git commit -m "chore: 刷新预构建包" && git push
```


## 不想用脚本？手动三步

```bash
# 1) 放置静态文件
sudo mkdir -p /var/www/learn
sudo tar -xzf deploy/learn-site.tar.gz -C /var/www/learn

# 2) 安装 nginx 配置
sudo cp deploy/nginx-learn.aihaven.site.conf /etc/nginx/conf.d/learn.aihaven.site.conf

# 3) 校验并重载
sudo nginx -t && sudo nginx -s reload
```

## 部署后自检

```bash
curl -I http://127.0.0.1:8081/         # 单独端口本机自测，应 200
curl -I -H "Host: learn.aihaven.site" http://127.0.0.1/   # 域名路由自测
```

## 还需要你确认的两件事

1. **DNS**：把 `learn.aihaven.site` 的 A 记录指向 `8.211.163.94`。
2. **防火墙/安全组**：放行入站 80 端口（如果直接暴露 8081 也要放行 8081）。

## 想上 HTTPS？

装好 certbot 后：

```bash
sudo certbot --nginx -d learn.aihaven.site
```

certbot 会自动给上面的 80 端口 server 块加 443 与证书。
