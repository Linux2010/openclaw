import os
from mem0 import Memory
import yaml

class LocalMem0Client:
    def __init__(self):
        # 设置自定义数据路径
        config_path = "/Users/hope/.openclaw/mem0/config/mem0_config.yaml"
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
            self.memory = Memory.from_config(config)
        else:
            # 默认配置，但指定数据路径
            self.memory = Memory(
                vector_store_config={
                    "provider": "qdrant",
                    "config": {
                        "path": "/Users/hope/.openclaw/mem0/data/qdrant"
                    }
                },
                history_db_path="/Users/hope/.openclaw/mem0/data/sqlite/history.db"
            )
        
        self.agent_id = "stock"
        self.allowed_categories = ["trading", "market", "portfolio"]
    
    def add_memory(self, messages, user_id="worldhello321", metadata=None):
        """添加记忆"""
        if metadata is None:
            metadata = {}
        metadata["agent_id"] = self.agent_id
        
        return self.memory.add(messages, user_id=user_id, metadata=metadata)
    
    def search_memory(self, query, user_id="worldhello321", filters=None):
        """搜索记忆"""
        return self.memory.search(query, user_id=user_id, filters=filters)
    
    def add_trading_memory(self, messages, trading_context):
        """专门处理交易相关记忆"""
        categories = ["trading"] + trading_context.get("tags", [])
        metadata = {"categories": categories}
        return self.add_memory(messages, metadata=metadata)
    
    def get_trading_rules(self):
        """获取最新交易规则"""
        return self.search_memory("交易规则", filters={"categories": ["trading"]})