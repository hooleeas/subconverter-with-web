# subconverter-with-web

基于 TypeScript + Hono 的订阅转换服务。把明文节点链接、Base64 订阅或多个上游订阅源聚合成 Clash、sing-box、Surge、Loon、Quantumult X 等客户端可直接使用的订阅，转换全在服务端完成，附带网页管理面板。

## 功能

- **聚合转换**：粘贴节点链接或订阅 URL，多个上游源合并后按原链接去重，一次输出
- **多格式输出**：Clash、sing-box、Base64、Surge、Loon、Quantumult X；按客户端 User-Agent 自动识别，也可用 `?clash` / `?sb` / `?b64` / `?surge` / `?loon` / `?quanx` 指定
- **订阅分组**：一个分组可放多个上游链接，一个订阅可组合多个分组，取订阅时自动合并去重
- **命名订阅链接**：自定义链接路径，可设置过期时间，过期链接自动删除
- **访客页与管理面板**：访客可生成一次性聚合链接；管理员在 `/admin` 管理订阅、分组、转换后端、规则模板和站点设置
- **规则模板**：默认使用 ACL4SSR，也可指定任意 HTTP(S) 的 ini 地址；ini 与 `.list` 规则文件首次读取后缓存 1 小时
- **导入便捷**：聚合页提供二维码和 sing-box 一键导入
- **数据备份**：管理面板可导出 / 导入全部数据（JSON）
- **网站图标**：默认使用内置 favicon（`public/favicon.webp`），可在管理面板「站点设置」里改图标链接；支持 webp，浏览器不支持 webp 时自动用 PNG（`public/favicon.png`）兜底
- **多存储后端**：本地与 Docker 用 SQLite，Cloudflare Workers / Pages 用 D1，同一套存储抽象

## 支持的协议

VLESS、VMess、Trojan、Shadowsocks、ShadowsocksR、Snell、Hysteria、Hysteria2、TUIC、AnyTLS、Mieru、WireGuard、SOCKS、HTTP、Naiveproxy、ShadowTLS。

各输出格式按客户端的支持情况筛选节点与传输方式。例如 sing-box 不输出其当前 outbound schema 不支持的 XHTTP、SSR、Mieru、TUIC v4、Snell v3 和非 `none` 的 VLESS encryption；WireGuard 按 sing-box endpoint schema 输出。

## 快速开始

### Docker

Run the current image:

```sh
docker run -d --name subconverter-with-web --restart unless-stopped \
  -p 3000:3000 -v "$PWD/data:/app/data" \
  ghcr.io/hooleeas/subconverter-with-web:latest
```

Check the service:

```sh
curl http://localhost:3000/version
```

It should return the product name and the current version.

Docker Compose:

```yaml
services:
  subconverter-with-web:
    image: ghcr.io/hooleeas/subconverter-with-web:latest
    container_name: subconverter-with-web
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

To build the image locally instead:

```sh
docker build -t subconverter-with-web .
docker run -d --name subconverter-with-web --restart unless-stopped \
  -p 3000:3000 -v "$PWD/data:/app/data" subconverter-with-web
```

Open `http://localhost:3000`. The SQLite file inside the container is `/app/data/app.db`.

### 本地运行

需要 Node.js 22.13 或更新版本。

```sh
npm install
npm run dev
```

数据默认写入 `data/app.db`，可用 `DB_PATH` 环境变量覆盖，端口可用 `PORT` 覆盖（默认 `3000`）。

### Cloudflare Workers

创建 D1 数据库，把数据库 ID 填入 `wrangler.toml` 的 `database_id`，然后部署：

```sh
npm run deploy:worker
```

### Cloudflare Pages

把 D1 数据库 ID 填入 `pages/wrangler.jsonc`，然后部署：

```sh
npm run deploy:pages
```

Pages 的静态文件来自 `public/`，API 由 `pages/functions/[[path]].ts` 转发到同一个 Hono 应用。

## 管理员账号

首次打开管理页 `/admin` 时按提示创建管理员账号（账号 1–64 位字母、数字、点、下划线或连字符；密码至少 8 位）。凭证以 PBKDF2 哈希保存，不存明文。管理 API 使用 `Authorization: Basic <base64(账号:密码)>`。

## 使用

- **首页**：每行输入一个节点链接或订阅 URL，点「生成聚合订阅链接」得到可加入客户端的订阅地址，可选过期时间。
- **管理页**：订阅、分组、转换后端（SUBAPI）、规则模板（SUBCONFIG）、站点、数据都在 `/admin` 里管理。
- **网站图标**：管理页「站点」里有「网站图标」一栏，填图标链接后点「保存图标」即可全站生效；默认 `/favicon.webp`。
- **格式后缀**：在订阅地址后加 `?clash`、`?sb`、`?b64`、`?surge`、`?loon` 或 `?quanx` 可强制指定输出格式；不加后缀时按客户端识别。
- **默认规则模板**：ACL4SSR `ACL4SSR_Online.ini`，也可在管理页或 API 请求中指定其他 HTTP(S) ini 地址。
- **默认转换后端**：本站内置后端；也可配置任意兼容的外部转换后端地址（须为 HTTPS）。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/version` | 返回 `subconverter-with-web v0.1.0` |
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/convert` | JSON `{ "text": "...", "urls": ["https://..."], "format": "singbox\|clash\|base64\|surge\|loon\|quanx" }` |
| `GET` | `/api/subscribe?target=clash&url=...` | 生成可直接导入客户端的转换订阅，`url` 可重复传入 |
| `GET` | `/:id` | 按命名订阅配置公开生成转换结果，支持 `?clash`、`?sb` 等格式后缀 |
| `GET` | `/api/subscriptions` | 列出命名订阅（管理） |
| `POST` / `PUT` / `DELETE` | `/api/subscriptions[/:id]` | 管理命名订阅（管理） |
| `GET` / `PUT` / `DELETE` | `/api/config[/:key]` | 读写持久化配置（管理） |
| `GET` | `/api/rules/template?url=...` | 读取并缓存 ini 模板 |

## 校验

```sh
npm run build
```

sing-box 输出已用 `sing-box check` 校验，Clash 输出已用 Mihomo `-t` 校验。客户端实际连接效果需在客户端侧验证。
