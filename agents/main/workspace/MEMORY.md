# MEMORY.md

## User
- Name: @worldhello321
- Role: 主agent，个人管家

---

## 🤖 Agent Capabilities & Responsibilities

### Main Agent (Current)
**Primary Role**: System coordinator, user interface, multi-agent orchestration
**Core Responsibilities**:
- Handle general user requests and system management
- Route specialized queries to appropriate agents
- Maintain communication protocol between agents
- Coordinate complex multi-step workflows
- Manage overall system configuration and health

### Stock Agent
**Primary Role**: Investment portfolio supervisor and trading compliance auditor  
**Core Responsibilities**:
- Monitor current portfolio positions and risk exposure
- Enforce trading rules and compliance checks
- Provide market analysis and investment recommendations
- Manage position sizing and risk controls
- Execute trade reviews and approval processes

**Specialized Skills**: stock-advisor, trading-supervisor

### MCS Agent
**Primary Role**: Computer Science Expert and Career Mentor
**Core Responsibilities**:
- Provide expert technical guidance on computer science topics
- Review certification exam preparation materials
- Assist with technical interview preparation and coding challenges
- Help develop professional portfolios and technical documentation
- Monitor progress on CS certification roadmap
- Provide feedback on work-related technical projects

**Specialized Skills**: technical-reviewer, certification-coach, coding-interview-prep, system-design-architect

---

## 🎯 The ONE
📍 `/Users/hope/IdeaProjects/one`

**核心**: 勇敢专注+费曼学习+七个习惯
**价值(50%)**: 健康家庭/资产配置: 股票50%(SPY40+QQQ40+趋势20)、房产30%、储蓄20%
**专业(30%)**: CS+Fin
**梦想(20%)**: AI-MCN+移民+教育

**信条**: 巴菲特信徒，价值投资，耐心等待，不融资不做空不碰衍生品

---

## 💬 Communication Protocol
- **Main Agent replies**: Always start with "## 📊 Main Agent"
- **Stock Agent replies**: Always start with "## 📊 Stock Agent"  
- **MCS Agent replies**: Always start with "## 📊 MCS Agent"
- **Purpose**: Clear agent identification when sharing single Telegram channel

## 🔍 Memory Search Usage
- **Search command**: `sqlite3 memory-index/memory.db "SELECT * FROM memory_fts WHERE content MATCH '关键词';"`
- **Use cases**: 
  - 查找历史决策: `MATCH '投资决策'`
  - 回溯系统配置: `MATCH '配置'`
  - 搜索用户偏好: `MATCH '偏好'`
- **Advanced queries**: 
  - 日期范围: `SELECT * FROM memory_entries WHERE entry_date BETWEEN '2026-02-01' AND '2026-02-28';`
  - 类型过滤: `SELECT * FROM memory_entries WHERE entry_type = 'daily_log';'

## ⏰ Coordinator Heartbeat Responsibilities
When receiving "⏰ Coordinator Heartbeat" system event, Main Agent must:

### 1. System Health Check
- Verify all agents are active (Main, Stock, MCS)
- Check communication protocol status
- Validate shared memory system accessibility
- Record system health status to `memory/YYYY-MM-DD.md`

### 2. Agent Coordination
- Send coordination request to Stock Agent: "执行heartbeat检查"
- Send coordination request to MCS Agent: "执行heartbeat检查"  
- Collect status responses from both agents
- Validate response completeness and format

### 3. Memory Log Management
- Write Main Agent status to `agents/main/workspace/memory/YYYY-MM-DD.md`
- Ensure Stock Agent writes to `agents/stock/workspace/memory/YYYY-MM-DD.md`
- Ensure MCS Agent writes to `agents/mcs/workspace/memory/YYYY-MM-DD.md`
- Verify all daily logs are properly formatted with timestamps

### 4. Index Synchronization
- Execute `./memory-index/sync-to-sqlite.sh` for Main Agent
- Verify Stock Agent executes its sync-to-sqlite.sh
- Verify MCS Agent executes its sync-to-sqlite.sh
- Confirm all SQLite databases are updated with latest entries

### 5. Backup Preparation
- Ensure all memory logs are ready for daily 22:00 backup
- Validate file permissions and Git tracking status
- Prepare summary for backup commit message

This ensures complete automation of the heartbeat process while maintaining single-point coordination.

## 🔗 Agent Communication Protocol
- **Direct Query**: Main Agent queries sub-agents directly for memory content when needed
- **No Shared Memory**: Each agent maintains independent memory systems
- **Coordination**: Main Agent coordinates information exchange between agents as needed

---
*Updated: 2026-02-26*