# Telegram 集成配置指南

## 当前状态
你的Telegram机器人token已经成功配置，但由于网络限制（中国大陆地区访问限制），OpenClaw无法直接连接到Telegram API。

## 解决方案

### 方案一：使用代理服务器
如果你有可用的代理服务器，请按以下步骤操作：

1. 修改系统环境变量（需要在启动OpenClaw前设置）：
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   ```

2. 或者配置SOCKS代理：
   ```bash
   export ALL_PROXY=socks5://proxy-server:port
   ```

### 方案二：使用VPN
连接到允许访问国际网络的VPN后再启动OpenClaw。

### 方案三：等待网络条件改善
在可以访问国际网络的环境下（如使用移动网络或特定网络配置）再尝试。

## 验证连接
在网络条件改善后，可以通过以下方式验证连接：

```bash
# 测试机器人连接
curl -s "https://api.telegram.org/bot8524712381:AAGZd6jnFzvbAxMPa7P1FMejPZsgwBYh8Fw/getMe"

# 查看最新消息
curl -s "https://api.telegram.org/bot8524712381:AAGZd6jnFzvbAxMPa7P1FMejPZsgwBYh8Fw/getUpdates"
```

## 获取用户ID
一旦连接成功，你可以通过以下方式获取你的Telegram用户ID：
- 向机器人发送任意消息
- 然后调用 getUpdates API 来查看发信人的ID
- 将ID添加到配置文件的 allowFrom 数组中

## 安全提醒
- 机器人token已配置，请注意保护配置文件安全
- 只有在 allowFrom 列表中的用户才能与机器人交互