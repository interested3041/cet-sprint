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
# 200，且首页源码里能搜到「GitHub 直连」
```

## 二、GitHub 令牌（进度同步用）

1. 头像 → Settings → Developer settings → **Personal access tokens → Fine-grained tokens**
2. Token name 随便（如 `cet-sprint`），Expiration 设到考完
3. Repository access：不需要任何仓库权限
4. Permissions → Account permissions → 只勾 **Gists: Read and write**
5. 生成后复制 `github_pat_…`，贴进网页的「GitHub 直连」

注意：

- 令牌只存在浏览器 localStorage，不会上传
- 不要多人共用一个令牌：同一账号只有一份 `cet-sprint.json`，会互相覆盖
- 令牌泄露 = 别人能读写你的 Gist；发现泄露直接在该页面 Revoke

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
| 贴令牌 401 | 令牌复制不全/已过期，重新生成 |
| 建不了 Gist（404/403） | 令牌没勾 Gists 权限 |
| 两台设备进度不同 | 确认两边贴的是同一个 GitHub 账号的令牌 |
| 服务器登录 401 | 账号不存在或密码错；`server/data/db.json` 是否被清空 |

## 五、更新发布

```bash
git add -A
git commit -m "fix: ..."
git push
```

Pages 会在推送后自动重新构建，通常 1 分钟内生效。
