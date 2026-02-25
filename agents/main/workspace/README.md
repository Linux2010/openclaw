# OpenClaw Workspace Backup

这是我的 [OpenClaw](https://github.com/openclaw/openclaw) 个人工作区备份仓库。

## 📦 仓库用途

- 🔄 **配置备份**：OpenClaw 核心配置文件
- 🧠 **Skills 管理**：自定义 AI 技能
- 📝 **Memory 存档**：长期记忆 + 每日日志 + SQLite 全文索引
- 🤖 **AI 协作**：与 Agent 的持续对话记录（支持实时记录）
- 🔍 **Memory 索引**：SQLite + FTS5 全文检索系统

---

## 📁 目录结构

```
├── AGENTS.md              # 工作区约定与使用指南
├── BOOTSTRAP.md           # 首次启动引导
├── HEARTBEAT.md           # 定时任务配置（含 SQLite 同步）
├── IDENTITY.md            # Agent 身份定义
├── MEMORY.md              # 长期记忆（投资规则、重要事项）
├── SOUL.md                # Agent 核心人格
├── TOOLS.md               # 本地工具笔记
├── USER.md                # 用户信息
│
├── skills/                # 🛠️ AI 技能集合
│   ├── stock-advisor/     # 📊 股票投资建议
│   ├── trading-supervisor/# 🛡️ 交易审查监督
│   └── memory-management/ # 🧠 Memory 系统管理 ★ NEW
│
├── memory/                # 🗓️ 每日对话日志（按日期）
│   ├── 2026-MM-DD.md
│   └── archive/           # 月度归档日志
│
└── memory-index/          # 🔍 SQLite + FTS5 全文索引 ★ NEW
    ├── memory.db          # SQLite 数据库
    ├── search.sh          # 全文搜索工具
    ├── sync-to-sqlite.sh  # 同步脚本
    └── README.md          # 详细文档
```

---

## 🧩 核心 Skills

| 技能 | 用途 | 状态 |
|------|------|------|
| **stock-advisor** | 股票分析、估值、投资建议 | ✅ |
| **trading-supervisor** | 交易审查、纪律监督 | ✅ |
| **memory-management** | Memory 系统最佳实践 | 🆕 **NEW** |

---

## 🔍 Memory 索引系统

**技术栈**: SQLite + FTS5

### 功能
- ✅ **全文检索** - 秒级搜索所有历史对话
- ✅ **自动索引** - Heartbeat 自动同步
- ✅ **标签分类** - 支持多维检索
- ✅ **统计查询** - 数据量、活跃度分析

### 查询示例
```bash
cd memory-index
./search.sh "AMZN"              # 全文搜索
./search.sh --recent 10         # 最近10条
./search.sh --stats             # 统计信息
```

**优势**：无需人工整理 MEMORY.md，自动倒排索引，O(log n) 检索速度。

---

## 📝 Memory 系统架构

### 三层设计

```
MEMORY.md              → 长期记忆（核心原则、投资戒律）← 人工维护
    ↓
memory/YYYY-MM-DD.md   → 每日详细对话日志 ← 实时自动记录
    ↓
memory-index/          → SQLite FTS 索引 ← Heartbeat 自动同步
```

### 实时记录能力

**自动记录流程**（2026-02-11 启用）：
```
用户对话 → 我回复 → 自动追加到 memory/2026-MM-DD.md
```

**记录内容**：
- 重要交易决策
- 投资策略变更
- 系统配置更新
- 用户偏好设置
- 查询结果摘要

---

## ⚙️ 自动化流程（Heartbeat）

**频率**: 每 30 分钟自动执行

执行清单:
1. ✅ 检查/创建今日日志文件
2. ✅ 同步对话记录到 SQLite 索引
3. ✅ Git 备份推送到 GitHub

**脚本**:
```bash
./check-memory.sh                 # 检查日志
./memory-index/sync-to-sqlite.sh  # 同步索引
./backup.sh                       # Git 备份
```

---

## 🔒 隐私说明

本仓库为 **私有仓库**，包含：
- 个人投资记录与规则
- API 配置模板（脱敏）
- 与 AI 的私人对话日志
- SQLite 索引数据库

**请勿公开分享。**

---

## 🚀 快速恢复

如需在新设备恢复工作区：

```bash
git clone https://github.com/Linux2010/open-claw-workspace.git ~/.openclaw/workspace
```

然后初始化索引：
```bash
cd ~/.openclaw/workspace/memory-index
./sync-to-sqlite.sh --full-sync
```

---

## 📅 更新日志

| 日期 | 功能 |
|------|------|
| 2026-02-09 | 初始化工作区，设定投资规则 |
| 2026-02-10 | 部署自动备份系统，配置 cron |
| 2026-02-11 | 🆕 **Memory 实时记录** + **SQLite 全文索引** + **memory-management 技能** |

---

*Last updated: 2026-02-11*