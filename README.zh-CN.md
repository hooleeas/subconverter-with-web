# subconverter-with-web

订阅转换 — 基于 [hooleeas/subconverter-new](https://github.com/hooleeas/subconverter-new) 的 TypeScript + Hono 重写版。把代理订阅链接转换成 Base64、Clash、sing-box、Surge、Loon、Quantumult X 六种格式，带网页管理面板。

[English](README.md) · [فارسی](README.fa.md)

---

## 架构

```mermaid
flowchart TB
    U[用户 / 客户端] -->|订阅链接| A[订阅转换]
    A -->|拉取上游| S[上游订阅]
    A -->|转换| F[Base64 / Clash / sing-box / Surge / Loon / QuanX]
    F --> U
    A --- DB[(存储)]
```

一套代码，三种部署，同一个存储接口（`Store`）：

```mermaid
flowchart LR
    subgraph 部署方式
        D[Docker] --> SQLite[(SQLite 文件)]
        P[Cloudflare Pages] --> D1
        E[EdgeOne Makers] --> B[(EdgeOne Blob)]
    end
```

| 部署方式 | 存储 | 入口 |
|---|---|---|
| Docker | SQLite 文件（`/app/data/app.db`） | `src/node.ts` |
| Cloudflare Pages | D1（`subconverter`） | `pages/functions/[[path]].ts` |
| EdgeOne Makers | Blob 存储（`subconverter`） | `cloud-functions/[[default]].ts` |

> 存储表第一次读写时自动建好（`CREATE TABLE IF NOT EXISTS kv`）。EdgeOne 的 Blob 没有过期功能，过期时间存在每条数据里面。

---

## 功能

- **全协议** — VLESS、VMess、Trojan、Shadowsocks、Hysteria2、TUIC、AnyTLS 等。
- **六种输出格式** — Base64、Clash、sing-box、Surge、Loon、Quantumult X。
- **管理面板** — 创建、编辑、删除订阅链接、分组、SUBAPI 后端、SUBCONFIG 规则模板。
- **两种链接**

  | | 访客链接 | 自用链接 |
  |---|---|---|
  | 路径 | `/api/<id>` | `/<id>` |
  | 能不能改 | 不能，删了重建 | 能 |
  | 管理员能看到 | 只有名字 | 全部详情 |

- **分组** — 把多个订阅源打成一个组；订阅可以用分组、直接源，或者两者一起用。
- **链接过期** — 设过期时间，到期自动删除。
- **一键导入** — 12 个客户端一键导入：sing-box、Shadowrocket、v2rayNG、FlClash、Clash Meta、Clash、Quantumult X、Surge、Loon、Hiddify、Stash、Karing。按访问者的设备自动过滤。
- **三种语言** — 中文、English、فارسی（RTL）。首次打开跟系统语言。
- **备份与恢复** — 全部数据导出/导入 JSON；恢复出厂清空所有数据。

---

## 订阅是怎么返回的

```mermaid
flowchart LR
    C[客户端] -->|GET /api/&lt;id&gt;?clash| A[程序]
    A -->|读记录| DB[(存储)]
    A -->|合并源和分组| G[订阅源]
    A -->|内置转换器| O[Clash YAML]
    A -->|或外部 SUBAPI| X[外部转换器]
    O --> C
    X --> C
```

文件名跟着订阅名走（`<名字>.yaml`、`<名字>.json`、`<名字>.conf`、`<名字>.txt`）。没填名字的默认 `sub-yyyy-mm-dd-HHMM`（台北时间）。

---

## 部署

### Docker

```sh
docker run -d --name subconverter-web \
  -p 127.0.0.1:25501:25501 \
  -v /opt/subconverter-with-web/data:/app/data \
  --restart unless-stopped \
  hooleeas/subconverter-with-web:latest
```

或用 Compose（把下面存为 `/opt/subconverter-with-web/docker-compose.yml`）：

```yaml
services:
  subconverter-web:
    image: hooleeas/subconverter-with-web:latest
    ports:
      - "127.0.0.1:25501:25501"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

镜像平台：`linux/amd64`、`linux/arm64`、`linux/arm/v7`。

卸载（用 `docker run` 安装的）：

```sh
docker stop subconverter-web && docker rm subconverter-web
docker rmi hooleeas/subconverter-with-web:latest
# 可选：整个目录一起删，包括全部数据（订阅、设置），删了找不回来
rm -rf /opt/subconverter-with-web
```

卸载（用 Compose 安装的）：

```sh
docker compose down
docker rmi hooleeas/subconverter-with-web:latest
# 可选：整个目录一起删，包括全部数据和 compose 文件，删了找不回来
rm -rf /opt/subconverter-with-web
```

### Cloudflare Pages

需要一个 Cloudflare 账号，全程在[Cloudflare 控制台](https://dash.cloudflare.com)里点鼠标，不用命令行。

1. **建 D1 数据库。**控制台里进 **Storage & Databases → D1 SQL → Create**，名字随便填（比如 `subconverter`）。数据存在这里，表第一次用时自动建好。
2. **建 Pages 项目。**进 **Workers & Pages → Create → Pages → Connect to Git**，选这个仓库，填：
   - 构建命令：`npm ci && cp public/admin.html public/admin-page`
   - 构建输出目录：`public`
3. **绑数据库。**在项目里进 **Settings → Bindings → Add → D1 database**，选刚建的那个库，变量名填 `DB`——这个名字是死的，程序就是读 `DB` 这个变量。
4. **部署。**保存后 Cloudflare 就开始部署，网站在 `https://<项目名>.pages.dev`，以后推送代码会自动部署。

打开就能用——一开始没设管理员密码，`/admin` 直接进。想锁上时去**站点设置**里设密码。

### EdgeOne Makers

需要一个 EdgeOne 账号（腾讯云），全程在 [EdgeOne 控制台](https://edgeone.ai)里点鼠标，不用命令行。

1. 控制台里进 **Makers**，点 **Create project → Import Git repository**。
2. 连接 GitHub，选这个仓库。构建配置是自动识别的（Hono）：构建命令 `npm run build`、输出目录 `public`、生产分支 `main`，确认后点 **Start deployment**。
3. 部署完控制台会给你一个网址（长这样 `https://<项目名>-<部署ID>.edgeone.dev`）。打开就能用——一开始没设管理员密码，`/admin` 直接进。

打开网站后，去**站点设置**里设默认的 SUBAPI 和 SUBCONFIG，不然首页点生成会提示管理员还没配置默认值；想锁上管理面板时也在那里设密码。

---

## 使用

1. 打开首页，选 SUBAPI 和 SUBCONFIG，粘贴一个或多个订阅链接（或节点链接），点**生成**。
2. 复制链接，或点导入按钮直接在客户端里打开。
3. 打开 `/admin` 管理链接、分组、后端、规则模板和站点设置。

管理员账号不是必设的：没设账号时管理面板直接能进。在**站点设置**里设了账号密码后才需要登录。

---

## 接口（简表）

| 方法与路径 | 作用 |
|---|---|
| `GET /api/health` | 健康检查 → `{"ok":true}` |
| `GET /version` | `subconverter-with-web v0.1.0` |
| `POST /api/subscribe` | 创建访客链接 |
| `GET /api/:id` | 取访客链接（`?clash`、`?sb`、`?surge`、`?quanx`、`?loon`、`?b64`） |
| `GET /:id` | 取自用链接（同上格式参数） |
| `POST /api/convert` | 把提交的链接/节点转成指定格式 |
| `GET /sub?target=<格式>&url=<订阅>` | 兼容老 subconverter 的接口 |
| `GET /api/public/options` | 后端、规则模板、站点标题、图标 |
| `GET /api/admin/*` | 管理：链接、分组、配置、数据导出/导入 |

---

## 开发

```sh
npm ci
npm run build   # tsc
npm run dev     # 本地跑在 :25501（SQLite）
```

## 协议

MIT
