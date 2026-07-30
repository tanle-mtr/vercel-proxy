# GitHub Proxy

基于 Vercel Functions 的 GitHub 高速下载代理。

## 功能

- 导航页：输入 `owner/repo`，一键生成下载链接
- Iframe 包装页：浏览 GitHub 仓库 + 固定下载按钮
- 直接代理：GitHub API、Raw 文件、Archive 下载

## 使用

### 导航页

访问 `https://你的域名/`，输入 `owner/repo`，点击 Open。

### Iframe 包装页

访问 `https://你的域名/go/owner/repo`

页面顶部有导航条，右下角有 Download 按钮，中间是 GitHub 页面（iframe）。

### 直接下载

```
curl -L "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip" -o src.zip
```

### aria2c 多线程

```
aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"
```

## 文件结构

```
github-proxy/
├── api/
│   └── proxy.js      # 核心代理逻辑
├── vercel.json        # Vercel 路由配置
├── package.json       # 项目声明（零依赖）
└── README.md
```

## 路由说明

| 路径 | 行为 |
|------|------|
| `/` | 导航页（输入 owner/repo） |
| `/go/owner/repo` | Iframe 包装页（带下载按钮） |
| `/github.com/...` | 直接代理到 GitHub |
| `/api.github.com/...` | 代理 GitHub API |
| `/raw.githubusercontent.com/...` | 代理 Raw 文件 |

## 限制

- Vercel Hobby：100 万请求/月，100GB 带宽
- 单次请求超时：10 秒

## License

MIT
