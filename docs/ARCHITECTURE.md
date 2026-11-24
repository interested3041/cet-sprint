# 技术说明

## 设计取舍

整个站点只有一个 `index.html`：数据、样式、脚本全部内联。原因是使用者多在手机上、网络不稳，单文件可以离线打开、也可以直接扔到任意静态托管（GitHub Pages、对象存储、本地文件）。

## 页面结构

- 最外层 `#gate` 是登录门：先选级别，再选游客进入或 GitHub 一键登录；不预选级别
- `#gate` 之下就是背词应用，`LV` 决定加载四级还是六级数据
- 四级 `window.CET4_DATA`、六级 `window.CET6_DATA`、六级小测 `window.CET6_DAILY` 内联在页面里；四级小测在运行时由当天词表生成，翻译题库是 `window.CET4_TRANS`

## 进度存储

浏览器 localStorage：

| key | 内容 |
| --- | --- |
| `cet6_progress_v1` / `cet4_progress_v1` | marks（1 认识 / 0 不认识）、sched（复习排期）、daily（小测作答） |
| `gh_token` / `gh_user` / `gh_avatar` / `gh_gist_id` | GitHub 登录凭据与 Gist 缓存 |
| `cet_token` / `cet_user` | 自建服务器会话 |
| `cet_level` | 上次选的级别 |
| `cet_entered` | 本机已进入过；根链接再次打开直接进内容，退出登录时清除 |
| `guest_mode` | 游客模式标记；登录时清除 |

## GitHub OAuth 一键登录

静态页不能安全保存 `client_secret`，所以加了一个极薄的 Cloudflare Worker（`cloudflare/worker.js`）：

1. 站点跳转 `GET https://cet-sprint-auth.cet-sprint.workers.dev/auth?level=cet4|cet6`
2. Worker 生成带 HMAC 签名 + 10 分钟过期的 `state`，302 到 GitHub `authorize`，scope 为 `read:user gist`
3. GitHub 回调 Worker `/callback?code&state`；Worker 校验 state，用 `client_id + client_secret + code` 换 access token
4. Worker 读 `GET /user` 拿 login/avatar，再 302 回站点，把 token 放在 URL fragment（`#gh_token=...`）
5. 站点读取 fragment 后立刻 `location.replace` 清掉 hash，并进入 `?oauth=1`；`gateGh()` 拉取/合并 Gist 后正式进入
6. 网页端只拿到短期 token，不接触 client_secret；Worker 不保存 token

这样朋友只点一次 GitHub 授权，不用理解 PAT。部署与 OAuth App 创建见 `cloudflare/README.md`。

## GitHub Gist 同步

- 文件固定为 `cet-sprint.json`，gist 为 private
- 内容结构：`{ mode, cet6: {...}, cet4: {...} }`
- 写入：`PATCH /gists/{id}`，找不到就 `POST /gists` 新建；保存做了 0.4 秒防抖
- 读取：登录时 `GET /gists?per_page=100` 找同名文件，再 `GET /gists/{id}`
- 冲突：同一账号多设备同时写会互相覆盖（最后写入生效），2-3 人各自一个账号时没有这个问题

## 自建服务器 API

零依赖 Node HTTP 服务，数据存 `server/data/db.json`：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/register` | `{user,password,mode}` → token |
| POST | `/api/login` | `{user,password,mode}` → token |
| GET | `/api/data` | Bearer → `{data:{cet6,cet4},mode}` |
| PUT | `/api/data` | `{level,data}` 覆盖该级别进度 |

密码用 `scrypt` 加盐哈希，token 随机 48 位，存 `tokens` 映射。没有限流、没有邮箱验证，按 2-3 人规模设计。

## 已知边界

- 四级是「20 天 × 100 词 + 8 道词汇 MCQ + 1 段中译英」，不含听力/阅读/写作；六级才是四部分
- Gist 方案没有版本合并，离线改动不会自动补传；多设备同时写以最后写入为准
- 游客同步链接/导出一次只覆盖当前级别，不会把四六级一起打包
- 页面依赖第三方 TTS（有道/百度/Google），离线时退化为浏览器 `speechSynthesis`
