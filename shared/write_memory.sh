#!/bin/bash
# 安全写入共享记忆的脚本

if [ $# -lt 2 ]; then
  echo "用法: $0 <agent_id> <内容>"
  exit 1
fi

AGENT_ID=$1
CONTENT=$2
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] [$AGENT_ID]: $CONTENT" >> /Users/hope/.openclaw/shared/memory/shared_memory.md
echo "已记录到共享记忆"