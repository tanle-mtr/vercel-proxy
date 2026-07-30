# 🧭 Vercel 通用反代

无白名单、无限制，代理任意网站。基于 Vercel Serverless Functions，支持大文件流式下载。

## ✨ 特性

- 🌐 **无白名单** — 代理所有网站，不设限制
- ⚡ **流式传输** — 支持大文件下载，无内存瓶颈
- 🔄 **智能重定向** — 自动处理 301/302/307/308 跳转
- 🍪 **Cookie 重写** — 自动去除 Domain 属性，避免跨域问题
- 🛡️ **CORS 开放** — 允许任意来源跨域访问
- 📄 **MIME 修正** — 自动识别常见文件类型
- ⏱️ **300 秒超时** — Hobby 计划最大时长
- 💰 **100GB 带宽/月** — Hobby 计划免费额度

## 📁 文件结构

```
vercel-proxy/
├── api/
│   └── proxy.js          ← 核心反代函数
├── vercel.json           ← 路由配置
├── package.json          ← 项目声明
├── .gitignore            ← Git 忽略规则
├── deploy.sh             ← 一键部署脚本
├── download-example.sh   ← 下载示例
└── README.md             ← 本文档
```

## 🚀 部署方式

### 方式一：GitHub 导入（推荐）

1. 将此仓库推送到 GitHub
2. 登录 [vercel.com](https://vercel.com)
3. **Add New → Project** → 选择仓库 → **Deploy**
4. Framework Preset 选 **Other**，Root Directory 留空

### 方式二：Vercel CLI

```bash
chmod +x deploy.sh
./deploy.sh
```

### 方式三：手动部署

```bash
npm i -g vercel
cd vercel-proxy
vercel login
vercel --prod
```

## 🧪 使用方式

### 浏览器访问

```
导航页（推荐从这里开始）：
  https://你的域名/

路径前缀格式（推荐）：
  https://你的域名/github.com/
  https://你的域名/huggingface.co/
  https://你的域名/drive.internxt.com/
  https://你的域名/example.com/path

完整 URL 格式：
  https://你的域名/https:/github.com/owner/repo
  https://你的域名/https:/example.com/page
```

### 大文件下载（aria2c）

```bash
# GitHub Release
aria2c -x 16 -s 16 -c \
  "https://你的域名/github.com/owner/repo/releases/download/v1.0/file.zip"

# GitHub Archive
aria2c -x 16 -s 16 -c \
  "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"

# Hugging Face 模型
aria2c -x 16 -s 16 -c \
  "https://你的域名/huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin"

# 任意网站文件
aria2c -x 8 -s 8 -c \
  "https://你的域名/https:/example.com/large-file.zip"
```

参数说明：
- `-x 16`：16 个并发连接
- `-s 16`：文件分 16 片
- `-c`：断点续传
- `-k 500M`：每片 500MB（超大文件推荐）

### Git Clone 加速

```bash
# 临时使用
git clone https://你的域名/github.com/owner/repo.git

# 全局配置（推荐）
git config --global url."https://你的域名/github.com/".insteadOf "https://github.com/"
```

## 🔧 工作原理

```
浏览器/aria2c
    │
    ▼
https://你的域名/github.com/owner/repo
    │
    ▼ (Vercel Rewrite 规则)
/api/proxy
    │
    ▼ (proxy.js 解析路径)
https://github.com/owner/repo
    │
    ▼ (fetch + 流式传输)
返回数据给客户端
```

### 路径解析规则

| 输入路径 | 解析为上游 |
|---|---|
| `/github.com/owner/repo` | `https://github.com/owner/repo` |
| `/huggingface.co/models` | `https://huggingface.co/models` |
| `/https:/example.com/page` | `https://example.com/page` |
| `/` | 返回导航页 HTML |

### 重定向处理

当上游返回 302 跳转时（如 GitHub 下载跳转到 `codeload.githubusercontent.com`），proxy.js 会自动将 Location 改写为继续走反代的路径：

```
上游返回: Location: https://codeload.githubusercontent.com/...
改写为:   Location: /codeload.githubusercontent.com/...
```

## ⚠️ 注意事项

1. **Vercel Hobby 限制**
   - 100GB 带宽/月（超出暂停）
   - 100 万次函数调用/月
   - 单次函数最长 300 秒
   - 仅限个人非商业用途

2. **请求体限制**
   - 上传文件超过 4.5MB 可能失败
   - 大文件上传请使用官方客户端直连

3. **部分网站可能不兼容**
   - WebSocket 连接可能失败（如在线聊天、实时协作）
   - 部分网站有严格的 CORS / 反爬机制
   - Cloudflare 保护的网站可能无法正常访问

4. **不要用于违法用途**
   - 仅限个人合法使用
   - 不要公开分享代理链接
   - 遵守各网站的服务条款

## 🐛 排查问题

### 404 错误
- 确认 `api/proxy.js` 在 `api/` 目录下
- 确认 `vercel.json` 存在且格式正确
- Vercel 控制台 → Deployments → 最新 → Output 查看是否有 `api/proxy.js` 函数

### 白屏/样式丢失
- 打开 F12 控制台查看报错
- 检查是否有资源加载 404
- 确认访问路径格式正确（带 `/hostname/` 前缀）

### 下载中断
- 用 `-c` 参数断点续传
- 用 `-k` 参数减小分片大小
- 检查是否超过 300 秒超时

### 查看日志
- Vercel 控制台 → 项目 → **Logs** → **Runtime Logs**
- 实时查看函数执行日志和错误

## 📋 更新日志

### v2.0.0 (2026-07-30)
- ✅ 移除白名单，支持代理所有网站
- ✅ 新增完整 URL 格式支持 (`/https:/...`)
- ✅ 完善 MIME 类型映射（40+ 种）
- ✅ 增强重定向处理（支持相对路径）
- ✅ 添加 OPTIONS 预检请求支持
- ✅ 优化导航页 UI

### v1.0.0
- 初始版本，支持 5 个站点白名单

## 📄 License

MIT License - 仅供个人学习使用
