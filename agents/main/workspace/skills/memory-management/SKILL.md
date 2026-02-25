# Memory Management Skill

Manage OpenClaw's memory system effectively: daily logs, long-term memory, and SQLite indexing.

## Overview

This skill provides best practices for recording, organizing, and retrieving memories across sessions.

## Architecture

```
MEMORY.md              → Long-term principles (human-editable)
memory/YYYY-MM-DD.md   → Daily conversation logs
memory/archive/        → Monthly archived logs
memory-index/          → SQLite + FTS5 search index
```

## When to Record

### Must Record (High Priority)
- Trading decisions (buy/sell orders, position changes)
- Strategy changes or new rules
- Investment principles learned
- System configuration changes
- Important user preferences (e.g., "disable TTS")

### Should Record (Medium Priority)
- Tool/skill usage discoveries
- Successful workflows
- Error resolutions
- Feature requests implemented

### Optional (Low Priority)
- Casual conversations
- Weather queries
- One-off jokes

## How to Record

### Daily Log Format
```markdown
### HH:MM - Channel (@user)
- **Topic**: Brief description
- **Key info**: Important details
- **Outcome**: Result or decision
```

### Auto-Recording (Current Session)
```
User message → My response → I append summary to memory/YYYY-MM-DD.md
```

### Manual Recording (For Long-term)
Update MEMORY.md for:
- Investment rules and principles
- Active trading positions
- User identity and preferences
- Ongoing projects (The ONE)

## SQLite Index Usage

### Search Commands
```bash
cd memory-index

# Full-text search
./search.sh "关键词"
./search.sh "AMZN"
./search.sh "挂单"

# Statistics
./search.sh --stats
./search.sh --recent 10

# Direct SQL queries
sqlite3 memory.db "SELECT * FROM memory_fts WHERE content MATCH '投资';"
```

### When to Sync
- After important conversations
- Before searching for historical info
- During Heartbeat checks (auto)

## Maintenance Tasks

### Daily (Via Heartbeat)
1. Check/create today's log
2. Sync to SQLite index
3. Git backup

### Monthly
Review MEMORY.md:
- Remove outdated info
- Update active positions
- Consolidate learned principles

### As Needed
```bash
# Full re-index
./memory-index/sync-to-sqlite.sh --full-sync

# Search historical data
./memory-index/search.sh "pattern"
```

## Best Practices

### Recording Principles
1. **Be concise**: Summarize, don't copy-paste full conversation
2. **Be factual**: What happened, not interpretations
3. **Be timely**: Record immediately after important exchanges
4. **Link related**: Reference previous dates when continuing topics

### Memory Hygiene
- Keep MEMORY.md under 500 lines
- Move details to daily logs
- Archive old logs monthly
- Verify SQLite index sync status

### Query Patterns
```bash
# Find all trading discussions
./search.sh "交易|挂单|持仓|买入|卖出"

# Find specific stock mentions
./search.sh "AMZN|NVDA|TSLA"

# Recent decisions
./search.sh --recent 5
```

## Troubleshooting

### "Search returns no results"
→ Run `./sync-to-sqlite.sh` to update index

### "MEMORY.md too large"
→ Move historical details to daily logs, keep only current principles

### "Missing old conversations"
→ Check `memory/archive/` for archived logs

## API Reference

### Available Tools
| Tool | Purpose | Example |
|------|---------|---------|
| `memory_search` | Semantic search (needs API) | `query: "investment rules"` |
| `memory_get` | Read specific file | `path: "memory/2026-02-11.md"` |

### File Locations
```
/Users/hope/.openclaw/workspace/
├── MEMORY.md
├── memory/
│   ├── 2026-MM-DD.md
│   └── archive/
└── memory-index/
    ├── memory.db
    ├── search.sh
    └── sync-to-sqlite.sh
```

## Version
- Created: 2026-02-11
- Version: 1.0
- SQLite FTS5 enabled
- Auto-sync via Heartbeat