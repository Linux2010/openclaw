#!/bin/bash
# 统一备份脚本

cd /Users/hope/.openclaw || exit 1

if [ -z "$(git status --porcelain)" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 无更改需要备份"
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份..."
git add -A
git commit -m "自动备份: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份成功 ✓"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份失败 ✗"
    exit 1
fi