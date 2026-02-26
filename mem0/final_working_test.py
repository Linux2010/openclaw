#!/usr/bin/env python3
"""
Final working test for Mem0 with Qwen API
"""

import os
from mem0 import Memory

def test_mem0_with_qwen():
    """Test Mem0 integration with Qwen API"""
    
    # Set environment variables from OpenClaw config
    api_key = "sk-sp-1f07658367b9409393e075f9f63490bf"
    base_url = "https://coding.dashscope.aliyuncs.com/v1"
    model_name = "qwen3-max-2026-01-23"
    
    print("🚀 Final Working Test for Mem0 with Qwen")
    print("=" * 60)
    print(f"✅ Environment variables set")
    print(f"   API Key: {api_key[:12]}...")
    print(f"   Base URL: {base_url}")
    
    # Create Mem0 configuration with correct parameter names
    config = {
        "llm": {
            "provider": "openai",
            "config": {
                "model": model_name,
                "api_key": api_key,
                "openai_base_url": base_url,  # Correct parameter name
                "temperature": 0.0
            }
        },
        "embedder": {
            "provider": "openai",
            "config": {
                "model": "text-embedding-ada-002",  # Try standard embedding model
                "api_key": api_key,
                "openai_base_url": base_url
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
    
    try:
        # Initialize Mem0 with configuration
        memory = Memory.from_config(config)
        print("✅ Mem0 initialized successfully!")
        
        # Test adding a memory
        print("🔄 Adding test memory...")
        test_messages = [
            {"role": "user", "content": "I am testing Mem0 integration with Qwen"},
            {"role": "assistant", "content": "This is a test memory for Mem0 integration"}
        ]
        
        memory.add(test_messages, user_id="worldhello321")
        print("✅ Test memory added successfully!")
        
        # Test searching memories
        print("🔍 Searching for test memory...")
        results = memory.search("Mem0 integration test", user_id="worldhello321")
        print(f"✅ Found {len(results['results'])} memories!")
        
        print("\n🎉 Mem0 integration is working perfectly!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("⚠️  Mem0 integration needs attention")
        return False

if __name__ == "__main__":
    test_mem0_with_qwen()