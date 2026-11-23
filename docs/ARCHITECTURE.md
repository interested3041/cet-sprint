# 技术说明

## 设计取舍

整个站点只有一个 `index.html`：数据、样式、脚本全部内联。原因是使用者多在手机上、网络不稳，单文件可以离线打开、也可以直接扔到任意静态托管（GitHub Pages、对象存储、本地文件）。

## 页面结构

- 最外层 `#gate` 是登录门（GitHub 直连 / 自建服务器两个标签）
- `#gate` 之下就是原来的背词应用，`LV` 决定加载四级还是六级数据
- 四级 `window.CET4_DATA`、六级 `window.CET6_DATA`、小测 `window.CET6_DAILY` 三段 JSON 内联在页面里

## 进度存储

浏览器 localStorage：

| key | 内容 |
| --- | --- |
| `cet6_progress_v1` / `cet4_progress_v1` | marks（1 认识 / 0 不认识）、sched（复习排期）、daily（小测作答）、acct |
| `gh_token` / `gh_user` / `gh_gist_id` | GitHub 直连凭据与 Gist 缓存 |
| `cet_token` / `cet_user` | 自建服务器会话 |
| `cet_level` | 上次选的级别 |

## GitHub Gist 同步

- 文件固定为 `cet-sprint.json`，gist 为 private
- 内容结构：`{ mode, cet6: {...}, cet4: {...} }`
- 写入：`PATCH /gists/{id}`，找不到就 `POST /gists` 新建；保存做了 1.5 秒防抖
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

- 单文件方案里四级只有「阅读式」卡片（词形/音标/释义/发音），没有例句与小测；六级是全套
- Gist 方案没有版本合并，离线改动不会自动补传
- 页面依赖第三方 TTS（有道/百度/Google），离线时退化为浏览器 `speechSynthesis`
