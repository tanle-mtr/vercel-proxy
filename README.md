# Vercel Universal Proxy

零依赖、CommonJS、无流式传输的通用反代，支持任意网站。

## 文件结构

```
vercel-proxy/
├── api/
│   └── proxy.js          # 核心反代函数
├── vercel.json           # 路由配置
├── package.json          # 项目声明（极简）
└── README.md             # 本文件
```

## 部署步骤

1. 将整个 `vercel-proxy/` 文件夹推送到 GitHub 仓库
2. Vercel 控制台 → Add New → Project → 选择该仓库
3. Framework Preset 选 Other，Root Directory 留空
4. 点击 Deploy

## 使用方式

```
导航页：  https://你的域名/
HF：      https://你的域名/huggingface.co/
GitHub：  https://你的域名/github.com/
Vercel：  https://你的域名/vercel.com/
Internxt：https://你的域名/drive.internxt.com/

参数方式：https://你的域名/api/proxy?to=https://huggingface.co/models
```

## 技术要点

- CommonJS (module.exports) - 避免 ES Module 兼容问题
- 使用 Vercel 内置 fetch - 零依赖
- 使用 text()/arrayBuffer() - 避免 getReader() 兼容性
- 白名单域名校验 - 防止 SSRF
- HTML 注入 JS - 修复 SPA 相对路径跳转
- 3xx 重定向改写 - Location 头重写为代理路径

## 白名单域名

huggingface.co, github.com, raw.githubusercontent.com,
codeload.github.com, objects.githubusercontent.com,
vercel.com, dash.cloudflare.com, drive.internxt.com, tanle.xyz

如需添加更多域名，编辑 api/proxy.js 的 ALLOWED 数组。
