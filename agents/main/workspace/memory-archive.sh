#!/bin/bash
# Memory 月度归档脚本
# 每月运行一次，整理 daily logs，更新长期记忆

WORKSPACE_DIR="/Users/hope/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE_DIR/memory"
ARCHIVE_DIR="$MEMORY_DIR/archive"

cd "$WORKSPACE_DIR" || exit 1

echo "=================================="
echo "Memory 月度归档任务 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================="

# 创建归档目录
mkdir -p "$ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR/originals"

# 获取当前年月
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)

# 计算上个月（兼容 macOS 和 Linux）
if date -v-1m +%m >/dev/null 2>&1; then
    # macOS BSD date
    LAST_MONTH=$(date -v-1m +%m)
    LAST_YEAR=$(date -v-1m +%Y)
else
    # Linux GNU date
    LAST_MONTH=$(date -d "last month" +%m)
    LAST_YEAR=$(date -d "last month" +%Y)
fi

echo ""
echo "📊 步骤 1: 分析上个月日志 ($LAST_YEAR-$LAST_MONTH)"
echo "----------------------------------"

# 查找上个月的日志文件
LAST_MONTH_FILES=$(find "$MEMORY_DIR" -maxdepth 1 -name "${LAST_YEAR}-${LAST_MONTH}-*.md" 2>/dev/null | sort)

if [ -z "$LAST_MONTH_FILES" ]; then
    echo "未找到 ${LAST_YEAR}-${LAST_MONTH} 的日志文件"
else
    FILE_COUNT=$(echo "$LAST_MONTH_FILES" | wc -l | tr -d ' ')
    echo "发现 $FILE_COUNT 个日志文件，正在生成摘要..."
    
    # 创建月度摘要头
    SUMMARY_FILE="$ARCHIVE_DIR/${LAST_YEAR}-${LAST_MONTH}-summary.md"
    
    cat > "$SUMMARY_FILE" << EOF
# 月度记忆摘要 - ${LAST_YEAR}年${LAST_MONTH}月

> ⏰ 自动生成于 $(date '+%Y-%m-%d %H:%M:%S')  
> 📦 原始日志已归档，此处保留核心教训与决策

## 📈 本月核心事项

EOF

    # 提取关键信息
    echo "$LAST_MONTH_FILES" | while read -r file; do
        [ -z "$file" ] && continue
        echo "" >> "$SUMMARY_FILE"
        echo "### $(basename "$file" .md)" >> "$SUMMARY_FILE"
        echo "" >> "$SUMMARY_FILE"
        # 提取标题行
        grep -E "^(#|## )" "$file" 2>/dev/null | head -10 >> "$SUMMARY_FILE" || true
    done
    
    # 添加提醒区域
    cat >> "$SUMMARY_FILE" << EOF

---

## 💡 提炼的教训

*（请在下次对话中手动补充）*

## 📋 遗留事项

*（请在下次对话中手动更新）*

---

## 📝 归档说明

- 📂 原始日志文件已移动到 \`archive/originals/\`
- 📝 本摘要保留了核心决策点，过滤了日常对话
- 🔍 如需完整记录，请查看原始日志

EOF

    echo "✅ 月度摘要已创建: $SUMMARY_FILE"
    
    # 移动原始日志到归档
    echo "$LAST_MONTH_FILES" | while read -r file; do
        [ -z "$file" ] && continue
        mv "$file" "$ARCHIVE_DIR/originals/"
    done
    echo "✅ ${FILE_COUNT} 个日志文件已归档到 originals/"
fi

echo ""
echo "🧹 步骤 2: 生成 MEMORY.md 整理提示"
echo "----------------------------------"

# 创建 MEMORY.md 清理标记
cat > "$MEMORY_DIR/.cleanup-request" << EOF
# Memory 整理请求
生成时间: $(date '+%Y-%m-%d %H:%M:%S')

## 待办事项

请在下次对话中执行以下 MEMORY.md 维护任务：

- [ ] 删除已完成的待办事项
- [ ] 合并重复的条目
- [ ] 将过时的信息移到 archive/
- [ ] 确保 MEMORY.md 总长度 < 500 行

## 建议的检查项

- 投资规则是否仍然有效？
- 是否有重复的交易戒律？
- 已完成的长期项目可以归档了吗？
EOF

echo "✅ 已生成整理标记: memory/.cleanup-request"

echo ""
echo "📦 步骤 3: 执行 Git 备份"
echo "----------------------------------"

# 提交归档更改
if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "月度归档: ${LAST_YEAR}-${LAST_MONTH} | $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin main
    echo "✅ 归档已推送到远程"
else
    echo "无更改需提交"
fi

echo ""
echo "=================================="
echo "归档任务完成 ✓"
echo "=================================="