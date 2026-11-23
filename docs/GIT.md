# Git 仓库说明（给维护者）

这个仓库不复杂，可以把它理解成“一个网页 + 两个可选后端”。

## 仓库地址

- 代码：https://github.com/interested3041/cet-sprint
- 线上站点：https://interested3041.github.io/cet-sprint/
- 主分支：`main`

## 目录在仓库里各自干什么

| 路径 | 作用 | 会不会被 Pages 发布 |
| --- | --- | --- |
| `index.html` | 整站：四六级词库、样式、脚本、登录门全部内联 | 会，作为首页 |
| `docs/` | 架构、部署、登录页预览图 | 会，作为静态文件 |
| `cloudflare/` | GitHub 一键登录的 OAuth Worker | 不会，单独部署到 Cloudflare |
| `server/` | 可选的自建账号服务器，零依赖 Node | 不会，自己找机器跑 |
| `README.md` / `CHANGELOG.md` / `LICENSE` | 说明、版本记录、协议 | 不会 |

## 为什么有一个 Cloudflare Worker

GitHub Pages 只能放静态文件，不能安全保存 GitHub OAuth 的 `client_secret`，也不能直接跨域换 token。所以 `cloudflare/worker.js` 只做一件事：接住 GitHub 回调、校验 `state`、用 secret 换 token，再把 token 通过 URL fragment 交回静态站点。学习数据仍然在每个人的私密 Gist 里。

Worker 的环境变量：

- `GITHUB_CLIENT_ID`：OAuth App 的 Client ID
- `GITHUB_CLIENT_SECRET`：OAuth App 的 Client Secret（只存 Cloudflare，不进仓库）
- `STATE_SECRET`：给 OAuth state 做 HMAC 签名
- `SITE_URL`：登录完成后跳回的站点

## 日常怎么改

### 只改网页

改 `index.html` → 提交到 `main` → GitHub Pages 会自动重新构建。线上地址加 `?v=commit` 可以绕过缓存。

### 改一键登录

改 `cloudflare/worker.js` → 在 `cloudflare/` 目录执行 `npx wrangler deploy`。如果改了 OAuth App 的回调地址，记得同步改 GitHub OAuth App 设置里的 Authorization callback URL。

### 改自建服务器

改 `server/server.js` → 在那台服务器上重启 Node。GitHub Pages 上不会显示这个入口。

## 提交信息怎么写

用简单的前缀即可：

- `feat: ...` 新功能
- `fix: ...` 修 bug
- `docs: ...` 只改文档
- `chore: ...` 整理、依赖、配置

例如：

```text
feat(auth): 增加 GitHub 一键登录
fix(gate): 修复游客进度被云端覆盖
docs: 补充 Worker 部署说明
```

## 不要提交的东西

- 任何 `client_secret`、OAuth token、GitHub PAT
- `server/data/db.json`（已写进 `.gitignore`）
- 本地测试文件、截图、临时脚本
- `cloudflare/.dev.vars`（如果以后本地调试用）

## 发布方式

仓库正常用 `git push` 即可。之前遇到本机 `schannel` TLS 握手失败时，也用过 GitHub Contents API / Git Data API 直接提交；那只是网络问题的绕行，不是必须的发布方式。

## 一句话总结

`index.html` 是产品，`cloudflare/` 是登录中转，`server/` 是可选项；改网页就推 `main`，改登录就 `wrangler deploy`，密钥永远只放 Cloudflare 或本机环境变量里。
