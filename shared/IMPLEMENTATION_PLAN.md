# 记忆系统迁移与优化实施计划

## 阶段1：目录结构迁移（立即执行）
### 1.1 创建共享目录
```bash
mkdir -p /Users/hope/.openclaw/shared/{memory,monthly_summaries}
```

### 1.2 迁移现有日志
```bash
# 移动主 agent 日志
mv /Users/hope/.openclaw/agents/main/workspace/memory/*.md \
   /Users/hope/.openclaw/shared/memory/

# 重命名文件添加 agent 前缀
cd /Users/hope/.openclaw/shared/memory
for file in *.md; do
  mv "$file" "main_${file}"
done

# 为 stock agent 创建占位符
touch /Users/hope/.openclaw/shared/memory/stock_2026-02-25.md
```

### 1.3 建立符号链接
```bash
# 主 agent
ln -sf /Users/hope/.openclaw/shared/memory \
       /Users/hope/.openclaw/agents/main/workspace/memory

# Stock agent
ln -sf /Users/hope/.openclaw/shared/memory \
       /Users/hope/.openclaw/agents/stock/workspace/memory
```

## 阶段2：脚本优化（立即执行）
### 2.1 更新 sync-to-sqlite.sh
- 修改 `WORKSPACE_DIR` → `/Users/hope/.openclaw`
- 修改 `MEMORY_DIR` → `/Users/hope/.openclaw/shared/memory`
- 修复 Bash 数组语法（兼容 macOS）

### 2.2 增强 memory-archive.sh
- 修改归档路径为 `shared/monthly_summaries/`
- 添加 LLM 自动摘要功能（调用本地模型）
- 更新 Git 提交路径

### 2.3 创建统一备份脚本
```bash
# /Users/hope/.openclaw/shared/backup_all.sh
#!/bin/bash
cd /Users/hope/.openclaw
git add -A
git commit -m "自动备份: $(date)"
git push origin main
```

## 阶段3：数据库升级（立即执行）
### 3.1 初始化共享数据库
```bash
# 删除旧数据库
rm /Users/hope/.openclaw/agents/main/workspace/memory-index/memory.db

# 创建新数据库
sqlite3 /Users/hope/.openclaw/shared/memory.db < /Users/hope/.openclaw/agents/main/workspace/memory-index/db/schema.sql
```

### 3.2 更新索引脚本路径
- 修改所有脚本中的 `DB_FILE` → `/Users/hope/.openclaw/shared/memory.db`

## 阶段4：调度配置（立即执行）
### 4.1 更新 cron 任务
```json
// workspace-backup 任务
{
  "schedule": { "expr": "0 22 * * *" },
  "payload": { "text": "执行每日备份" },
  "action": "run shared/backup_all.sh"
}

// memory-archive 任务  
{
  "schedule": { "expr": "0 3 1 * *" },
  "payload": { "text": "执行月度归档" },
  "action": "run shared/memory-archive.sh"
}
```

### 4.2 添加每日索引任务
```json
// daily-index 任务
{
  "name": "daily-memory-index",
  "schedule": { "expr": "0 */2 * * *" },
  "payload": { "text": "执行记忆索引更新" },
  "action": "run shared/sync-to-sqlite.sh"
}
```

## 阶段5：验证与监控（1小时内完成）
### 5.1 手动测试流程
```bash
# 1. 创建测试日志
echo "# 测试日志\n- 内容测试" > /Users/hope/.openclaw/shared/memory/main_test.md

# 2. 执行索引
./shared/sync-to-sqlite.sh

# 3. 验证数据库
sqlite3 /Users/hope/.openclaw/shared/memory.db "SELECT * FROM memory_entries WHERE source_file LIKE '%test%';"

# 4. 执行备份
./shared/backup_all.sh
```

### 5.2 监控指标
- 数据库记录数增长
- GitHub 备份提交频率
- 脚本执行日志（`/Users/hope/.openclaw/logs/memory_tasks.log`）

## 回滚方案
### 如果出现问题：
1. 恢复符号链接：
   ```bash
   rm /Users/hope/.openclaw/agents/main/workspace/memory
   cp -r /Users/hope/.openclaw/shared/memory /Users/hope/.openclaw/agents/main/workspace/
   ```
2. 恢复旧数据库：
   ```bash
   cp /Users/hope/.openclaw/agents/main/workspace/memory-index/memory.db.bak \
      /Users/hope/.openclaw/agents/main/workspace/memory-index/memory.db
   ```