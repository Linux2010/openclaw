#!/usr/bin/env python3
"""
Mem0集成效果演示脚本
"""

import sys
import os
sys.path.insert(0, '/Users/hope/.openclaw/agents/main/workspace')

from mem0_client import LocalMem0Client

def demo_mem0_integration():
    print("🚀 Mem0集成效果演示")
    print("=" * 50)
    
    # 初始化Mem0客户端
    print("1. 初始化Mem0客户端...")
    try:
        mem0_client = LocalMem0Client()
        print("✅ 客户端初始化成功！")
    except Exception as e:
        print(f"❌ 客户端初始化失败: {e}")
        return
    
    # 演示1: Main Agent添加记忆
    print("\n2. Main Agent添加用户身份记忆...")
    main_messages = [
        {"role": "user", "content": "我的身份是主agent，个人管家"},
        {"role": "assistant", "content": "明白了！您是主agent，负责协调和管理。"}
    ]
    try:
        result = mem0_client.add_memory(
            main_messages, 
            metadata={"agent_id": "main", "memory_type": "identity"}
        )
        print(f"✅ Main Agent记忆添加成功! ID: {result}")
    except Exception as e:
        print(f"❌ Main Agent记忆添加失败: {e}")
    
    # 演示2: Stock Agent添加交易规则
    print("\n3. Stock Agent添加交易规则记忆...")
    stock_messages = [
        {"role": "user", "content": "单次交易不超过1%，不是单股仓位限制"},
        {"role": "assistant", "content": "已更新交易规则：单次交易≤1%，单股总仓位可>1%"}
    ]
    try:
        result = mem0_client.add_memory(
            stock_messages,
            metadata={"agent_id": "stock", "memory_type": "trading_rules"}
        )
        print(f"✅ Stock Agent记忆添加成功! ID: {result}")
    except Exception as e:
        print(f"❌ Stock Agent记忆添加失败: {e}")
    
    # 演示3: MCS Agent添加职业目标
    print("\n4. MCS Agent添加职业目标记忆...")
    mcs_messages = [
        {"role": "user", "content": "我想发表AI顶级期刊论文，专注金融风控AI"},
        {"role": "assistant", "content": "已记录您的研究目标：AI顶级期刊，金融风控AI方向"}
    ]
    try:
        result = mem0_client.add_memory(
            mcs_messages,
            metadata={"agent_id": "mcs", "memory_type": "career_goals"}
        )
        print(f"✅ MCS Agent记忆添加成功! ID: {result}")
    except Exception as e:
        print(f"❌ MCS Agent记忆添加失败: {e}")
    
    # 演示4: 跨代理记忆检索
    print("\n5. 跨代理记忆检索测试...")
    
    # Main Agent查询所有记忆
    print("   - Main Agent查询用户身份:")
    try:
        results = mem0_client.search_memory("用户身份是什么？")
        if results:
            for result in results[:1]:  # 只显示第一个结果
                print(f"     📝 {result.get('memory', 'N/A')}")
                print(f"     👤 来源代理: {result.get('metadata', {}).get('agent_id', 'unknown')}")
        else:
            print("     ❌ 未找到相关记忆")
    except Exception as e:
        print(f"     ❌ 查询失败: {e}")
    
    # 查询交易规则
    print("   - 查询交易规则:")
    try:
        results = mem0_client.search_memory("交易规则是什么？")
        if results:
            for result in results[:1]:
                print(f"     📝 {result.get('memory', 'N/A')}")
                print(f"     👤 来源代理: {result.get('metadata', {}).get('agent_id', 'unknown')}")
        else:
            print("     ❌ 未找到相关记忆")
    except Exception as e:
        print(f"     ❌ 查询失败: {e}")
    
    # 查询职业目标
    print("   - 查询职业目标:")
    try:
        results = mem0_client.search_memory("用户的职业目标是什么？")
        if results:
            for result in results[:1]:
                print(f"     📝 {result.get('memory', 'N/A')}")
                print(f"     👤 来源代理: {result.get('metadata', {}).get('agent_id', 'unknown')}")
        else:
            print("     ❌ 未找到相关记忆")
    except Exception as e:
        print(f"     ❌ 查询失败: {e}")
    
    # 演示5: 数据持久化验证
    print("\n6. 数据持久化验证...")
    data_path = "/Users/hope/.openclaw/mem0/data"
    if os.path.exists(data_path):
        qdrant_files = len(os.listdir(os.path.join(data_path, "qdrant"))) if os.path.exists(os.path.join(data_path, "qdrant")) else 0
        sqlite_files = len(os.listdir(os.path.join(data_path, "sqlite"))) if os.path.exists(os.path.join(data_path, "sqlite")) else 0
        print(f"   ✅ Qdrant数据文件: {qdrant_files} 个")
        print(f"   ✅ SQLite数据文件: {sqlite_files} 个")
        print("   ✅ 数据已持久化存储!")
    else:
        print("   ❌ 数据目录不存在")
    
    print("\n" + "=" * 50)
    print("🎉 Mem0集成演示完成！")
    print("\n💡 关键特性:")
    print("   • 跨代理记忆共享")
    print("   • 智能语义搜索")
    print("   • 数据本地持久化")
    print("   • 代理身份标识")

if __name__ == "__main__":
    demo_mem0_integration()