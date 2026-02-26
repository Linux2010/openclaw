#!/usr/bin/env python3
"""
Test Mem0 with environment variables for model configuration
"""

import os
from mem0 import Memory

# Set environment variables
os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"

# Also try setting model via environment
os.environ["OPENAI_MODEL_NAME"] = "qwen3-max-2026-01-23"

print("✅ Environment variables set")
print(f"   API Key: {os.environ['OPENAI_API_KEY'][:12]}...")
print(f"   Base URL: {os.environ['OPENAI_BASE_URL']}")
print(f"   Model: {os.environ.get('OPENAI_MODEL_NAME', 'Not set')}")

try:
    # Initialize Mem0 with minimal config (rely on environment variables)
    memory = Memory()
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
    print(f"✅ Search completed! Found {len(search_result.get('results', []))} memories")
    
    print("\n🎉 Mem0 integration successful!")
    print(f"   Data stored in: /Users/hope/.openclaw/mem0/data/")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("⚠️  Mem0 integration needs attention")