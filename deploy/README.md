# 部署到 learn.aihaven.site

> 说明：构建环境的网络策略禁止对外 SSH（22 端口），无法从这里直接登录服务器部署。
> 因此把站点打包好并附上一键脚本，请在你自己的服务器 SSH 会话里执行。

## 方案概览

- 站点是纯静态 SPA（Vite 打包产物）。
- nginx 在**单独端口 8081** 上提供静态文件；域名 `learn.aihaven.site` 在 80 端口反代到 8081。
- 完全不动你现有的「80 默认站点 / 8080 服务」。

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
