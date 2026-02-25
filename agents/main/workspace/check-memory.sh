#!/bin/bash
# Memory 日志每日检查脚本
# 由 Heartbeat 或手动触发执行

WORKSPACE_DIR="/Users/kylin/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE_DIR/memory"
TODAY=$(date +%Y-%m-%d)
WEEKDAY=$(date +%u)  # 1=Monday, 7=Sunday
WEEKDAY_NAME=$(date +%A)

cd "$WORKSPACE_DIR" || exit 1

echo "=================================="
echo "Memory 日志检查 - $TODAY ($WEEKDAY_NAME)"
echo "=================================="

# 1. 检查今日日志是否存在
TODAY_LOG="$MEMORY_DIR/$TODAY.md"

if [ -f "$TODAY_LOG" ]; then
    echo "✅ 今日日志已存在: $TODAY.md"
else
    echo "📝 创建今日日志: $TODAY.md"
    
    # 判断是否为交易日（简化：周一到周五为交易日）
    if [ "$WEEKDAY" -le 5 ]; then
        MARKET_STATUS="交易日"
    else
        MARKET_STATUS="休市"
    fi
    
    cat > "$TODAY_LOG" << EOF
# $TODAY - Daily Log

## 📅 基本信息
- 星期：$WEEKDAY_NAME
- 市场状态：$MARKET_STATUS

## 💬 今日对话摘要
*（待记录重要内容）*

## 🎯 决策与行动
| 时间 | 类型 | 内容 | 结果 |
|------|------|------|------|
| | | | |

## 📊 投资相关
- 市场观察：（待记录）
- 持仓变动：（待记录）
- 挂单状态：（待记录）

## 🧠 学习与反思
- 新认知：（待记录）
- 待澄清问题：（待记录）

## ✅ 完成任务
- [ ] 

## 📝 明日待办
- [ ] 

---

*记录时间：$(date '+%Y-%m-%d %H:%M:%S')*  
*记录者：OpenClaw Agent (Heartbeat Auto-Created)*
EOF
    
    echo "✅ 今日日志模板已创建"
    
    # Git 提交
    git add "$TODAY_LOG"
    git commit -m "自动创建每日日志: $TODAY" 2>/dev/null || echo "无需提交"
fi

# 2. 同步 SQLite 索引 ★ NEW
echo ""
echo "🔍 同步 SQLite 索引..."
cd "$WORKSPACE_DIR/memory-index" && ./sync-to-sqlite.sh 2>/dev/null | grep -E "(Entries|Sync Complete|Syncing)" || echo "✅ SQLite 索引已是最新"

# 3. 检查是否有未提交的更改
cd "$WORKSPACE_DIR"
echo ""
echo "📦 检查未提交更改..."

if [ -n "$(git status --porcelain)" ]; then
    echo "检测到未提交更改，准备备份..."
    git add -A
    git commit -m "Heartbeat 自动备份: $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null
    git push origin main 2>/dev/null && echo "✅ 已推送到远程" || echo "⚠️ 推送等待中"
else
    echo "✅ 没有待提交更改"
fi

echo ""
echo "=================================="
echo "检查完成 ✓"
echo "=================================="
