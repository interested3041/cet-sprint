# 部署说明

站点是一个自包含的 `index.html`，没有任何构建步骤和外部依赖，所以「部署」就是把文件放到能访问的地方。

## 一、GitHub Pages（推荐，免费）

### 网页操作

1. 打开仓库 `interested3041/cet-sprint` → **Settings** → **Pages**
2. Source 选 `Deploy from a branch`，分支 `main`，目录 `/ (root)` → **Save**
3. 等 1–2 分钟，访问 `https://interested3041.github.io/cet-sprint/`

### 命令行

```bash
gh api -X POST repos/interested3041/cet-sprint/pages \
  -f "source[branch]=main" -f "source[path]=/"
# 查看构建状态
gh api repos/interested3041/cet-sprint/pages/builds/latest
```

检查：

```bash
curl -I https://interested3041.github.io/cet-sprint/
# 200，且首页源码里能搜到「GitHub 一键登录」
```

## 二、GitHub 一键登录（推荐）

登录页的「GitHub 一键登录」需要先部署 `cloudflare/worker.js`，再创建一个 GitHub OAuth App。完整步骤见 [`cloudflare/README.md`](../cloudflare/README.md)，核心是：

1. `cd cloudflare && npx wrangler login && npx wrangler deploy`
2. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
   - Homepage URL：`https://interested3041.github.io/cet-sprint/`
   - Authorization callback URL：`https://cet-sprint-auth.cet-sprint.workers.dev/callback`
3. 把 Client ID / Client Secret / STATE_SECRET 写进 Worker secret
4. 确认 `index.html` 里的 `CLOUD_AUTH` 指向 Worker 地址

朋友以后只点一次「GitHub 一键登录」，不用生成 PAT。

### 备用：GitHub 令牌

如果一键登录临时不可用，登录页还保留「改用 GitHub 令牌登录（备用）」：

1. 头像 → Settings → Developer settings → **Personal access tokens → Fine-grained tokens**
2. Permissions → Account permissions → 只勾 **Gists: Read and write**
3. 生成后复制 `github_pat_…`，贴进备用令牌框

令牌只存在浏览器 localStorage，不会上传；不要多人共用一个令牌。

## 三、自建服务器（可选）

适合「不想每人一个令牌」「想用账号密码」的多人场景。

```bash
cd server
node server.js            # 默认 8080，PORT 可改
```

- 数据文件：`server/data/db.json`（首次写入自动创建，已在 .gitignore 里）
- 账号：登录页「自建服务器」标签注册
- 公网必须 HTTPS，否则密码明文；用 Nginx 反代示例：

```nginx
server {
  listen 443 ssl;
  server_name your.domain;
  ssl_certificate     /etc/ssl/fullchain.pem;
  ssl_certificate_key /etc/ssl/privkey.pem;
  location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }
}
```

## 四、排错

| 现象 | 处理 |
| --- | --- |
| Pages 404 | 检查分支是否 main、目录是否根、Actions 里 pages build 是否成功 |
| 页面空白但 200 | 浏览器禁用 JS？或下载的 index.html 不完整，重新拉一次 |
| 一键登录点完报 404 | GitHub OAuth App 的 Client ID 填错，核对 `GITHUB_CLIENT_ID` |
| 一键登录回调 `state` 校验失败 | 清掉浏览器旧标签，重新从登录页发起；检查 `STATE_SECRET` 是否为空 |
| 贴令牌 401 | 令牌复制不全/已过期，重新生成 |
| 建不了 Gist（404/403） | 令牌没勾 Gists 权限 |
| 两台设备进度不同 | 确认两边登录的是同一个 GitHub 账号，或两边都贴同一个令牌 |
| 服务器登录 401 | 账号不存在或密码错；`server/data/db.json` 是否被清空 |

## 五、更新发布

```bash
git add -A
git commit -m "fix: ..."
git push
```

Pages 会在推送后自动重新构建，通常 1 分钟内生效。
