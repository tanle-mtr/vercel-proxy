# Vercel GitHub Proxy

> 基于 Vercel Serverless Function 的 GitHub 反代工具，加速国内访问 GitHub 网页浏览与文件下载。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Deploy with Vercel](https://img.shields.io/badge/deploy%20with-vercel-black?logo=vercel)](https://vercel.com/new)

---

## ✨ 功能特性

- 🚀 **网页加速** — 反代 `github.com`，国内访问更流畅
- 📦 **下载加速** — 支持 Release、Archive、Raw 文件多线程下载
- 🔌 **API 代理** — 自动接管 `api.github.com` 请求，页面不再转圈
- 🔄 **重定向接管** — 302/301 自动改写为代理路径，不跳出
- 🛡️ **零依赖** — 纯 Node.js 内置 `fetch`，无需安装任何包
- 📝 **CommonJS** — 兼容 Vercel 最稳定的运行环境，不报 500

---

## 📁 项目结构

```
vercel-github-proxy/
├── api/
│   └── proxy.js          ← 核心反代逻辑
├── vercel.json           ← 路由重写配置
├── package.json          ← 项目声明（零依赖）
├── .gitignore
├── deploy.sh             ← 一键部署提示
├── test.sh               ← 部署后测试脚本
└── README.md            ← 本文件
```

---

## 🚀 快速部署

### 方式一：Vercel 一键导入（推荐）

1. Fork 或克隆本仓库到你的 GitHub 账户
2. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
3. 点击 **Add New → Project**
4. 选择本仓库
5. **Framework Preset** 留空或选 **Other**
6. **Root Directory** 留空
7. 点击 **Deploy**，等待约 1 分钟

### 方式二：Vercel CLI

```bash
npm i -g vercel
git clone https://github.com/你的用户名/vercel-github-proxy.git
cd vercel-github-proxy
vercel --prod
```

---

## 🧪 使用方式

部署完成后，你的代理地址为 `https://你的域名/`。

### 网页浏览

| 目标 | 代理地址 |
|---|---|
| GitHub 首页 | `https://你的域名/github.com/` |
| 某个仓库 | `https://你的域名/github.com/owner/repo` |
| 文件内容 | `https://你的域名/github.com/owner/repo/blob/main/file.js` |
| Issues 页面 | `https://你的域名/github.com/owner/repo/issues` |
| Pull Requests | `https://你的域名/github.com/owner/repo/pulls` |

### 文件下载

| 类型 | 原始链接 | 代理链接 |
|---|---|---|
| Release 文件 | `https://github.com/owner/repo/releases/download/v1.0/file.zip` | `https://你的域名/github.com/owner/repo/releases/download/v1.0/file.zip` |
| Archive (zip) | `https://github.com/owner/repo/archive/refs/heads/main.zip` | `https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip` |
| Raw 文件 | `https://raw.githubusercontent.com/owner/repo/main/file.txt` | `https://你的域名/raw.githubusercontent.com/owner/repo/main/file.txt` |

### aria2c 多线程下载

```bash
# Release 文件（16 线程）
aria2c -x 16 -s 16 -c \
  "https://你的域名/github.com/owner/repo/releases/download/v1.0/file.zip"

# Archive 打包下载
aria2c -x 16 -s 16 -c \
  "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"

# Raw 大文件
aria2c -x 16 -s 16 -c \
  "https://你的域名/raw.githubusercontent.com/owner/repo/main/large-file.bin"
```

### 参数格式（兼容写法）

```
https://你的域名/api/proxy?to=https://github.com/owner/repo
```

---

## ⚙️ 工作原理

```
浏览器请求
    │
    ▼
https://你的域名/github.com/owner/repo
    │
    ▼
Vercel Rewrite (/api/proxy)
    │
    ▼
api/proxy.js (CommonJS)
    │
    ├── 解析目标主机 (github.com)
    ├── 构造请求头 (Host / Origin / Referer / UA)
    ├── fetch 上游 (redirect: manual)
    ├── 处理 302 重定向 → 改写为 /github.com/...
    ├── HTML 页面 → 替换所有 https://github.com → /github.com
    ├── 注入 JS → 劫持 fetch / XHR / EventSource
    └── 非 HTML → arrayBuffer 透传
    │
    ▼
浏览器收到响应（所有链接已改写为代理路径）
```

### 核心设计

1. **服务端 URL 替换** — 在 HTML 源头将 `https://github.com` 替换为 `/github.com`，比前端 JS 劫持更可靠
2. **前端三重劫持** — 同时劫持 `window.fetch`、`XMLHttpRequest`、`EventSource`，确保动态 API 请求走代理
3. **重定向手动接管** — `redirect: 'manual'`，302 的 `Location` 改写为代理路径，防止跳出
4. **零依赖 CommonJS** — 使用 `module.exports`，避免 ES Module 在 Vercel 上的兼容性问题

---

## 🔧 配置说明

### `api/proxy.js`

白名单在第 1-9 行，默认包含以下域名：

```javascript
const ALLOWED = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'camo.githubusercontent.com',
  'avatars.githubusercontent.com',
  'gist.github.com'
];
```

> 本项目仅代理 GitHub 相关域名。如需代理其他网站，请自行扩展白名单。

### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/proxy" }
  ]
}
```

所有请求（包括根路径）都会被转发到 `api/proxy.js` 处理。

### `package.json`

```json
{
  "name": "vercel-github-proxy",
  "version": "1.0.0",
  "private": true
}
```

极简声明，无 `"type": "module"`，无外部依赖。

---

## ⚠️ 限制与注意事项

| 限制项 | 说明 |
|---|---|
| **带宽** | Vercel Hobby 计划每月 100GB，超出需升级 |
| **调用次数** | 每月 100 万次 Serverless 调用 |
| **单次超时** | 每次请求最长 300 秒（大文件可能超时） |
| **请求体上限** | 上传文件最大 4.5MB |
| **WebSocket** | 不支持，GitHub 的实时通知等功能可能受限 |
| **仅供个人使用** | 请勿用于商业用途或大规模分发 |

---

## 🔍 常见问题

### Q: 部署后访问显示 500？

检查 Vercel 部署日志：
- 确认 `api/proxy.js` 在 `api/` 目录下（不是根目录）
- 确认 `package.json` 没有 `"type": "module"`
- 确认没有安装 `node-fetch`（使用内置 `fetch`）

### Q: 网页能打开但文件列表一直转圈？

这是 `api.github.com` 的请求没有被代理。确认：
- 浏览器控制台 Network 面板中，`api.github.com` 的请求是否返回 200
- 如果请求直接发往 `api.github.com`（而非你的域名），说明注入的 JS 没有生效

### Q: 大文件下载超时怎么办？

Vercel 单次请求 300 秒超时。解决方案：
- 使用 `aria2c -x 16 -s 16` 多线程分段下载
- 或换用 Cloudflare Workers（无超时限制）

### Q: 如何更新代码？

直接在 GitHub 上编辑 `api/proxy.js`，Vercel 会自动检测并重新部署（约 10 秒）。

---

## 📄 License

[MIT License](./LICENSE)

---

## 🙏 致谢

- [Vercel](https://vercel.com/) — Serverless 托管平台
- [GitHub](https://github.com/) — 全球最大的代码托管平台
- 所有为开源代理工具贡献过代码的开发者
