#!/bin/bash
# Enhanced heartbeat script with automatic SQLite sync

echo "⏰ Main Agent Heartbeat - $(date '+%Y-%m-%d %H:%M')"

# Execute main heartbeat logic (this would be your actual heartbeat code)
# For now, we'll just create a timestamp entry
echo "# Main Agent Heartbeat - $(date '+%Y-%m-%d %H:%M')" > /Users/hope/.openclaw/agents/main/workspace/memory/$(date '+%Y-%m-%d')-heartbeat-auto.md
echo "" >> /Users/hope/.openclaw/agents/main/workspace/memory/$(date '+%Y-%m-%d')-heartbeat-auto.md
echo "## System Status" >> /Users/hope/.openclaw/agents/main/workspace/memory/$(date '+%Y-%m-%d')-heartbeat-auto.md
echo "- **Time**: $(date '+%Y-%m-%d %H:%M')" >> /Users/hope/.openclaw/agents/main/workspace/memory/$(date '+%Y-%m-%d')-heartbeat-auto.md
echo "- **Status**: Active" >> /Users/hope/.openclaw/agents/main/workspace/memory/$(date '+%Y-%m-%d')-heartbeat-auto.md

# Automatically sync to SQLite index
echo "🔄 Syncing memory to SQLite index..."
cd /Users/hope/.openclaw/agents/main/workspace && ./memory-index/sync-to-sqlite.sh

echo "✅ Heartbeat complete with index sync!"