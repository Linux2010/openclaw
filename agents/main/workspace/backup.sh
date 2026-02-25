#!/bin/bash
# OpenClaw 全目录自动备份脚本

OPENCLAW_DIR="/Users/hope/.openclaw"
cd "$OPENCLAW_DIR" || exit 1

# 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 没有需要备份的更改"
    exit 0
fi

# 有更改，执行备份
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 发现更改，开始备份..."

# 添加所有更改（排除 .gitignore 规则）
git add -A

# 提交（带时间戳）
git commit -m "自动备份: $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到 openclaw-backup 私有仓库
git push origin main

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份成功 ✓"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份失败 ✗"
    exit 1
fi