# OpenClaw + Telegram 代理问题解决方案

本文档记录了在 macOS 环境下解决 OpenClaw 与 Telegram 集成时遇到的网络代理问题的完整方案。

## 问题背景

OpenClaw 默认直接连接 Telegram API，但在某些网络环境下（如企业防火墙、地区限制等），需要通过代理服务器才能正常通信。直接配置系统代理往往无效，因为 OpenClaw 的底层 HTTP 客户端可能不遵循系统代理设置。

## 解决方案

### 方法一：环境变量代理配置（推荐）

OpenClaw 支持通过标准 HTTP 代理环境变量进行配置：

```bash
# 设置 HTTP/HTTPS 代理
export HTTP_PROXY=http://your-proxy-server:port
export HTTPS_PROXY=http://your-proxy-server:port

# 启动 OpenClaw
openclaw gateway start
```

**优点**：
- 简单直接，无需修改配置文件
- 适用于临时代理需求
- 兼容大多数网络环境

**注意事项**：
- 代理服务器地址需要包含协议（http:// 或 https://）
- 如果代理需要认证，格式为：`http://username:password@proxy-server:port`

### 方法二：OpenClaw 配置文件代理设置

在 `~/.openclaw/openclaw.json` 中直接配置代理：

```json5
{
  "gateway": {
    "port": 18789
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TELEGRAM_BOT_TOKEN",
      // 代理配置
      "proxy": {
        "url": "http://your-proxy-server:port",
        "username": "optional-username",
        "password": "optional-password"
      }
    }
  }
}
```

**优点**：
- 配置持久化，重启后依然有效
- 可以为不同通道设置不同的代理
- 支持代理认证

### 方法三：系统级代理 + 网络配置

对于 macOS 系统，还可以通过网络设置全局代理：

1. 打开 **系统设置** → **网络**
2. 选择当前网络连接 → **详细信息** → **代理**
3. 配置 **HTTP 代理** 和 **HTTPS 代理**
4. 确保 **安全套接字层 (SSL)** 也使用相同代理

然后在 OpenClaw 配置中启用系统代理支持：

```json5
{
  "tools": {
    "web": {
      "useSystemProxy": true
    }
  }
}
```

## 多代理架构下的代理配置

当运行多个 OpenClaw 实例（每个实例对应不同代理）时，建议为每个实例单独配置代理：

```bash
# Core Agent - 使用代理 A
export HTTPS_PROXY=http://proxy-a:8080
OPENCLAW_CONFIG_PATH=~/.openclaw/agents/core/openclaw.json \
openclaw gateway start --workspace ~/.openclaw/agents/core/workspace

# Stock Agent - 使用代理 B  
export HTTPS_PROXY=http://proxy-b:8080
OPENCLAW_CONFIG_PATH=~/.openclaw/agents/stock/openclaw.json \
openclaw gateway start --workspace ~/.openclaw/agents/stock/workspace
```

## 故障排除

### 常见错误及解决方案

1. **"ETIMEDOUT" 或 "ECONNREFUSED" 错误**
   - 检查代理服务器是否可达：`curl -x http://proxy:port https://api.telegram.org`
   - 确认代理端口是否正确开放

2. **代理认证失败**
   - 确认用户名密码是否包含特殊字符（需要 URL 编码）
   - 检查代理服务器是否支持 Basic Auth

3. **部分功能正常，部分异常**
   - Telegram Bot API 和 Webhook 可能需要不同的代理配置
   - 检查是否所有相关域名都通过代理（api.telegram.org, telegram.org 等）

### 调试命令

```bash
# 测试代理连通性
curl -x $HTTPS_PROXY https://api.telegram.org/botYOUR_TOKEN/getMe

# 查看 OpenClaw 日志中的网络错误
openclaw logs --tail 100 | grep -i proxy

# 临时禁用代理测试
unset HTTP_PROXY HTTPS_PROXY
openclaw gateway restart
```

## 最佳实践

1. **优先使用环境变量**：简单场景下环境变量是最便捷的方式
2. **生产环境使用配置文件**：确保配置可版本控制和复现
3. **多实例独立配置**：每个 OpenClaw 实例应有独立的代理配置
4. **定期测试代理可用性**：避免因代理失效导致服务中断

## 相关资源

- [OpenClaw 官方文档 - Channels Configuration](https://docs.openclaw.ai/channels/telegram)
- [Telegram Bot API Proxy Support](https://core.telegram.org/bots/api#using-a-proxy)
- [macOS 网络代理配置指南](https://support.apple.com/guide/mac-help/enter-proxy-server-settings-on-mac-mchlp2591/mac)

---

**最后更新**: 2026-02-27  
**文档类型**: 技术解决方案  
**适用平台**: macOS, OpenClaw v2026+