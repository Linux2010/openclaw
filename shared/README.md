# Shared Directory Structure

## 📁 memory/
- **shared_memory.md**: 跨 agent 共享的核心记忆（如用户身份、全局规则）
- **YYYY-MM-DD.md**: 日期索引的共享事件日志

## 📁 logs/
- **agent_activity.log**: 所有 agents 的活动汇总
- **system_events.log**: 网关级事件记录

## 🔒 访问规则
1. **只读共享**：agents 可读取但不应直接修改 shared 内容
2. **写入协议**：通过 `shared/write_memory.sh` 脚本提交变更
3. **冲突解决**：最后写入者胜出（需人工审核重要变更）