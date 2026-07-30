#!/bin/bash
# download-example.sh - 测试各站点反代 + aria2c 下载示例
# 用法：./download-example.sh [你的域名]

DOMAIN="${1:-你的域名.vercel.app}"

echo "==> 测试导航页"
curl -sI "https://${DOMAIN}/" | head -5

echo ""
echo "==> 测试 Hugging Face 反代"
curl -sI "https://${DOMAIN}/api/proxy?to=https://huggingface.co/" | head -5

echo ""
echo "==> 测试 GitHub 反代"
curl -sI "https://${DOMAIN}/api/proxy?to=https://github.com/" | head -5

echo ""
echo "==> 测试 Internxt 反代"
curl -sI "https://${DOMAIN}/api/proxy?to=https://drive.internxt.com/" | head -5

echo ""
echo "==> 测试 Vercel 反代"
curl -sI "https://${DOMAIN}/api/proxy?to=https://vercel.com/" | head -5

echo ""
echo "==> 测试 Cloudflare 反代"
curl -sI "https://${DOMAIN}/api/proxy?to=https://dash.cloudflare.com/" | head -5

echo ""
echo "==> 大文件下载示例（aria2c）："
cat << EOF
aria2c -x 16 -s 16 -c \\
  "https://${DOMAIN}/api/proxy?to=https://huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin"

aria2c -x 16 -s 16 -c \\
  "https://${DOMAIN}/api/proxy?to=https://github.com/owner/repo/releases/download/v1.0/file.zip"
EOF
