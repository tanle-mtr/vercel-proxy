# Vercel GitHub Proxy

基于 Vercel Functions 的 GitHub 高速下载代理，参考 Cloudflare Worker 思路实现。

## 🚀 部署

1. 删除 Vercel 上现有的 vercel-proxy 项目
2. 删除 GitHub 上旧的仓库，或创建全新仓库
3. 上传以下三个文件到仓库根目录：
   - `api/proxy.js`
   - `vercel.json`
   - `package.json`
4. Vercel Dashboard → Add New → Project → 选择仓库 → Deploy

## 📁 文件结构

```
github-proxy/
├── api/
│   └── proxy.js      ← 核心代理逻辑
├── vercel.json        ← 路由重写配置
└── package.json      ← 项目声明（无依赖）
```

## 🌐 使用方式

| 功能 | URL 格式 |
|------|-----------|
| 仓库浏览 | `https://域名/github.com/owner/repo` |
| API 访问 | `https://域名/api.github.com/repos/owner/repo` |
| Raw 文件 | `https://域名/raw.githubusercontent.com/owner/repo/branch/file` |
| Release 下载 | `https://域名/github.com/owner/repo/releases/download/v1.0/file.zip` |
| Archive 下载 | `https://域名/github.com/owner/repo/archive/refs/heads/main.zip` |

## 📥 aria2c 多线程下载

```bash
# 下载仓库 zip
aria2c -x 16 -s 16 -c "https://域名/github.com/owner/repo/archive/main.zip"

# 下载 Release 文件
aria2c -x 16 -s 16 -c "https://域名/github.com/owner/repo/releases/download/v1.0/file.zip"

# 下载 Raw 文件
aria2c -x 16 -s 16 -c "https://域名/raw.githubusercontent.com/owner/repo/main/file.txt"
```

## ⚙️ 添加新域名

编辑 `api/proxy.js` 顶部的 `ALLOWED` 数组，加入新域名：

```javascript
const ALLOWED = [
  'github.com',
  'api.github.com',
  // ... 其他已有域名
  'new-domain.com'  // ← 新增
];
```

## ⚠️ 限制

- Vercel Hobby 计划：100 万次请求/月，100GB 带宽
- 单次请求超时：300 秒
- 请求体上限：4.5MB

## 💡 说明

GitHub 网页是重度 SPA，文件树加载依赖 `api.github.com` 的动态请求，Vercel Functions 无法完美代理所有动态请求。本代理**专注做好文件下载加速**，网页浏览建议使用：
- 直接访问 `github.com`（体验最完整）
- 或使用 Cloudflare Workers（边缘层改写，无需 JS 劫持）

## 📄 License

MIT
