#!/bin/bash

# 生成自签名SSL证书用于本地HTTPS开发

echo "正在生成SSL证书..."

# 创建证书目录
mkdir -p .cert

# 生成私钥和证书（包含多个IP地址）
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout .cert/localhost-key.pem \
  -out .cert/localhost.pem \
  -days 365 \
  -subj "/C=CN/ST=State/L=City/O=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.local,IP:127.0.0.1,IP:192.168.0.69,IP:192.168.31.224,IP:0.0.0.0"

echo "✓ SSL证书已生成在 .cert/ 目录"
echo ""
echo "证书包含以下地址："
echo "  - localhost"
echo "  - 127.0.0.1"
echo "  - 192.168.0.69"
echo "  - 192.168.31.224"
echo ""
echo "下一步："
echo "1. 运行: npm run dev"
echo "2. 在手机浏览器访问: https://192.168.0.69:3000"
echo "3. 接受证书警告（点击'高级' -> '继续访问'）"
echo "4. 重新加载页面，等待Service Worker注册"
echo "5. 点击菜单 -> 应该会看到'安装应用'选项"
