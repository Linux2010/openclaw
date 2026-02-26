"""
Mem0 configuration for Qwen model with correct base URL
"""
import os

# Mem0 configuration for Qwen
MEM0_CONFIG = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "qwen3-max-2026-01-23",
            "api_key": os.getenv("OPENAI_API_KEY", "sk-sp-1f07658367b9409393e075f9f63490bf"),
            "openai_base_url": "https://coding.dashscope.aliyuncs.com/v1"
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": os.getenv("OPENAI_API_KEY", "sk-sp-1f07658367b9409393e075f9f63490bf"),
            "openai_base_url": "https://coding.dashscope.aliyuncs.com/v1"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "path": "/Users/hope/.openclaw/mem0/data/qdrant",
            "collection_name": "mem0_memories"
        }
    },
    "history_db_path": "/Users/hope/.openclaw/mem0/data/sqlite/history.db"
}