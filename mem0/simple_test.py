#!/usr/bin/env python3
import os
from mem0 import Memory

# Set environment variables
os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"

# Simple config with custom model
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "qwen3-max-2026-01-23",
            "temperature": 0.0
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "path": "/Users/hope/.openclaw/mem0/data/qdrant"
        }
    }
}

print("Creating Mem0 instance...")
try:
    memory = Memory.from_config(config)
    print("✅ Mem0 initialized successfully!")
    
    # Test adding memory
    messages = [
        {"role": "user", "content": "Hello, I'm testing Mem0 with Qwen!"},
        {"role": "assistant", "content": "Great! I'll remember this test."}
    ]
    
    print("🔄 Adding test memory...")
    memory.add(messages, user_id="test_user")
    print("✅ Test memory added successfully!")
    
    # Test searching
    print("🔍 Searching for memories...")
    results = memory.search("test", user_id="test_user")
    print(f"✅ Found {len(results['results'])} memories!")
    
except Exception as e:
    print(f"❌ Error: {e}")