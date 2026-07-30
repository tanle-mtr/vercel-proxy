# 🐙 Vercel 通用反代代理

一个基于 Vercel Serverless Function 的通用网站反向代理，支持任意网站代理访问，特别优化了 GitHub 和 Hugging Face 等 SPA 单页应用的代理体验。

## ✨ 功能特性

- **通用代理** — 支持代理任意网站，只需在 URL 中指定目标地址
- **零依赖** — 使用 Vercel 内置 `fetch`，无需安装任何 npm 包
- **CommonJS** — 使用 `module.exports`，兼容 Vercel Node.js 运行时
- **HTML 注入修复** — 自动将页面中的绝对 URL 替换为代理路径，解决 SPA 路由跳转问题
- **前端请求劫持** — 劫持 `fetch`、`XMLHttpRequest`、`EventSource`，确保所有异步请求走代理
- **重定向接管** — 手动处理 301/302/303/307/308 重定向，防止跳出代理
- **CSP 清除** — 删除 Content-Security-Policy 头，避免代理页面被拦截
- **CORS 开放** — 设置 `Access-Control-Allow-Origin: *`，支持跨域请求
- **流式传输** — 大文件使用 `arrayBuffer` 透传，支持下载

## 📁 项目结构

```
vercel-proxy/
├── api/
│   └── proxy.js          ← 核心代理函数
├── vercel.json           ← Vercel 路由配置
├── package.json          ← 项目声明（极简，无依赖）
├── .gitignore            ← Git 忽略规则
├── deploy.sh             ← 一键部署脚本
├── test.sh               ← 部署后测试脚本
└── README.md             ← 本文件
```

## 🚀 快速部署

### 方式一：GitHub 导入（推荐）

1. Fork 或克隆本仓库到你的 GitHub 账号
2. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
3. 点击 **Add New → Project**
4. 选择你的 `vercel-proxy` 仓库
5. **不要修改任何设置**，直接点击 **Deploy**
6. 等待约 1 分钟部署完成

### 方式二：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd vercel-proxy
vercel --prod
```

## 📖 使用方式

### 路径格式（推荐）

直接在浏览器或终端中访问：

```
https://你的域名/github.com/
https://你的域名/huggingface.co/
https://你的域名/example.com/path
```

### 参数格式

```
https://你的域名/api/proxy?to=https://github.com/
https://你的域名/api/proxy?to=https://huggingface.co/models
```

### 常用示例

| 目标 | 访问地址 |
|---|---|
| GitHub 首页 | `https://你的域名/github.com/` |
| GitHub 仓库 | `https://你的域名/github.com/vercel/next.js` |
| GitHub Raw 文件 | `https://你的域名/raw.githubusercontent.com/owner/repo/main/file.txt` |
| GitHub Release 下载 | `https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip` |
| Hugging Face 首页 | `https://你的域名/huggingface.co/` |
| Hugging Face 模型 | `https://你的域名/huggingface.co/bert-base-uncased` |
| Hugging Face 模型下载 | `https://你的域名/huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin` |

### aria2c 多线程下载

```bash
# GitHub Release
aria2c -x 16 -s 16 -c \
  "https://你的域名/github.com/owner/repo/releases/download/v1.0/file.zip"

# GitHub Archive
aria2c -x 16 -s 16 -c \
  "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"

# Hugging Face 大模型
aria2c -x 16 -s 16 -c \
  "https://你的域名/huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin"
```

## 🔧 技术原理

### 请求流程

```
浏览器请求
    │
    ▼
https://你的域名/github.com/owner/repo
    │
    ▼
Vercel Rewrite（vercel.json）
    │   source: /(.*) → destination: /api/proxy
    ▼
api/proxy.js（核心代理函数）
    │
    ├─ 1. 解析路径，提取目标主机（如 github.com）
    ├─ 2. 校验白名单（isAllowed）
    ├─ 3. 构造上游 URL（https://github.com/owner/repo）
    ├─ 4. 设置请求头（Host、Origin、Referer、User-Agent）
    ├─ 5. fetch 上游，redirect: 'manual'
    │
    ▼
上游响应
    │
    ├─ 3xx 重定向 → 改写 Location 为代理路径 → 返回浏览器
    ├─ text/html → 替换所有绝对 URL + 注入 JS 修复脚本 → 返回
    └─ 其他类型 → arrayBuffer 透传 → 返回
    │
    ▼
浏览器渲染（所有链接/请求都已指向代理路径）
```

### 核心设计

#### 1. 服务端 URL 替换

在 HTML 响应到达浏览器之前，服务端将所有 `https://github.com` 替换为 `/github.com`，这样浏览器解析出的所有链接都会指向代理路径。

```javascript
html = html.replace(/https:\/\/github\.com/g, '/github.com');
html = html.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
```

#### 2. 前端请求劫持

即使服务端替换了大部分 URL，GitHub 的 JS 仍可能动态生成请求。通过注入脚本劫持三个关键 API：

- `window.fetch` — 拦截所有 fetch 请求
- `XMLHttpRequest.prototype.open` — 拦截所有 XHR 请求
- `window.EventSource` — 拦截 SSE 长连接

```javascript
// 劫持 fetch
var origFetch = window.fetch;
window.fetch = function(input, init) {
  if (typeof input === 'string' && input.includes('api.github.com')) {
    input = '/' + input; // 转为代理路径
  }
  return origFetch.call(this, input, init);
};

// 劫持 XMLHttpRequest
var origOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  if (typeof url === 'string' && url.includes('api.github.com')) {
    arguments[1] = '/' + url;
  }
  return origOpen.apply(this, arguments);
};
```

#### 3. 重定向接管

设置 `redirect: 'manual'` 禁止 fetch 自动跟随重定向，手动解析 `Location` 头并改写为代理路径：

```javascript
if ([301, 302, 303, 307, 308].includes(upRes.status)) {
  const loc = upRes.headers.get('location');
  const locUrl = new URL(loc, upstreamUrl);
  if (isAllowed(locUrl.hostname)) {
    const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
    res.setHeader('Location', newLoc);
  }
}
```

#### 4. 白名单安全机制

只有白名单内的域名才会被代理，防止 SSRF 攻击：

```javascript
const ALLOWED = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'camo.githubusercontent.com',
  'avatars.githubusercontent.com',
  'gist.github.com',
  'huggingface.co',
  'tanle.xyz'
];
```

## ⚙️ 配置说明

### 添加新网站

编辑 `api/proxy.js` 顶部的 `ALLOWED` 数组，加入新域名：

```javascript
const ALLOWED = [
  'github.com',
  'huggingface.co',
  'example.com',       // ← 新增
  'npmjs.com',         // ← 新增
];
```

推送后 Vercel 会自动重新部署。

### vercel.json 说明

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/proxy" }
  ]
}
```

这条规则将所有请求（包括根路径）转发给 `api/proxy.js` 处理。

## ⚠️ 限制与注意事项

| 限制项 | 说明 |
|---|---|
| **带宽** | Vercel Hobby 计划每月 100GB 带宽 |
| **调用次数** | 每月 100 万次 Serverless Function 调用 |
| **超时** | 单次请求最长 300 秒（Hobby 计划） |
| **请求体** | 单次请求体上限 4.5MB |
| **WebSocket** | 不支持 WebSocket 代理 |
| **Cloudflare 5秒盾** | 无法绕过 Cloudflare 保护的网站 |

> ⚠️ **仅限个人非商业使用**，请遵守各网站的服务条款。

## 🔍 常见问题排查

### 页面白屏 / 一直转圈

1. 打开浏览器开发者工具 → **Network** 标签
2. 查看是否有请求返回 4xx/5xx
3. 查看 **Console** 是否有 JavaScript 报错
4. 确认目标网站在 `ALLOWED` 白名单中

### 下载大文件超时

Vercel Hobby 单次请求 300 秒超时。超过 2GB 的文件建议使用：
- Cloudflare Workers（无超时限制）
- 分片下载（`aria2c -x 16 -s 16`）

### 404 Not Found

1. 确认 `api/proxy.js` 在 `api/` 目录下（不是根目录）
2. 确认 `package.json` 存在且格式正确
3. Vercel 控制台 → Deployments → 查看 Build Logs

### 500 Internal Error

1. 查看 Vercel 控制台 → Deployments → Logs
2. 确认 `proxy.js` 使用 `module.exports`（不是 `export default`）
3. 确认没有使用 `getReader()`（Vercel Node 运行时不支持）

## 📄 License

MIT License — 仅供个人学习使用。

## 🙏 致谢

本项目参考了以下开源项目的思路：
- [vercel-github-proxy](https://github.com/qiutong123/vercel-github-proxy)
- [CF-Workers-GitHub](https://github.com/cmliu/CF-Workers-GitHub)

---

**如果这个项目对你有帮助，请给一个 ⭐ Star！**
