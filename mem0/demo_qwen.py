#!/usr/bin/env python3
"""
Qwen-compatible Mem0 demonstration
"""
import sys
import os

# Add config directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'config'))

from mem0 import Memory
from mem0_qwen_config import MEM0_CONFIG

def main():
    print("🚀 Qwen兼容Mem0演示")
    print("=" * 50)
    
    try:
        # Initialize Mem0 with Qwen configuration
        print("1. 初始化Mem0客户端...")
        memory = Memory.from_config(MEM0_CONFIG)
        print("✅ 客户端初始化成功！")
        
        # Test adding memory
        print("\n2. 添加测试记忆...")
        test_messages = [
            {"role": "user", "content": "我是Hope，正在测试Mem0集成"},
            {"role": "assistant", "content": "好的，我会记住这个信息"}
        ]
        memory.add(test_messages, user_id="worldhello321")
        print("✅ 记忆添加成功！")
        
        # Test searching memory
        print("\n3. 搜索相关记忆...")
        results = memory.search("Hope的测试", user_id="worldhello321")
        print(f"✅ 搜索完成，找到 {len(results.get('results', []))} 条记忆")
        
        print("\n🎉 Mem0集成演示完成！")
        print("\n💡 关键特性:")
        print("   • 本地向量存储 (Qdrant)")
        print("   • Qwen模型兼容")
        print("   • 跨代理记忆共享")
        print("   • 数据完全本地化")
        
    except Exception as e:
        print(f"❌ 演示失败: {e}")
        print("\n可能的原因:")
        print("   • API密钥配置问题")
        print("   • 网络连接问题") 
        print("   • Qwen API兼容性问题")

if __name__ == "__main__":
    main()