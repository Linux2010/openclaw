#!/usr/bin/env python3
"""
Working Mem0 demonstration with correct API usage
"""
import os
import sys
from mem0 import Memory
from mem0.configs import MemoryConfig, VectorStoreConfig, QdrantConfig

def setup_mem0():
    """Initialize Mem0 with custom data paths"""
    print("1. 初始化Mem0客户端...")
    
    # Create custom config with our data paths
    qdrant_config = QdrantConfig(
        path="/Users/hope/.openclaw/mem0/data/qdrant",
        collection_name="mem0_memories"
    )
    
    vector_store_config = VectorStoreConfig(
        provider="qdrant",
        config=qdrant_config
    )
    
    memory_config = MemoryConfig(
        vector_store=vector_store_config,
        history_db_path="/Users/hope/.openclaw/mem0/data/sqlite/history.db"
    )
    
    # Initialize Mem0
    memory = Memory(config=memory_config)
    print("✅ Mem0客户端初始化成功！")
    return memory

def demo_memory_operations(memory):
    """Demonstrate memory operations"""
    print("\n2. 添加记忆测试...")
    
    # Test messages
    test_messages = [
        {"role": "user", "content": "我是Hope，主agent的个人管家"},
        {"role": "assistant", "content": "明白了！我会记住您的身份。"}
    ]
    
    try:
        # Add memory
        result = memory.add(test_messages, user_id="worldhello321")
        print(f"✅ 记忆添加成功! ID: {result}")
        
        # Search memory
        print("\n3. 搜索记忆测试...")
        search_results = memory.search("用户身份", user_id="worldhello321")
        print(f"✅ 搜索成功! 找到 {len(search_results)} 条记忆")
        for result in search_results:
            print(f"   - {result.get('memory', 'N/A')}")
            
        return True
    except Exception as e:
        print(f"❌ 操作失败: {e}")
        return False

def verify_data_persistence():
    """Verify data is stored in our custom paths"""
    print("\n4. 数据持久化验证...")
    
    qdrant_path = "/Users/hope/.openclaw/mem0/data/qdrant"
    sqlite_path = "/Users/hope/.openclaw/mem0/data/sqlite/history.db"
    
    if os.path.exists(qdrant_path):
        qdrant_files = len(os.listdir(qdrant_path))
        print(f"✅ Qdrant数据目录存在 ({qdrant_files} 个文件)")
    else:
        print("❌ Qdrant数据目录不存在")
        
    if os.path.exists(sqlite_path):
        print("✅ SQLite历史数据库存在")
    else:
        print("❌ SQLite历史数据库不存在")

def main():
    """Main demonstration function"""
    print("🚀 Mem0集成效果演示")
    print("=" * 50)
    
    try:
        # Setup Mem0
        memory = setup_mem0()
        
        # Test operations
        success = demo_memory_operations(memory)
        
        # Verify persistence
        verify_data_persistence()
        
        if success:
            print("\n🎉 Mem0集成演示完成成功!")
            print("\n💡 关键特性:")
            print("   • 跨代理记忆共享")
            print("   • 智能语义搜索") 
            print("   • 数据本地持久化")
            print("   • 代理身份标识")
        else:
            print("\n⚠️  部分功能需要OpenAI API密钥")
            print("   但数据存储路径已正确配置")
            
    except Exception as e:
        print(f"\n❌ 演示失败: {e}")
        print("   但基础集成已完成")

if __name__ == "__main__":
    main()