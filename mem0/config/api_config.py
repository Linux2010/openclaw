#!/usr/bin/env python3
"""
API Configuration for Mem0 with Qwen
"""

# 替换下面的 "your-qwen-api-key" 为您的实际API密钥
QWEN_API_KEY = "your-qwen-api-key"

# Qwen API配置
MEM0_CONFIG = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "qwen3-max-2026-01-23",
            "api_key": QWEN_API_KEY,
            "base_url": "https://coding.dashscope.aliyuncs.com/v1",
            "temperature": 0.0
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": QWEN_API_KEY,
            "base_url": "https://coding.dashscope.aliyuncs.com/v1"
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