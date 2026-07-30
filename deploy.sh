#!/bin/bash
# 一键部署脚本
# 使用前请先安装 Vercel CLI: npm i -g vercel

echo "=== Vercel Proxy Deploy ==="
echo ""

# 检查 vercel 是否安装
if ! command -v vercel &> /dev/null; then
    echo "错误: 请先安装 Vercel CLI: npm i -g vercel"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")"

echo "当前目录: $(pwd)"
echo "文件列表:"
ls -la api/ 2>/dev/null || echo "  (无 api/ 目录)"
ls -la *.json 2>/dev/null
echo ""

# 部署
echo "开始部署..."
vercel --prod

echo ""
echo "=== 部署完成 ==="
echo "访问导航页: https://你的域名/"
echo "访问 HF: https://你的域名/huggingface.co/"
echo "访问 GitHub: https://你的域名/github.com/"
