#!/bin/bash
# download-example.sh - 各站点下载示例
# 使用方法：chmod +x download-example.sh && ./download-example.sh 你的域名

DOMAIN="${1:-你的域名.vercel.app}"

echo "📥 Vercel 通用反代 - 下载示例"
echo "=================================="
echo "域名: $DOMAIN"
echo ""

echo "--- GitHub Release 下载 ---"
echo "aria2c -x 16 -s 16 -c \"https://$DOMAIN/github.com/owner/repo/releases/download/v1.0/file.zip\""
echo ""

echo "--- GitHub Archive 下载 ---"
echo "aria2c -x 16 -s 16 -c \"https://$DOMAIN/github.com/owner/repo/archive/refs/heads/main.zip\""
echo ""

echo "--- GitHub Raw 文件 ---"
echo "aria2c -x 8 -s 8 -c \"https://$DOMAIN/raw.githubusercontent.com/owner/repo/main/file.txt\""
echo ""

echo "--- Hugging Face 模型下载 ---"
echo "aria2c -x 16 -s 16 -c \"https://$DOMAIN/huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin\""
echo ""

echo "--- 任意网站文件下载 ---"
echo "aria2c -x 8 -s 8 -c \"https://$DOMAIN/https:/example.com/large-file.zip\""
echo ""

echo "--- 浏览器访问示例 ---"
echo "导航页:       https://$DOMAIN/"
echo "GitHub:        https://$DOMAIN/github.com/"
echo "HuggingFace:   https://$DOMAIN/huggingface.co/"
echo "Internxt:      https://$DOMAIN/drive.internxt.com/"
echo "Vercel:        https://$DOMAIN/vercel.com/"
echo "Cloudflare:    https://$DOMAIN/dash.cloudflare.com/"
echo "任意网站:      https://$DOMAIN/任意域名/路径"
echo ""
echo "=================================="
echo "💡 提示：将上面的 aria2c 命令中的域名替换为你的实际域名即可使用"
