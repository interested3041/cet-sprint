# 四六级冲刺背诵 · 20 天

一个单文件网页，把四六级考前 20 天拆成每天 100 个词：四级 2000 词、六级 1200 词，两个级别都有 20 套每日小测。带发音、错词本、间隔复习（1/2/4/7/15 天）、写作默写、翻译对照。不想登录可点「游客进入」，进度存本机并支持导出/链接同步；登录后点「GitHub 一键登录」自动云同步，换设备直接接着背，不用再手动生成令牌。

- 在线使用：https://interested3041.github.io/cet-sprint/
- 离线使用：下载 `index.html` 双击即可，所有数据都在这一个文件里

![登录页预览](docs/preview.png)

## 功能

- **两个级别**：四级（20 天 × 100 词 + 20 套词汇/翻译小测）、六级（20 天 × 100 词 + 20 套听力/阅读/翻译/写作小测），页头 👤 随时切换
- **GitHub 一键登录**：Cloudflare Worker 中转 OAuth，朋友只点授权，不用自己生成 PAT；可选令牌登录作为备用
- **单词卡**：词形 / 音标 / 释义 / 搭配，真人发音（有道，失败自动切百度、Google、浏览器朗读）
- **分类背诵**：六级分阅读 60 / 写作 15 / 翻译 15 / 听力 10；四级走阅读式卡片
- **写作默写**：给中文 + 关键词，按词级 LCS 批改
- **翻译对照**：先写中文再对参考译文，标出关键词命中
- **每日小测**：六级 4 题（听力/阅读/翻译/写作），四级 8 个词 + 1 段翻译；当天解锁、自动判分、答案存档，首页有未做提醒
- **错词本 + 遗忘曲线**：标 ✗ 的词自动进入，按 1/2/4/7/15 天排期，「记住了」推到下一轮、「还是不会」重置
- **其他**：乱序、只看未掌握、搜索、夜间模式、回到顶部、类别栏吸顶、切类记住滚动位置、导出/导入

## 进度怎么存

### 免登录：游客模式

登录页点「游客进入（免账号，数据存本机）」→ 选四级/六级 → 直接背。进度只在这台设备的 localStorage，换设备时：

- 点「☁ 同步」→ 生成同步链接，发到新设备打开即恢复
- 或导出 JSON，在新设备导入

之后想自动云同步，随时在 👤 面板点「登录 / 换设备同步」，本机游客进度会合并到云端。

### 方式一：GitHub 一键登录（推荐）

1. 登录页选择四级/六级 → 点「GitHub 一键登录（推荐，自动同步）」
2. 在 GitHub 页面点 **Authorize cet-sprint**，浏览器会跳回本站并自动登录
3. 站点在你的账号下找 `cet-sprint.json` 的私密 Gist，没有就建一个，之后每 1.5 秒防抖写回
4. 换设备再点一次一键登录，自动读回；朋友用他们自己的 GitHub 账号即可，数据互不相通

这条链路需要仓库里 `cloudflare/` 的 Worker 已经部署，并配置好 GitHub OAuth App 的 Client ID / Secret。一次性部署步骤见 [`cloudflare/README.md`](cloudflare/README.md)。普通使用者不需要接触这些配置。

如果一键登录临时不可用，登录页仍保留「改用 GitHub 令牌登录（备用）」：在 GitHub 生成只勾 **Gists: Read and write** 的 Fine-grained token，贴进来即可。令牌只存在浏览器 localStorage；数据只在你自己账号的私密 Gist 里。别把令牌发给别人——拿到令牌的人能读写你的 Gist。

### 方式二：自建服务器（想用账号密码、多人共用一台）

```bash
cd server
node server.js        # Node >= 16，无需 npm install，默认 8080
```

GitHub Pages 上这个入口已隐藏；当你用 `server/` 自己部署并从服务器地址打开页面时，登录页才会出现「自建服务器」，注册账号即可，数据存 `server/data/db.json`。公网部署务必上 HTTPS。

## 目录结构

```
index.html           # 整站（四六级数据、样式、脚本全部内联）
cloudflare/          # GitHub OAuth 中转 Worker（一键登录用）
  worker.js
  wrangler.toml
  README.md
server/              # 可选的自建账号服务器（零依赖）
  server.js
  package.json
  start.sh / start.bat
docs/
  DEPLOY.md          # 部署与令牌配置、排错
  ARCHITECTURE.md    # 技术实现与数据结构
  GIT.md             # 仓库目录、提交流程与密钥边界
  preview.png        # 登录页截图
CHANGELOG.md
LICENSE
```

## 仓库说明（给维护者）

仓库地址是 https://github.com/interested3041/cet-sprint，主分支 `main`。可以把它理解成“一个网页 + 两个可选后端”：

- `index.html` 是整站，GitHub Pages 直接发布它
- `cloudflare/` 是 GitHub 一键登录的 OAuth Worker，单独 `wrangler deploy`，不会被 Pages 发布
- `server/` 是可选的自建账号服务器，只有你自己部署时才用
- 密钥只放 Cloudflare 环境变量，绝不进仓库

更完整的目录职责、提交前缀、日常改动流程和“不要提交什么”，见 [`docs/GIT.md`](docs/GIT.md)。

## 本地开发

没有构建步骤，改完 `index.html` 直接刷新即可。四级词库在文件里的 `window.CET4_DATA`，六级在 `window.CET6_DATA`，小测在 `window.CET6_DAILY`。

## 数据说明

- 四级 2000 词取自公开四级词汇表（2607 词），按确定性哈希打散后排成 20 天，避免一直停在 A 开头
- 六级 1200 词与 20 套小测按真题话题自建，属于高频核心词整理，不是官方词频表，也不押题
- 音标与释义来自公开词表，例句为自建；发现错误欢迎提 issue

## 隐私

站点本身不收集任何数据，没有埋点、没有业务后端。进度只存在两处：浏览器 localStorage 和你的私密 Gist。Cloudflare Worker 只在中转 OAuth 时接触一次性授权码，不保存 token，也不保存学习数据。

## License

[MIT](LICENSE)

