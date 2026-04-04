# 线上部署说明

目标域名：`eand.cn`

## 已补充的项目配置

- 服务支持通过 `HOST` 绑定外网监听，默认 `0.0.0.0`
- 服务支持 `PUBLIC_BASE_URL`，线上可设置为 `http://eand.cn` 或 `https://eand.cn`
- 新增健康检查接口：`/healthz` 和 `/api/healthz`
- 提供 Nginx HTTP 配置：`deploy/eand.cn.nginx.conf`
- 提供 Nginx HTTPS 示例：`deploy/eand.cn.nginx.https.conf`
- 提供 systemd 服务配置：`deploy/virtual-pet.service`
- 提供一键安装脚本：`deploy/install_server.sh`
- 提供环境变量模板：`.env.example`

## 服务器正式目录

当前正式环境按你的服务器实际路径建议使用：

```bash
/home/codex_test
```

如果后续你要改成更标准的发布目录，再迁到：

```bash
/var/www/virtual-pet
```

## 1. 上传代码并安装 Node.js / MySQL / Nginx

要求：

- Node.js 18+
- MySQL 8+
- Nginx
- 已解析域名 `eand.cn` 和 `www.eand.cn` 到服务器公网 IP

## 2. 准备两份环境变量配置

项目内已保留两份 MySQL 配置：

- 本地测试配置：`.env.local.example`
- 正式环境配置：`.env.production.example`

代码默认行为：

- `NODE_ENV=development` 时默认使用本地测试库配置，不改你本地现有 MySQL 配置
- `NODE_ENV=production` 时默认使用正式环境库配置：`root / WangHui@0710`

正式环境部署时，建议把正式模板复制为服务器上的 `.env`。

在服务器项目目录创建 `.env`：

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=5173
PUBLIC_BASE_URL=http://eand.cn
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=virtual_pet
```

说明：

- 应用启动时会自动创建数据库 `virtual_pet`
- 也会自动执行 `db/schema.sql`

## 3. 安装依赖并启动应用

```bash
npm install --production
node server.js
```

本地验证：

```bash
curl http://127.0.0.1:5173/healthz
```

## 4. 一键初始化正式环境

如果你已经在服务器项目目录中，且当前项目路径就是 `/home/codex_test`，可直接执行：

```bash
chmod +x deploy/install_server.sh
sudo bash deploy/install_server.sh
```

如果需要自定义域名、端口或运行用户，可以这样执行：

```bash
sudo DOMAIN=eand.cn WWW_DOMAIN=www.eand.cn APP_PORT=5173 APP_USER=root APP_GROUP=root bash deploy/install_server.sh
```

脚本会自动完成：

- 若不存在 `.env`，则用 `.env.production.example` 生成
- 执行 `npm install --production`
- 写入 systemd 服务文件
- 写入 Nginx 配置文件
- 重载并启动 `virtual-pet`
- 检查 Nginx 配置并重载

默认行为：

- 脚本默认只生成 HTTP 配置，不依赖现成证书
- 首次部署不会因为缺少 `/etc/letsencrypt/live/...` 证书文件导致 `nginx -t` 失败

如果已经签发好证书，想直接写入 HTTPS 配置，可执行：

```bash
sudo ENABLE_HTTPS=true bash deploy/install_server.sh
```

如果还没有 SSL 证书，脚本执行完成后再运行：

```bash
sudo certbot --nginx -d eand.cn -d www.eand.cn
```

## 5. 手动配置 systemd 常驻运行

复制 `deploy/virtual-pet.service` 到：

```bash
/etc/systemd/system/virtual-pet.service
```

按实际路径修改三处。你当前正式环境应改成：

- `WorkingDirectory=/home/codex_test`
- `EnvironmentFile=/home/codex_test/.env`
- `ExecStart=/usr/bin/node /home/codex_test/server.js`

然后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable virtual-pet
sudo systemctl start virtual-pet
sudo systemctl status virtual-pet
```

说明：

- 当前模板默认使用 `root:root`，这是为了兼容你当前服务器环境
- 如果后续你创建了专门运行用户，再把 `User` 和 `Group` 改掉即可

## 6. 配置 Nginx

只开 HTTP 时，复制 `deploy/eand.cn.nginx.conf` 到：

```bash
/etc/nginx/conf.d/eand.cn.conf
```

如果已经申请好证书，需要 HTTPS，再改用：

```bash
deploy/eand.cn.nginx.https.conf
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7. 申请 HTTPS 证书

如果服务器已安装 Certbot：

```bash
sudo certbot --nginx -d eand.cn -d www.eand.cn
```

完成后访问：

```bash
https://eand.cn
```

## 8. 排查命令

```bash
curl -I http://127.0.0.1:5173/healthz
curl -I http://eand.cn
curl -I https://eand.cn
sudo journalctl -u virtual-pet -n 200 --no-pager
```

## 9. 一键启动正式环境

初始化完成后，项目内提供了一个一键启动脚本：

```bash
chmod +x deploy/start_server.sh
sudo bash deploy/start_server.sh
```

脚本会自动执行：

- 检查 `/home/codex_test/.env` 是否存在
- 运行 `npm run check`
- `systemctl enable/restart virtual-pet`
- 检查并重启 Nginx
- 验证 `http://127.0.0.1:5173/healthz`

如果你只想启动应用，不想同时动 Nginx：

```bash
sudo CHECK_NGINX=false bash deploy/start_server.sh
```

## 10. 代码更新后重新发布

项目内提供了一个最简重发脚本：

```bash
chmod +x deploy/redeploy.sh
bash deploy/redeploy.sh
```

脚本会自动执行：

- 检查工作区是否干净
- `git pull --no-rebase`
- `npm install --production`
- `npm run check`
- 重启 `virtual-pet`
- 检查并重载 Nginx
- 验证 `http://127.0.0.1:5173/healthz`

如果你要指定分支，例如 `main`：

```bash
BRANCH=main bash deploy/redeploy.sh
```

## 当前限制

我已经把项目内的线上部署配置补齐，但当前工作区无法直接替你登录服务器、改 DNS、签发证书或验证公网访问结果。要真正让 `eand.cn` 可访问，还需要在你的 Linux 服务器上执行上述部署步骤。
