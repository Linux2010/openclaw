#!/usr/bin/env python3
"""
Direct Mem0 test with Qwen configuration
"""

import os
from mem0 import Memory

# Set environment variables
os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"

print("✅ Environment variables set")
print(f"   API Key: {os.environ['OPENAI_API_KEY'][:10]}...")
print(f"   Base URL: {os.environ['OPENAI_BASE_URL']}")

# Create configuration with correct model name
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "qwen3-max-2026-01-23",
            "temperature": 0.0,
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
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

print("🚀 Testing Mem0 with direct configuration...")
try:
    # Create Memory instance
    memory = Memory.from_config(config)
    print("✅ Mem0 initialized successfully!")
    
    # Test adding memory
    test_messages = [
        {"role": "user", "content": "This is a test memory for Mem0 integration"},
        {"role": "assistant", "content": "Test memory stored successfully"}
    ]
    
    print("🔄 Adding test memory...")
    result = memory.add(test_messages, user_id="test_user")
    print(f"✅ Memory added successfully! Result: {result}")
    
    # Test searching memory
    print("🔍 Searching test memory...")
    search_result = memory.search("test memory", user_id="test_user")
    print(f"✅ Search completed! Found {len(search_result['results'])} memories")
    
    print("\n🎉 Mem0 integration SUCCESSFUL!")
    print("💡 Your Mem0 is now ready to use with Qwen!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("⚠️  Mem0 integration needs attention")