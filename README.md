# GitHub 代理

基于 Vercel Functions 的 GitHub 高速下载代理，支持页面浏览、文件下载和 API 代理。

## 功能

- **导航页**：输入 `owner/repo`，一键生成下载链接
- **Iframe 包装页**：浏览 GitHub 仓库 + 固定下载按钮
- **直接代理**：GitHub 页面、API、Raw 文件、Archive 下载
- **JavaScript 劫持**：自动重写页面内所有 URL（fetch、XHR、src、href 等）
- **Gzip 处理**：自动解压响应，移除 content-length/content-encoding 以避免截断
- **扩展支持**：gist、avatar、camo、raw、githubassets 等全部主机

## 使用

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

```
curl -L "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip" -o src.zip
```

### aria2c 多线程加速

```
aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/refs/heads/main.zip"
```

## 路由说明

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

## 文件结构

```
├── api/
│   └── proxy.js      # 核心代理逻辑（含 JS 劫持脚本注入）
├── vercel.json        # Vercel 路由配置
├── package.json       # 项目声明（零依赖）
└── README.md
```

## 部署

1. 将本仓库 fork 或克隆
2. 登录 [Vercel](https://vercel.com) → Import Project → 选择仓库
3. 部署完成后访问 `https://你的域名/`

### 环境变量（可选）

无需额外环境变量，代理默认自动工作。

## 限制

- Vercel Hobby：100 万请求/月，100GB 带宽
- 单次请求超时：10 秒
- 不支持需要 GitHub 登录的页面（如私有仓库）

## 已知问题

- 部分动态功能（如 code navigation）可能响应较慢，建议配合 aria2c 多线程下载
- Vercel Serverless 函数冷启动可能导致首次请求稍慢

## License

MIT
