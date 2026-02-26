#!/usr/bin/env python3
"""
Final Mem0 Qwen Integration Demo
"""

import os
import sys
from mem0 import Memory

def main():
    print("🚀 Final Mem0 Qwen Integration Demo")
    print("=" * 50)
    
    # Create configuration dictionary (not MemoryConfig object)
    config = {
        "llm": {
            "provider": "openai",
            "config": {
                "model": "qwen3-max-2026-01-23",
                "api_key": os.getenv("QWEN_API_KEY", "your-qwen-api-key"),
                "base_url": "https://coding.dashscope.aliyuncs.com/v1"
            }
        },
        "vector_store": {
            "provider": "qdrant",
            "config": {
                "path": "/Users/hope/.openclaw/mem0/data/qdrant"
            }
        },
        "history_db_path": "/Users/hope/.openclaw/mem0/data/sqlite/history.db"
    }
    
    try:
        # Create Memory instance with config dict
        memory = Memory.from_config(config)
        print("✅ Mem0 initialized successfully with Qwen configuration!")
        print(f"   Data path: /Users/hope/.openclaw/mem0/data/")
        print(f"   Vector store: Qdrant (local)")
        print(f"   LLM: Qwen (OpenAI-compatible)")
        
        # Test data persistence
        test_data_dir = "/Users/hope/.openclaw/mem0/data"
        if os.path.exists(test_data_dir):
            qdrant_files = len(os.listdir(os.path.join(test_data_dir, "qdrant"))) if os.path.exists(os.path.join(test_data_dir, "qdrant")) else 0
            sqlite_files = len(os.listdir(os.path.join(test_data_dir, "sqlite"))) if os.path.exists(os.path.join(test_data_dir, "sqlite")) else 0
            print(f"   Data files: {qdrant_files} Qdrant + {sqlite_files} SQLite")
        
        print("\n🎉 Mem0 integration is ready!")
        print("💡 Remember: You need to set QWEN_API_KEY environment variable")
        print("   export QWEN_API_KEY='your-actual-api-key'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Note: Mem0 requires a valid API key to function.")
        print("The data storage is completely local and persistent.")

if __name__ == "__main__":
    main()