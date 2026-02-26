#!/usr/bin/env python3
"""
Final test for Mem0 with Qwen API
"""

import os
from mem0 import Memory

# Set environment variables
os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"

print("Creating Mem0 instance...")
try:
    # Create Mem0 with custom configuration
    config = {
        "llm": {
            "provider": "openai",
            "config": {
                "model": "qwen3-max-2026-01-23",
                "temperature": 0.0,
                "api_key": "sk-sp-1f07658367b9409393e075f9f63490bf",
                "base_url": "https://coding.dashscope.aliyuncs.com/v1"
            }
        },
        "embedder": {
            "provider": "openai",
            "config": {
                "model": "text-embedding-3-small",
                "api_key": "sk-sp-1f07658367b9409393e075f9f63490bf", 
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
    
    memory = Memory.from_config(config)
    print("✅ Mem0 initialized successfully!")
    
    # Test adding memory
    print("🔄 Adding test memory...")
    messages = [
        {"role": "user", "content": "This is a test memory for Mem0 integration."},
        {"role": "assistant", "content": "Test memory stored successfully!"}
    ]
    memory.add(messages, user_id="test_user")
    print("✅ Test memory added successfully!")
    
    # Test searching memory
    print("🔍 Searching test memory...")
    results = memory.search("test memory", user_id="test_user")
    print(f"✅ Found {len(results['results'])} memories!")
    
except Exception as e:
    print(f"❌ Error: {e}")