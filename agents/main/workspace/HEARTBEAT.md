# HEARTBEAT.md - Quick Checks

## Checks (rotate 2-4× daily)
- [ ] **Memory**: Important decisions → `memory/YYYY-MM-DD.md` + `MEMORY.md`
- [ ] **SQLite**: If memory updated → run `memory-index/sync-to-sqlite.sh`
- [ ] **Backup**: If changes → run `backup.sh`

## Scripts
```bash
./check-memory.sh              # Create today's log
./memory-index/sync-to-sqlite.sh  # Update search index
./backup.sh                    # Commit & push
```

## When to Reach Out
- Important emails
- Calendar event < 2h
- Found something interesting
- Been > 8h since last message

## Stay Quiet (HEARTBEAT_OK)
- Late night (23:00-08:00)
- Human busy
- Nothing new
- Checked < 30 min ago

---
*Last check: 2026-02-24 22:00*
