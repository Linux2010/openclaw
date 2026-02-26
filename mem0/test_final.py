#!/usr/bin/env python3
"""
Final Mem0 test with correct Qwen configuration
"""

import os
from mem0 import Memory

def test_mem0():
    print("✅ Environment variables set")
    print(f"   API Key: {os.environ.get('OPENAI_API_KEY', 'not set')[:10]}...")
    print(f"   Base URL: {os.environ.get('OPENAI_BASE_URL', 'not set')}")
    
    print("🚀 Testing Mem0 with final configuration...")
    
    try:
        # Create memory with direct config
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
        
        memory = Memory.from_config(config)
        print("✅ Mem0 initialized successfully!")
        
        # Test adding memory
        messages = [
            {"role": "user", "content": "This is a test memory for Mem0 integration"},
            {"role": "assistant", "content": "Test memory stored successfully"}
        ]
        
        print("🔄 Adding test memory...")
        memory.add(messages, user_id="test_user")
        print("✅ Test memory added successfully!")
        
        # Test searching memory
        print("🔍 Searching test memory...")
        results = memory.search("test memory", user_id="test_user")
        print(f"✅ Found {len(results['results'])} memories!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # Set environment variables
    os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
    os.environ["OPENAI_BASE_URL"] = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
    success = test_mem0()
    if success:
        print("🎉 Mem0 integration successful!")
    else:
        print("⚠️  Mem0 integration needs attention")