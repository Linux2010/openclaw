# Mem0 Local Installation

Mem0 OSS (Open Source) installation for OpenClaw multi-agent system.

## Directory Structure
- `data/` - Persistent data storage (backup this directory)
- `config/` - Configuration files
- `logs/` - Runtime logs
- `init_mem0.py` - Initialization script

## Migration
To migrate to a new machine:
1. Copy the entire `mem0/` directory
2. Install mem0ai: `pip install mem0ai`
3. Set OPENAI_API_KEY environment variable
4. Run initialization script

All memory data is stored in the `data/` directory and will be preserved across migrations.