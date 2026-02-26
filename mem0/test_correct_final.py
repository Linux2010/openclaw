#!/usr/bin/env python3
"""
Final test script for Mem0 with Qwen configuration
"""

import os
import sys

# Add the config directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'config'))

from correct_config import create_mem0_instance

def main():
    print("🚀 Testing Mem0 with final correct configuration...")
    print("=" * 60)
    
    try:
        # Set environment variables
        os.environ["OPENAI_API_KEY"] = "sk-sp-1f07658367b9409393e075f9f63490bf"
        os.environ["OPENAI_BASE_URL"] = "https://coding.dashscope.aliyuncs.com/v1"
        
        print("✅ Environment variables set")
        print(f"   API Key: {os.environ['OPENAI_API_KEY'][:12]}...")
        print(f"   Base URL: {os.environ['OPENAI_BASE_URL']}")
        
        # Create Mem0 instance
        memory = create_mem0_instance()
        print("✅ Mem0 initialized successfully!")
        
        # Test adding memory
        print("🔄 Adding test memory...")
        messages = [
            {"role": "user", "content": "This is a test memory for Mem0 integration"},
            {"role": "assistant", "content": "Test memory stored successfully"}
        ]
        
        result = memory.add(messages, user_id="test_user")
        print("✅ Test memory added successfully!")
        print(f"   Result: {result}")
        
        # Test searching memory
        print("🔍 Searching test memory...")
        search_result = memory.search("test memory", user_id="test_user")
        print("✅ Memory search completed!")
        print(f"   Found {len(search_result['results'])} memories")
        
        print("\n🎉 Mem0 integration SUCCESSFUL!")
        print("   Data is stored locally in /Users/hope/.openclaw/mem0/data/")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("⚠️  Mem0 integration needs attention")

if __name__ == "__main__":
    main()