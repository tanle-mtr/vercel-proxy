# Vercel 通用反代项目

## 功能

- 无白名单，可代理任意网站
- 自动处理 301/302/307/308 重定向
- HTML 页面注入 JS 修复相对路径跳转
- 流式传输，支持大文件下载
- CORS 开放，Cookie 自动重写

## 文件结构

```
vercel-proxy/
├── api/
│   └── proxy.js          ← 核心反代函数
├── vercel.json           ← 路由配置
├── package.json          ← 项目声明 + 依赖
├── .gitignore
└── README.md
```

## 访问方式

```
导航页:           https://你的域名/
代理任意网站:     https://你的域名/api/proxy?to=https://目标网站.com/
快捷路径:         https://你的域名/huggingface.co/
```

## 部署

1. 将文件推送到 GitHub
2. Vercel 控制台 → Add New → Project → 选择仓库 → Deploy
3. Framework Preset: Other | Root Directory: 留空

## 测试

```bash
curl -I "https://你的域名/"
curl -I "https://你的域名/api/proxy?to=https://huggingface.co/"
curl -I "https://你的域名/api/proxy?to=https://github.com/"
```

## 下载示例

```bash
aria2c -x 16 -s 16 -c "https://你的域名/api/proxy?to=https://huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin"
```

## 注意事项

- Vercel Hobby: 100GB 带宽/月, 300 秒超时/请求
- 部分网站 (WebSocket/严格 CORS) 可能无法代理
- 仅限个人非商业用途
