# Vercel GitHub Proxy

基于 Vercel Functions 的 GitHub 高速下载代理，在代理页面右下角提供**下载源码**按钮。

## 功能特性

- 🔄 **通用代理** — 支持 `github.com`、`api.github.com`、`raw.githubusercontent.com` 等
- ⬇️ **一键下载** — 访问仓库页面时，右下角有绿色下载按钮
- 📦 **Archive 下载** — 支持 `archive/main.zip` 等压缩包高速下载
- 🔌 **API 代理** — 直接通过代理访问 GitHub API
- 🛡️ **CSP 友好** — 使用 iframe 桥接方案，按钮在你的域名上，不受 GitHub CSP 限制
- 📄 **零依赖** — 仅使用 Node.js 内置模块和 Vercel 原生 `fetch`

## 项目结构

```
github-proxy/
├── api/
│   └── proxy.js      # 核心代理逻辑（含 iframe 桥接页 + 下载按钮）
├── vercel.json        # Vercel 路由重写配置
├── package.json      # 项目声明（零依赖，CommonJS）
└── README.md        # 本文件
```

## 快速部署

### 方式一：GitHub 导入（推荐）

1. 将此仓库推送到你的 GitHub
2. 打开 [vercel.com/new](https://vercel.com/new)，选择该仓库
3. Framework Preset 选 **Other**，直接点 Deploy
4. 等待约 1 分钟部署完成

### 方式二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 使用方式

### 导航页（推荐）

访问 `https://你的域名/`，输入 `owner/repo`（如 `tanle-mtr/vercel-proxy`），点击 **Generate**，即可获得：

- ⬇️ **Download ZIP** — 一键下载当前分支源码压缩包
- 📦 **Browse** — 在代理中浏览仓库（带下载按钮）
- 🔌 **API** — 查看仓库 JSON 信息
- 📄 **Raw** — 查看 README 原始内容

### 直接访问仓库

访问 `https://你的域名/github.com/owner/repo`：

- 页面**顶部**有一个深色导航条，包含 🔌API、📄Raw、⬇️Download ZIP 按钮
- 页面**右下角**有一个浮动的绿色按钮 `⬇️ Download Source (main.zip)`
- 中间区域是 GitHub 仓库页面的 iframe 预览

### 命令行下载

```bash
# 下载源码 zip
curl -L "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip" -o source.zip

# aria2c 多线程加速
aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"

# API 调用
curl "https://你的域名/api.github.com/repos/owner/repo"
```

## 工作原理

```
浏览器 → https://你的域名/github.com/owner/repo
                ↓
        Vercel Rewrite (vercel.json)
                ↓
        api/proxy.js (Node.js)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
 仓库路径              其他路径（API/Raw/Archive）
    ↓                       ↓
 返回桥接页              直接代理上游
 （iframe + 按钮）
    ↓
 按钮 → /github.com/owner/repo/archive/refs/heads/main.zip
```

### 为什么用 iframe 桥接？

GitHub 是重度 SPA，且有严格的 CSP（内容安全策略）。之前的方案尝试在 GitHub 页面内注入按钮，都会被 CSP 拦截或 SPA 路由切换清除。

**iframe 桥接方案的核心思路**：
- 桥接页是**你自己域名下的 HTML**（不受 GitHub CSP 限制）
- 按钮在桥接页上（100% 可见、可点击）
- GitHub 页面在 iframe 里正常加载（功能完整）
- 两者互不干扰

## 配置说明

### 添加新域名

在 `api/proxy.js` 顶部修改 `ALLOWED` 数组：

```javascript
const ALLOWED = [
  'github.com',
  'api.github.com',
  // 添加更多...
];
```

### vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/proxy" }
  ]
}
```

## 限制

| 项目 | 限制 |
|---|---|
| 请求次数 | Hobby 计划 100 万次/月 |
| 带宽 | Hobby 计划 100GB/月 |
| 单次请求超时 | 约 10-60 秒（取决于 Vercel 配置） |
| 请求体大小 | 最大约 4.5MB |

## 常见问题

### 为什么不直接代理整个 GitHub 网页？

GitHub 的 SPA 架构 + CSP 策略使得在浏览器端注入脚本极不稳定。本方案采用 iframe 桥接，既保留了 GitHub 页面的完整性，又能在你自己的页面上稳定显示下载按钮。

### 下载速度慢怎么办？

使用 `aria2c` 多线程下载：

```bash
aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"
```

### 能用自定义域名吗？

可以。在 Vercel Dashboard → Settings → Domains 添加你的域名，按提示配置 DNS 即可。

## License

MIT
