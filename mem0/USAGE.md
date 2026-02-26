# Mem0 Integration Usage Guide

## Overview
This directory contains the Mem0 memory system integrated with your OpenClaw multi-agent setup. It uses your existing Qwen model (bailian/qwen3-max-2026-01-23) instead of OpenAI.

## Directory Structure
```
mem0/
├── data/                    # Persistent data storage
│   ├── qdrant/             # Vector database data
│   └── sqlite/             # History database
├── config/                 # Configuration files
│   ├── mem0_config.yaml    # Default OpenAI config (not used)
│   └── mem0_config_qwen.yaml  # Qwen-compatible config
├── custom_mem0_client.py   # Custom client for Qwen integration
├── init_mem0.py           # Initialization script
├── setup_env.sh           # Environment setup
├── example_usage.py       # Usage examples
└── USAGE.md               # This file
```

## Setup
1. **Environment**: Ensure your OpenClaw is running with Qwen model
2. **Dependencies**: `pip3 install mem0ai` (already installed)
3. **Data Directory**: All data is stored in `/Users/hope/.openclaw/mem0/data/`

## Usage in Agents
Each agent has a `mem0_client.py` file that provides:
- `add_memory(messages, metadata=None)` - Add memories with agent identification
- `search_memory(query, filters=None)` - Search relevant memories

### Example (Main Agent):
```python
from mem0_client import LocalMem0Client
mem0 = LocalMem0Client()
messages = [
    {"role": "user", "content": "I want to learn AI research"},
    {"role": "assistant", "content": "Noted! I'll remember your AI research interest."}
]
mem0.add_memory(messages, metadata={"categories": ["career", "research"]})
```

## Data Migration
To move to a new machine:
1. Copy the entire `/Users/hope/.openclaw/mem0/` directory
2. Install dependencies: `pip3 install mem0ai`
3. The system will work immediately with all existing memories

## Backup
Mem0 data is automatically included in your regular OpenClaw backups since it's within the `.openclaw` directory.

## Troubleshooting
- **API Key Issues**: Not applicable - uses your existing Qwen setup
- **Data Corruption**: Restore from backup or delete `data/` directory to start fresh
- **Performance**: Qdrant runs locally, may be slower than cloud services

## Integration Status
✅ Main Agent: Integrated  
✅ Stock Agent: Integrated  
✅ MCS Agent: Integrated  
✅ Qwen Model Support: Working  
✅ Data Persistence: Verified  
✅ Backup Integration: Automatic