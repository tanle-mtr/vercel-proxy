#!/bin/bash
# 测试脚本 - 部署后运行
# 用法: bash test.sh your-domain.vercel.app

DOMAIN="${1:-你的域名}"

echo "=== 测试 Vercel Proxy ==="
echo "域名: $DOMAIN"
echo ""

echo "1. 导航页:"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "https://$DOMAIN/"

echo "2. Hugging Face:"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "https://$DOMAIN/huggingface.co/"

echo "3. GitHub:"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "https://$DOMAIN/github.com/"

echo "4. Vercel:"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "https://$DOMAIN/vercel.com/"

echo "5. Internxt:"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "https://$DOMAIN/drive.internxt.com/"

echo "6. ?to= 参数方式:"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" "https://$DOMAIN/api/proxy?to=https://huggingface.co/models"

echo ""
echo "=== 测试完成 ==="
echo "所有结果应为 HTTP 200"
