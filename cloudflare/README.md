# Cloudflare Worker · GitHub 一键登录

这个 Worker 只做 GitHub OAuth 中转：把授权码换成 token，再把 token 用 URL fragment 交回静态站点。它不保存学习数据，学习数据仍然在每个人的 GitHub Gist 里。

## 为什么需要它

静态页（GitHub Pages）不能安全保存 GitHub OAuth 的 `client_secret`，也不能直接跨域换 token。Worker 是免费的，正好补上这一步；朋友以后只点「GitHub 一键登录」，不需要自己生成 PAT。

## 一次性部署

```powershell
# 1. 登录 Cloudflare（浏览器里点 Allow）
cd D:\Documents\DouBao\cet-sprint\cloudflare
npx wrangler@latest login

# 2. 先部署，拿到 workers.dev 地址
npx wrangler@latest deploy
# 输出类似：https://cet-sprint-auth.<你的子域>.workers.dev

# 3. 去 GitHub 创建 OAuth App
#    https://github.com/settings/applications/new
#    Application name: CET Sprint
#    Homepage URL: https://interested3041.github.io/cet-sprint/
#    Authorization callback URL: https://cet-sprint-auth.<你的子域>.workers.dev/callback
#    创建后复制 Client ID 和 Client Secret

# 4. 写入 Worker 密钥（三条命令，按提示粘贴）
npx wrangler@latest secret put GITHUB_CLIENT_ID
npx wrangler@latest secret put GITHUB_CLIENT_SECRET
npx wrangler@latest secret put STATE_SECRET
# STATE_SECRET 随便生成一串 32 位以上随机字符，例如：
# [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# 5. 把 Worker 地址填进站点
# index.html 里搜索 CLOUD_AUTH，把 '' 改成 Worker 地址
```

## 环境变量

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | secret | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | secret | GitHub OAuth App 的 Client Secret，绝不能进前端 |
| `STATE_SECRET` | secret | 给 OAuth state 做 HMAC 签名，防 CSRF |
| `SITE_URL` | vars | 登录完成后跳回的站点，默认 `https://interested3041.github.io/cet-sprint/` |

## 接口

- `GET /health`：健康检查
- `GET /auth?level=cet4|cet6`：跳转 GitHub 授权
- `GET /callback`：GitHub 回调，校验 state、换 token、跳回站点

## 安全边界

- `client_secret` 只存在 Worker secret 里，前端永远拿不到。
- state 带 HMAC 签名和 10 分钟过期，回调时校验。
- token 通过 URL fragment 回传，fragment 不会发给服务器；站点读取后立刻从地址栏清掉。
- 只申请 `read:user gist` 两个权限，只用于读 GitHub 用户名和读写私密 Gist。
- Worker 不落库、不记录 token；如要更严格，可再升级成一次性 code + KV 交换。
