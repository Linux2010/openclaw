#!/bin/bash
# OpenClaw Skills Backup Script

set -e

BACKUP_DIR="$HOME/openclaw-backups"
DATE=$(date +%Y%m%d-%H%M)
SKILLS_DIR="/opt/homebrew/lib/node_modules/openclaw/skills"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 创建带时间戳的备份
echo "📦 备份 OpenClaw 技能到 $BACKUP_DIR/skills-$DATE.tar.gz"
tar -czf "$BACKUP_DIR/skills-$DATE.tar.gz" -C "$SKILLS_DIR" .

# 保留最近7天的备份，删除更旧的
echo "🧹 清理超过7天的旧备份"
find "$BACKUP_DIR" -name "skills-*.tar.gz" -mtime +7 -delete

echo "✅ 备份完成！"
echo "📁 备份位置: $BACKUP_DIR/skills-$DATE.tar.gz"
echo "📊 总备份数: $(ls $BACKUP_DIR/skills-*.tar.gz | wc -l)"