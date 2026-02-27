# OpenClaw 多代理架构完整方案

## 架构目标

1. **完全隔离**: 每个代理运行在独立环境中，互不影响
2. **安全沙箱**: 限制每个代理的权限范围，防止越权操作  
3. **macOS 兼容**: 在保持隔离的同时，充分利用 macOS 系统功能
4. **AI 友好**: 架构设计便于其他 AI 系统理解和集成

## 代理角色定义

### Core Agent (核心代理)
- **职责**: 系统协调、用户接口、多代理编排
- **权限**: 完整 macOS 系统访问权限
- **通信**: 主要用户交互入口

### Stock Agent (股票代理)  
- **职责**: 投资组合监控、交易合规审计、市场分析
- **权限**: 仅限金融数据访问和计算
- **通信**: 通过 Telegram 与 Core Agent 协作

### MCS Agent (计算机科学代理)
- **职责**: CS 技术指导、认证考试辅导、职业发展建议  
- **权限**: 仅限技术文档和代码相关操作
- **通信**: 通过 Telegram 与 Core Agent 协作

## 部署方案对比

### 方案A: Docker 沙箱 (推荐)

#### 优势
- ✅ **完全进程隔离**: 每个代理在独立容器中运行
- ✅ **安全边界清晰**: 通过 volume 挂载严格控制文件访问
- ✅ **配置标准化**: docker-compose 统一管理所有代理
- ✅ **易于扩展**: 添加新代理只需复制服务定义

#### 劣势  
- ⚠️ **Apple 原生工具限制**: `remindctl`, `memo`, `imsg` 等无法使用
- ⚠️ **硬件访问困难**: 摄像头/麦克风需要额外配置
- ⚠️ **文件 I/O 性能**: macOS 文件共享到容器有性能损耗

#### 实施细节
```yaml
# docker-compose.yml
version: '3.8'
services:
  core-agent:
    image: openclaw:latest
    volumes:
      - ~/.openclaw/agents/core:/root/.openclaw
    environment:
      - TELEGRAM_TOKEN=${CORE_TELEGRAM_TOKEN}
    network_mode: host
    restart: unless-stopped

  stock-agent:
    image: openclaw:latest
    volumes:
      - ~/.openclaw/agents/stock:/root/.openclaw
    environment:
      - TELEGRAM_TOKEN=${STOCK_TELEGRAM_TOKEN}
    network_mode: host
    restart: unless-stopped

  mcs-agent:
    image: openclaw:latest
    volumes:
      - ~/.openclaw/agents/mcs:/root/.openclaw
    environment:
      - TELEGRAM_TOKEN=${MCS_TELEGRAM_TOKEN}
    network_mode: host
    restart: unless-stopped
```

### 方案B: 原生多进程

#### 优势
- ✅ **完整 macOS 集成**: 可使用所有 Apple 原生工具
- ✅ **最佳性能**: 无虚拟化开销
- ✅ **硬件直接访问**: 摄像头、麦克风等设备可直接使用

#### 劣势
- ⚠️ **隔离性较弱**: 进程间仍存在潜在干扰风险
- ⚠️ **管理复杂**: 需要手动管理多个进程生命周期
- ⚠️ **配置分散**: 每个实例需要独立配置文件

#### 实施细节
```bash
# 启动脚本
#!/bin/bash
# Core Agent
OPENCLAW_CONFIG_PATH=~/.openclaw/agents/core/openclaw.json \
openclaw gateway start --workspace ~/.openclaw/agents/core/workspace &

# Stock Agent  
OPENCLAW_CONFIG_PATH=~/.openclaw/agents/stock/openclaw.json \
openclaw gateway start --workspace ~/.openclaw/agents/stock/workspace &

# MCS Agent
OPENCLAW_CONFIG_PATH=~/.openclaw/agents/mcs/openclaw.json \
openclaw gateway start --workspace ~/.openclaw/agents/mcs/workspace &
```

## 通信协议设计

### Telegram 通信机制
- **每个代理使用独立 Telegram bot**
  - Core Agent: @core_yourname_bot
  - Stock Agent: @stock_yourname_bot  
  - MCS Agent: @mcs_yourname_bot

- **消息格式标准化**
```json
{
  "from": "stock",
  "to": "core", 
  "action": "portfolio_update",
  "timestamp": "2026-02-27T22:00:00Z",
  "data": { ... }
}
```

### Core Agent 协调逻辑
1. **接收用户请求**
2. **路由到对应代理** (通过 Telegram 消息)
3. **聚合响应结果**  
4. **返回给用户**

## 安全考虑

### 权限最小化原则
- **Core Agent**: 完整系统权限 (已记录在 MEMORY.md)
- **Stock Agent**: 仅金融数据目录读写权限
- **MCS Agent**: 仅技术项目目录读写权限

### 网络安全
- **代理通信**: 通过 Telegram 加密通道
- **外部访问**: 每个代理独立配置网络代理
- **API 密钥**: 环境变量注入，不在配置文件中明文存储

## 实施路线图

### 阶段1: 基础架构搭建
- [ ] 创建三个代理的 workspace 目录
- [ ] 为每个代理创建独立的 Telegram bot
- [ ] 选择部署方案 (Docker vs 原生)

### 阶段2: 代理实现
- [ ] Core Agent: 实现协调和路由逻辑
- [ ] Stock Agent: 实现投资监控功能  
- [ ] MCS Agent: 实现 CS 技术指导功能

### 阶段3: 通信集成
- [ ] 实现 Telegram 消息路由
- [ ] 测试代理间协作流程
- [ ] 优化错误处理和重试机制

### 阶段4: 监控和维护
- [ ] 添加健康检查
- [ ] 实现自动重启机制
- [ ] 建立日志收集系统

## 决策建议

**推荐采用 Docker 沙箱方案**，原因如下：

1. **安全性优先**: 在个人助理场景中，安全隔离比性能更重要
2. **架构清晰**: 容器化部署更容易理解和维护
3. **未来兼容**: 便于迁移到 Linux 服务器或其他平台
4. **AI 友好**: 标准化的容器配置便于其他 AI 系统学习和复用

虽然会失去部分 macOS 原生功能，但核心的文件操作、网络通信、Telegram 集成都能正常工作，且安全性得到保障。

---
**文档类型**: 架构设计  
**适用场景**: OpenClaw 多代理部署  
**最后更新**: 2026-02-27