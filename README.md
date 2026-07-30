# GitHub Download Proxy

基于 Vercel Functions 的 GitHub 高速下载代理。

## 功能

- 代理 GitHub 仓库页面浏览
- 高速下载源码压缩包（支持 aria2c 多线程）
- 代理 GitHub API 请求
- 代理 Raw 文件直链

## 部署

1. Fork 本仓库或创建新仓库
2. 在 Vercel 中导入仓库
3. 无需任何环境变量，直接部署

## 使用

### 导航页

访问 `https://你的域名/`，输入 `owner/repo`，点击 Generate 获取下载链接。

### 直接访问

- 仓库浏览：`https://你的域名/github.com/owner/repo`
- API 查询：`https://你的域名/api.github.com/repos/owner/repo`
- Raw 文件：`https://你的域名/raw.githubusercontent.com/owner/repo/branch/file`
- 下载 ZIP：`https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip`

### aria2c 多线程下载

```bash
aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"
```

## 文件结构

```
github-proxy/
├── api/
│   └── proxy.js      # 核心代理逻辑
├── vercel.json        # Vercel 路由配置
├── package.json      # 项目声明（零依赖）
└── README.md
```

## 限制

- Vercel Hobby 计划：100 万请求/月，100GB 带宽
- 单次请求超时：10 秒（Hobby）/ 60 秒（Pro）
- 请求体上限：4.5MB

## License

MIT
