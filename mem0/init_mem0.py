#!/usr/bin/env python3
import os
import sys

def setup_mem0_data_dirs():
    """创建Mem0数据目录结构"""
    data_dirs = [
        "/Users/hope/.openclaw/mem0/data/qdrant",
        "/Users/hope/.openclaw/mem0/data/sqlite",
        "/Users/hope/.openclaw/mem0/config"
    ]
    
    for dir_path in data_dirs:
        os.makedirs(dir_path, exist_ok=True)
        print(f"Created directory: {dir_path}")

def test_mem0_connection():
    """测试Mem0连接和数据存储"""
    try:
        # 设置环境变量（需要用户配置）
        if not os.environ.get('OPENAI_API_KEY'):
            print("⚠️  WARNING: OPENAI_API_KEY not set. Please set it before using Mem0.")
            print("   export OPENAI_API_KEY='your-api-key'")
            return False
            
        from mem0 import Memory
        
        # 使用自定义路径初始化
        memory = Memory(
            vector_store_config={
                "provider": "qdrant",
                "config": {
                    "path": "/Users/hope/.openclaw/mem0/data/qdrant"
                }
            },
            history_db_path="/Users/hope/.openclaw/mem0/data/sqlite/history.db"
        )
        
        # 测试添加记忆
        test_messages = [
            {"role": "user", "content": "This is a test memory"},
            {"role": "assistant", "content": "Test memory stored successfully"}
        ]
        memory.add(test_messages, user_id="test_user")
        
        # 测试搜索
        results = memory.search("test memory", user_id="test_user")
        print(f"Test successful! Found {len(results)} memories")
        
        return True
    except Exception as e:
        print(f"Test failed: {e}")
        return False

if __name__ == "__main__":
    print("Setting up Mem0 data directories...")
    setup_mem0_data_dirs()
    
    print("Testing Mem0 connection...")
    if test_mem0_connection():
        print("✅ Mem0 setup completed successfully!")
    else:
        print("❌ Mem0 setup needs attention!")
        sys.exit(1)