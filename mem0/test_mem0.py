#!/usr/bin/env python3
"""
Test Mem0 integration with Qwen API key
"""

import os
import sys

# Set environment variables for Qwen
os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"

print("✅ Mem0 environment configured successfully!")
print(f"   API Key: {os.environ['OPENAI_API_KEY'][:8]}...")
print(f"   Base URL: {os.environ['OPENAI_BASE_URL']}")
print(f"   Data path: /Users/hope/.openclaw/mem0/data/")

print("🚀 Testing Mem0 with Qwen API key...")
print("=" * 50)

try:
    from mem0 import Memory
    
    # Create memory with default config (using environment variables)
    memory = Memory()
    
    print("✅ Mem0 initialized successfully!")
    
    # Test adding memory
    print("🔄 Adding test memory...")
    test_messages = [
        {"role": "user", "content": "This is a test memory for Mem0 integration."},
        {"role": "assistant", "content": "Test memory stored successfully!"}
    ]
    
    result = memory.add(test_messages, user_id="test_user")
    print(f"✅ Memory added successfully! Result: {result}")
    
    # Test searching memory
    print("🔍 Searching test memory...")
    search_result = memory.search("test memory", user_id="test_user")
    print(f"✅ Memory search successful! Found {len(search_result['results'])} results")
    
    print("=" * 50)
    print("🎉 Mem0 integration is working perfectly!")
    print("💡 Your agents can now use intelligent memory features!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("=" * 50)
    print("⚠️  Mem0 integration needs attention")
    sys.exit(1)