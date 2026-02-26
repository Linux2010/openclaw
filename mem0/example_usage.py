#!/usr/bin/env python3
"""
Mem0集成使用示例
演示如何在各代理中使用Mem0
"""

import sys
import os

# 添加代理workspace到Python路径
sys.path.insert(0, '/Users/hope/.openclaw/agents/main/workspace')
sys.path.insert(0, '/Users/hope/.openclaw/agents/stock/workspace')  
sys.path.insert(0, '/Users/hope/.openclaw/agents/mcs/workspace')

def test_main_agent():
    """测试Main Agent的Mem0集成"""
    print("=== 测试 Main Agent ===")
    try:
        from mem0_client import LocalMem0Client
        client = LocalMem0Client()
        
        # 添加记忆
        messages = [
            {"role": "user", "content": "我是主agent，个人管家"},
            {"role": "assistant", "content": "已记录您的身份信息"}
        ]
        result = client.add_memory(messages, metadata={"categories": ["identity", "general"]})
        print(f"✅ Main Agent记忆添加成功: {result}")
        
        # 搜索记忆
        memories = client.search_memory("用户身份")
        print(f"🔍 找到 {len(memories)} 条相关记忆")
        
    except Exception as e:
        print(f"❌ Main Agent测试失败: {e}")

def test_stock_agent():
    """测试Stock Agent的Mem0集成"""
    print("\n=== 测试 Stock Agent ===")
    try:
        from mem0_client import LocalMem0Client
        client = LocalMem0Client()
        client.agent_id = "stock"
        
        # 添加交易规则记忆
        messages = [
            {"role": "user", "content": "单次交易不超过1%，不是单股仓位"},
            {"role": "assistant", "content": "已更新交易规则理解"}
        ]
        result = client.add_memory(
            messages, 
            metadata={
                "categories": ["trading", "rules"], 
                "memory_type": "trading_rule"
            }
        )
        print(f"✅ Stock Agent记忆添加成功: {result}")
        
    except Exception as e:
        print(f"❌ Stock Agent测试失败: {e}")

def test_mcs_agent():
    """测试MCS Agent的Mem0集成"""
    print("\n=== 测试 MCS Agent ===")
    try:
        from mem0_client import LocalMem0Client
        client = LocalMem0Client()
        client.agent_id = "mcs"
        
        # 添加职业目标记忆
        messages = [
            {"role": "user", "content": "我想发表AI顶级期刊论文"},
            {"role": "assistant", "content": "建议研究方向：金融风控AI、可解释AI"}
        ]
        result = client.add_memory(
            messages,
            metadata={
                "categories": ["career", "research", "ai"],
                "memory_type": "career_goal"
            }
        )
        print(f"✅ MCS Agent记忆添加成功: {result}")
        
    except Exception as e:
        print(f"❌ MCS Agent测试失败: {e}")

def test_cross_agent_search():
    """测试跨代理记忆搜索"""
    print("\n=== 测试跨代理记忆搜索 ===")
    try:
        from mem0_client import LocalMem0Client
        client = LocalMem0Client()
        
        # 搜索所有记忆
        all_memories = client.search_memory("用户")
        print(f"🔍 跨代理搜索找到 {len(all_memories)} 条记忆")
        
        for memory in all_memories:
            print(f"   - 代理: {memory.get('metadata', {}).get('agent_id', 'unknown')}")
            print(f"     内容: {memory.get('memory', '')[:50]}...")
            
    except Exception as e:
        print(f"❌ 跨代理搜索测试失败: {e}")

if __name__ == "__main__":
    print("🚀 Mem0集成使用示例")
    print("=" * 50)
    
    test_main_agent()
    test_stock_agent() 
    test_mcs_agent()
    test_cross_agent_search()
    
    print("\n" + "=" * 50)
    print("🎉 所有测试完成！")