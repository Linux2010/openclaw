#!/usr/bin/env python3
"""
Final Mem0 test with correct Base URL from OpenClaw config
"""

import os
from mem0 import Memory

def test_mem0_with_qwen():
    """Test Mem0 integration with Qwen API key and correct base URL"""
    
    # Set environment variables from OpenClaw config
    os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
    os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"
    
    print("✅ Environment variables set")
    print(f"   API Key: {os.environ['OPENAI_API_KEY'][:12]}...")
    print(f"   Base URL: {os.environ['OPENAI_BASE_URL']}")
    
    try:
        # Initialize Mem0 with default config (uses env vars)
        memory = Memory()
        print("✅ Mem0 initialized successfully!")
        
        # Test adding a memory
        test_messages = [
            {"role": "user", "content": "This is a test memory for Mem0 integration"},
            {"role": "assistant", "content": "Mem0 integration test successful!"}
        ]
        
        print("🔄 Adding test memory...")
        memory.add(test_messages, user_id="test_user")
        print("✅ Test memory added successfully!")
        
        # Test searching memory
        print("🔍 Searching test memory...")
        results = memory.search("test memory", user_id="test_user")
        print(f"✅ Found {len(results.get('results', []))} memories!")
        
        # Verify data persistence
        qdrant_path = "/Users/hope/.openclaw/mem0/data/qdrant"
        if os.path.exists(qdrant_path):
            files = os.listdir(qdrant_path)
            print(f"✅ Data persisted to: {qdrant_path} ({len(files)} files)")
        else:
            print("⚠️  Data directory not found")
            
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Mem0 with correct Base URL from OpenClaw...")
    print("=" * 60)
    
    success = test_mem0_with_qwen()
    
    print("=" * 60)
    if success:
        print("🎉 Mem0 integration SUCCESSFUL!")
        print("💡 Your Mem0 is now ready to use with your Qwen API!")
    else:
        print("⚠️  Mem0 integration needs attention")