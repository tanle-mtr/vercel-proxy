# Vercel GitHub Proxy

基于 Vercel Functions 的 GitHub 高速下载代理。

## 功能

- **仓库浏览**：`https://域名/github.com/owner/repo`
- **源码下载**：导航页输入 `owner/repo` 一键生成下载链接
- **API 代理**：`https://域名/api.github.com/repos/owner/repo`
- **Raw 文件**：`https://域名/raw.githubusercontent.com/owner/repo/branch/file`
- **Release 下载**：`https://域名/github.com/owner/repo/releases/download/v1.0/file.zip`
- **Archive 下载**：`https://域名/github.com/owner/repo/archive/refs/heads/main.zip`

## 部署

1. 删除 Vercel 上现有的 vercel-proxy 项目
2. 删除 GitHub 上旧的仓库，或创建全新仓库
3. 将 `api/proxy.js`、`vercel.json`、`package.json` 推送到仓库
4. Vercel Dashboard → Add New → Project → 选择仓库 → Deploy

## 文件结构

```
github-proxy/
├── api/
│   └── proxy.js      ← 核心代理逻辑（Node.js Runtime）
├── vercel.json        ← 路由重写配置
└── package.json      ← 项目声明（零依赖）
```

## 使用方式

### 方式一：导航页（推荐）

访问 `https://你的域名/`，输入 `owner/repo`（如 `vercel/next.js`），点击 Generate，会生成 4 个链接：

- **⬇️ Download ZIP** — 直接下载源码压缩包
- **📦 Browse** — 在代理中浏览仓库
- **🔌 API** — 查看仓库 JSON 数据
- **📄 Raw** — 查看 README 原始内容

### 方式二：直接 URL

```bash
# 下载源码 zip
https://域名/github.com/owner/repo/archive/refs/heads/main.zip

# 浏览仓库
https://域名/github.com/owner/repo

# API 信息
https://域名/api.github.com/repos/owner/repo

# Raw 文件
https://域名/raw.githubusercontent.com/owner/repo/main/README.md
```

### aria2c 多线程下载

```bash
# 下载仓库 zip
aria2c -x 16 -s 16 -c "https://域名/github.com/owner/repo/archive/main.zip"

# 下载 Release 文件
aria2c -x 16 -s 16 -c "https://域名/github.com/owner/repo/releases/download/v1.0/file.zip"
```

## 添加新域名

编辑 `api/proxy.js` 顶部的 `ALLOWED` 数组：

```javascript
const ALLOWED = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  // ...新增域名
  'new-domain.com'
];
```

## 限制

- Vercel Hobby：100 万次请求/月，100GB 带宽
- 单次请求超时：30 秒
- 请求体上限：4.5MB

## 安全

- 仅代理白名单内的域名
- 自动删除危险的响应头（CSP、clear-site-data）
- 建议仅用于个人使用

## License

MIT
