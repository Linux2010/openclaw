#!/usr/bin/env python3
"""
Simple Mem0 demonstration using standard API
"""
import os
import sys
from mem0 import Memory

def demo_mem0():
    print("🚀 简化版Mem0演示")
    print("=" * 50)
    
    # Initialize Mem0 with custom data path
    try:
        memory = Memory(
            vector_store_config={
                "provider": "qdrant",
                "config": {
                    "path": "/Users/hope/.openclaw/mem0/data/qdrant"
                }
            },
            history_db_path="/Users/hope/.openclaw/mem0/data/sqlite/history.db"
        )
        print("✅ Mem0初始化成功！")
    except Exception as e:
        print(f"❌ Mem0初始化失败: {e}")
        return
    
    # Test adding memory
    try:
        messages = [
            {"role": "user", "content": "我是主agent，个人管家"},
            {"role": "assistant", "content": "明白了！我会记住您的身份。"}
        ]
        result = memory.add(messages, user_id="worldhello321")
        print(f"✅ 添加记忆成功: {result}")
    except Exception as e:
        print(f"❌ 添加记忆失败: {e}")
    
    # Test searching memory
    try:
        results = memory.search("用户身份是什么？", user_id="worldhello321")
        print(f"✅ 搜索记忆成功: 找到 {len(results)} 条结果")
        for result in results:
            print(f"   - {result.get('memory', 'N/A')}")
    except Exception as e:
        print(f"❌ 搜索记忆失败: {e}")
    
    # Verify data persistence
    qdrant_files = len(os.listdir("/Users/hope/.openclaw/mem0/data/qdrant")) if os.path.exists("/Users/hope/.openclaw/mem0/data/qdrant") else 0
    sqlite_exists = os.path.exists("/Users/hope/.openclaw/mem0/data/sqlite/history.db")
    
    print(f"\n📁 数据持久化验证:")
    print(f"   • Qdrant数据文件: {qdrant_files} 个")
    print(f"   • SQLite数据库: {'✅ 存在' if sqlite_exists else '❌ 不存在'}")
    
    print("\n🎉 演示完成！")

if __name__ == "__main__":
    demo_mem0()