#!/bin/bash
# deploy.sh - 一键部署到 Vercel
# 使用方法：chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 Vercel 通用反代 - 一键部署"
echo "=================================="

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 未检测到 Vercel CLI，正在安装..."
    npm install -g vercel
fi

echo "📦 检查项目文件..."
if [ ! -f "api/proxy.js" ]; then
    echo "❌ 缺少 api/proxy.js 文件"
    exit 1
fi
if [ ! -f "vercel.json" ]; then
    echo "❌ 缺少 vercel.json 文件"
    exit 1
fi
if [ ! -f "package.json" ]; then
    echo "❌ 缺少 package.json 文件"
    exit 1
fi
echo "✅ 所有文件检查通过"

echo ""
echo "🔗 开始部署..."
echo "（首次运行会要求登录 Vercel）"
echo ""

vercel --prod

echo ""
echo "=================================="
echo "🎉 部署完成！"
echo ""
echo "测试方式："
echo "  导航页:    https://你的域名/"
echo "  GitHub:    https://你的域名/github.com/"
echo "  HuggingFace: https://你的域名/huggingface.co/"
echo "  任意网站:   https://你的域名/任意域名/路径"
echo ""
echo "下载示例："
echo "  aria2c -x 16 -s 16 -c \"https://你的域名/github.com/owner/repo/archive/main.zip\""
