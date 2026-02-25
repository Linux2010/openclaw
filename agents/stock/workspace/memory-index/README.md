# Memory Index System - SQLite + FTS5

轻量级全文检索系统，替代手工整理的 Memory 管理方案。

## 架构

```
memory/*.md → SQLite + FTS5 ← search.sh (查询)
     ↓
  倒排索引
     ↓
  全文检索、标签、统计
```

## 核心文件

| 文件 | 说明 |
|------|------|
| `memory.db` | SQLite 数据库（FTS5 索引）|
| `db/schema.sql` | 数据库表结构 |
| `sync-to-sqlite.sh` | 同步脚本 |
| `search.sh` | 查询工具 |

## 快速开始

### 1. 初始化数据库

```bash
cd memory-index
./sync-to-sqlite.sh
```

### 2. 搜索

```bash
# 全文搜索
./search.sh "投资"
./search.sh "AMZN"
./search.sh "挂单"

# 统计信息
./search.sh --stats
./search.sh --recent 5
```

### 3. 日常使用

```bash
# 每次记完日志后同步
./sync-to-sqlite.sh

# 或完整重新索引
./sync-to-sqlite.sh --full-sync
```

## 表结构

### memory_entries
- `id` - 自增ID
- `source_file` - 来源文件 (memory/2026-02-11.md)
- `entry_date` - 日期 (2026-02-11)
- `entry_type` - 类型 (daily_log/long_term/archive)
- `title` - 标题
- `content` - 完整内容

### memory_fts (FTS5 虚拟表)
- 自动同步的倒排索引
- 支持中文全文检索

### tags & memory_tags
- 标签分类系统
- 多对多关联

## 高级查询（直接 SQL）

```bash
sqlite3 memory.db

-- 按日期范围查
SELECT * FROM memory_entries 
WHERE entry_date BETWEEN '2026-02-01' AND '2026-02-28';

-- 全文检索
SELECT * FROM memory_fts WHERE content MATCH '股票 AND 挂单';

-- 按类型统计
SELECT entry_type, COUNT(*) FROM memory_entries GROUP BY entry_type;
```

## 自动化建议

### 选项1: Heartbeat 同步
在 `HEARTBEAT.md` 中添加：
```bash
cd memory-index && ./sync-to-sqlite.sh
```

### 选项2: Git Hook
`.git/hooks/post-commit`:
```bash
#!/bin/bash
cd memory-index && ./sync-to-sqlite.sh
```

### 选项3: Cron Job
```bash
0 * * * * cd ~/memory-index && ./sync-to-sqlite.sh
```

## 优势对比

| 特性 | 原方案 (Markdown only) | SQLite + FTS |
|------|----------------------|--------------|
| 检索速度 | O(n) 线性搜索 | O(log n) 索引检索 |
| 全文搜索 | ❌ 不支持 | ✅ 原生支持 |
| 标签/分类 | ❌ 手工 | ✅ 自动/半自动 |
| 统计查询 | ❌ 困难 | ✅ 简单 |
| 容量上限 | ⚠️ MEMORY.md 膨胀 | ✅ 无限制 |
| 人工维护 | 🔴 高 | 🟢 低 |

## 局限

- 仍需定期归档原始 Markdown (check-memory.sh)
- FTS5 对中文分词有限（但匹配可用）
- 单文件数据库（不适合并发写入）

---

**Created**: 2026-02-11  
**版本**: v1.0