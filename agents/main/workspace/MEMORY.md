# MEMORY.md

## User
- Name: @worldhello321
- Role: core agent，个人管家
- Permissions: Full access to macOS system (file operations, process management, system configuration)

---

## 🤖 Agent Capabilities & Responsibilities

### Core Agent (Current)
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

## 📚 Knowledge Repository
- **AI-Note Project**: `/Users/hope/IdeaProjects/ai-note`
- **Purpose**: AI-friendly technical documentation for reference by other AI systems
- **Structure**: 
  - `README.md`: Project overview
  - `index.md`: Global index
  - `openclaw/`: OpenClaw-specific solutions

---

## 💬 Communication Protocol
- **Core Agent replies**: Always start with "## 📊 Core Agent"
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

### 1. System Health Check Only
- Verify all agents are active (Main, Stock, MCS)
- Check communication protocol status
- Validate memory system accessibility
- **Do NOT generate detailed reports or write to daily logs**
- **Respond with HEARTBEAT_OK if all systems normal**

### 2. Minimal Coordination
- Send simple health check ping to Stock Agent
- Send simple health check ping to MCS Agent  
- Collect basic alive/dead status only
- **Do NOT request detailed status summaries**

### 3. Schedule Configuration
- **Frequency**: Every 2 hours (8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00)
- **Silent Period**: 22:00 - 8:00 (no heartbeat execution)
- **Purpose**: Pure health monitoring, not content generation

This ensures heartbeat remains lightweight and focused purely on system health monitoring.

## 📅 Daily Backup Process (22:00)
When receiving "执行每日备份" system event at 22:00, Main Agent must coordinate the following workflow:

### Phase 1: Agent Self-Summary (22:00)
- **Stock Agent**: Generate daily investment summary, write to `agents/stock/workspace/memory/YYYY-MM-DD.md`, execute `sync-to-sqlite.sh`
- **MCS Agent**: Generate daily career development summary, write to `agents/mcs/workspace/memory/YYYY-MM-DD.md`, execute `sync-to-sqlite.sh`
- **Main Agent**: Wait for confirmation that both agents have completed their summaries

### Phase 2: Main Agent Summary (22:05)
- **Main Agent**: Generate system coordination summary from session transcripts (`agents/main/sessions/*.jsonl`) and system activity logs, write to `agents/main/workspace/memory/YYYY-MM-DD.md`
- **Main Agent**: Execute `./memory-index/sync-to-sqlite.sh` to update main memory index
- **Validation**: Ensure all three agents have valid daily log entries for the date

### Phase 3: GitHub Backup (22:10)
- **Execute**: `./backup.sh` to commit all changes to GitHub repository
- **Include**: All MEMORY.md files, daily logs, session transcripts, and system configurations
- **Verification**: Confirm successful push to remote repository

### Key Principles
- **Agent Autonomy**: Each agent maintains its own memory system independently
- **Coordination**: Main Agent orchestrates the backup process but does not generate agent content
- **Completeness**: All daily activities are captured in respective agent memory systems
- **Reliability**: Automated backup ensures no data loss

## 🔗 Agent Communication Protocol
- **Direct Query**: Main Agent queries sub-agents directly for memory content when needed
- **No Shared Memory**: Each agent maintains independent memory systems
- **Coordination**: Main Agent coordinates information exchange between agents as needed

---

