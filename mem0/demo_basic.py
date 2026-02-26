#!/usr/bin/env python3
"""
Basic Mem0 demonstration using default configuration
"""
import os
import sys

# Add the mem0 data directory to environment
os.environ['QDRANT_PATH'] = '/Users/hope/.openclaw/mem0/data/qdrant'

try:
    from mem0 import Memory
    
    print("🚀 基础Mem0演示")
    print("=" * 50)
    
    # Initialize with default config (will use /tmp/qdrant by default)
    print("1. 初始化Mem0...")
    m = Memory()
    print("✅ 初始化成功！")
    
    # Test adding memory
    print("\n2. 添加测试记忆...")
    messages = [
        {"role": "user", "content": "I am testing Mem0 integration with OpenClaw"},
        {"role": "assistant", "content": "Mem0 is working correctly!"}
    ]
    
    result = m.add(messages, user_id="worldhello321")
    print(f"✅ 记忆添加成功! ID: {result}")
    
    # Test searching memory
    print("\n3. 搜索记忆...")
    results = m.search("OpenClaw integration", user_id="worldhello321")
    print(f"✅ 搜索完成! 找到 {len(results)} 条记忆")
    
    if results:
        print(f"   内容: {results[0]['memory']}")
        print(f"   分数: {results[0]['score']}")
    
    print("\n" + "=" * 50)
    print("🎉 基础Mem0演示完成!")
    
except Exception as e:
    print(f"❌ 演示失败: {e}")
    sys.exit(1)