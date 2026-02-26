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

*Last updated: 2026-02-11*