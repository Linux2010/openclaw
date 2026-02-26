#!/usr/bin/env python3
"""
Correct Mem0 configuration for Qwen model
"""

from mem0.configs.base import MemoryConfig
from mem0.llms.configs import LlmConfig
from mem0.vector_stores.configs import VectorStoreConfig

def create_qwen_mem0_config():
    """Create correct Mem0 configuration for Qwen"""
    
    # LLM Configuration
    llm_config = LlmConfig(
        provider="openai",
        config={
            "model": "qwen3-max-2026-01-23",
            "api_key": "sk-sp-1f07658367b9409393e075f9f63490bf",
            "base_url": "https://coding.dashscope.aliyuncs.com/v1"
        }
    )
    
    # Vector Store Configuration
    vector_store_config = VectorStoreConfig(
        provider="qdrant",
        config={
            "path": "/Users/hope/.openclaw/mem0/data/qdrant",
            "collection_name": "mem0_memories"
        }
    )
    
    # Full Memory Configuration
    memory_config = MemoryConfig(
        llm=llm_config,
        vector_store=vector_store_config,
        history_db_path="/Users/hope/.openclaw/mem0/data/sqlite/history.db"
    )
    
    return memory_config