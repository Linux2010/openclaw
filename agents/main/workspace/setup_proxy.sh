#!/bin/bash

# 你可以在这里配置你的代理地址和端口
# 示例：如果你有代理服务器，将其信息填入下面
export HTTP_PROXY=http://your-proxy-address:port
export HTTPS_PROXY=http://your-proxy-address:port
export ALL_PROXY=socks5://your-socks-proxy:port  # 如果你使用SOCKS代理

echo "代理设置完成。"
echo "HTTP_PROXY: $HTTP_PROXY"
echo "HTTPS_PROXY: $HTTPS_PROXY"
echo "ALL_PROXY: $ALL_PROXY"