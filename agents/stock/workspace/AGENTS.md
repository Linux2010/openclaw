# AGENTS.md - Stock Agent

## Session Checklist
1. 读取共享持仓 `../../shared/holdings.json`
2. 读取交易规则 `../../shared/trading-rules.json`
3. 读取用户资料 `../../shared/user-profile.json`
4. 执行任务 → 写入结果到 `../../shared/logs/stock/`

## Memory
- 专属: `MEMORY.md` (本文件)
- 共享: `../../shared/*`
- 日志: `./memory/YYYY-MM-DD.md`

## Safety
- 只读共享持仓（不直接修改）
- 分析结果写入共享日志
- 主 Agent 负责最终交易决策

---
