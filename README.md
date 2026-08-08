# ⬇️ GitHub 代理

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)](https://github.com/tanle-mtr/vercel-proxy)

基于 Vercel Functions 的 GitHub 高速下载代理，支持页面浏览、文件下载和 API 代理。

> 🚀 **在线试用**: [docs.tanle.cc.cd](https://docs.tanle.cc.cd) | [gh-proxy.tanle.cc.cd](https://gh-proxy.tanle.cc.cd)

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📦 **仓库浏览** | 直接访问 GitHub 仓库页面，右下角自动显示"下载源码"按钮 |
| ⬇️ **高速下载** | Release 附件、Raw 文件、Archive 压缩包，通过 Vercel 边缘节点加速 |
| 🔌 **API 代理** | 直接调用 GitHub REST API，获取纯净 JSON 数据 |
| 🛡️ **安全可靠** | 白名单域名限制，仅代理 GitHub 相关域名，零依赖设计 |
| 📄 **Gist 支持** | 浏览和下载 Gist 代码片段 |
| 🖼️ **图片代理** | 代理头像、用户图片、静态资源等 |

## 🚀 快速开始

### 1. 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tanle-mtr/vercel-proxy)

点击上面的按钮，一键部署到你的 Vercel 账号。

### 2. 本地运行

```bash
# 克隆仓库
git clone https://github.com/tanle-mtr/vercel-proxy.git
cd vercel-proxy

# 无需安装依赖，直接部署到 Vercel
vercel
```

## 📖 使用指南

### 导航页

访问 `https://你的域名/`，输入 `owner/repo`，点击 Open。

### Iframe 包装页

访问 `https://你的域名/go/owner/repo`

页面顶部有导航条，右下角有 Download 按钮，中间是 GitHub 页面（iframe）。

### 直接代理浏览

```
https://你的域名/github.com/owner/repo
https://你的域名/github.com/owner/repo/blob/main/README.md
https://你的域名/github.com/owner/repo/tree/main/src
```

### Raw 文件直链

```
https://你的域名/raw.githubusercontent.com/owner/repo/branch/file
```

### Release / Archive 下载

```bash
curl -L "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip" -o src.zip
```

### aria2c 多线程加速

```bash
aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"
```

### API 代理

```bash
# 获取仓库信息
curl "https://你的域名/api.github.com/repos/owner/repo"

# 获取文件列表
curl "https://你的域名/api.github.com/repos/owner/repo/contents/"
```

## 🔗 路由说明

| 路径 | 行为 |
|------|------|
| `/` | 导航页（输入 owner/repo） |
| `/go/owner/repo` | Iframe 包装页（带下载按钮） |
| `/github.com/...` | 代理 GitHub 页面 |
| `/api.github.com/...` | 代理 GitHub API |
| `/raw.githubusercontent.com/...` | 代理 Raw 文件 |
| `/codeload.github.com/...` | 代理代码下载 |
| `/objects.githubusercontent.com/...` | 代理对象存储 |
| `/avatars.githubusercontent.com/...` | 代理头像 |
| `/camo.githubusercontent.com/...` | 代理图片缩略图 |
| `/gist.github.com/...` | 代理 Gist |
| `/github.githubassets.com/...` | 代理 GitHub 静态资源（CSS/JS） |
| `/user-images.githubusercontent.com/...` | 代理用户图片 |
| `/private-user-images.githubusercontent.com/...` | 代理私有用户图片 |

## 📁 文件结构

```
├── api/
│   └── proxy.js      # 核心代理逻辑（含 JS 劫持脚本注入）
├── assets/           # 静态资源
├── docs/             # 文档站点
├── vercel.json        # Vercel 路由配置
├── package.json       # 项目声明（零依赖）
└── README.md
```

## ⚙️ 配置说明

### 环境变量（可选）

当前版本不需要环境变量，代理默认自动工作。如需添加访问控制：

```bash
# IP 白名单（多个 IP 用逗号分隔）
ALLOWED_IPS=1.2.3.4,5.6.7.8

# Token 认证
PROXY_TOKEN=your-secret-token

# GitHub Token（提高 API 速率限制）
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### 添加新域名

编辑 `api/proxy.js`，在 `ALLOWED_PREFIXES` 数组中添加：

```javascript
const ALLOWED_PREFIXES = [
  'github.com',
  'api.github.com',
  // ... 其他域名
  'example.com'  // 添加新域名
];
```

## 🚧 限制

| 项目 | 限制 |
|------|------|
| 函数调用次数 | 100 万次/月（Hobby） |
| 带宽 | 100 GB/月（Hobby） |
| 函数超时 | 10 秒（Hobby）/ 300 秒（Pro） |
| 请求体大小 | 4.5 MB |
| 私有仓库 | 需要配置 GITHUB_TOKEN |

## 🐛 已知问题

- 部分动态功能（如 code navigation）可能响应较慢，建议配合 aria2c 多线程下载
- Vercel Serverless 函数冷启动可能导致首次请求稍慢
- GitHub SPA 文件树动态加载可能不完整（GitHub 前端过于复杂）

## 🔒 安全建议

1. **默认开启 IP 白名单或 Token 认证**，不要部署完全开放的代理
2. **定期检查 Vercel Dashboard 的用量统计**，发现异常及时处理
3. **不要将代理用于下载盗版内容或恶意软件**

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/your-feature`
3. 提交改动：`git commit -am 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

## 📞 支持

- 📖 [完整文档](https://docs.tanle.cc.cd)
- 🐛 [问题反馈](https://github.com/tanle-mtr/vercel-proxy/issues)
- 💬 [讨论区](https://github.com/tanle-mtr/vercel-proxy/discussions)

---

<div align="center">

Made with ❤️ by [tanle-mtr](https://github.com/tanle-mtr)

</div>
