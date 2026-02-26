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
        
        self.agent_id = "mcs"
        self.allowed_categories = ["career", "research", "certification", "skills"]
    
    def add_career_memory(self, messages, career_context=None):
        """添加职业相关记忆"""
        metadata = {"agent_id": self.agent_id}
        if career_context:
            metadata.update(career_context)
        
        # 确保包含职业相关类别
        if "categories" not in metadata:
            metadata["categories"] = self.allowed_categories
        
        return self.memory.add(messages, user_id="worldhello321", metadata=metadata)
    
    def search_career_memory(self, query, filters=None):
        """搜索职业相关记忆"""
        default_filters = {"user_id": "worldhello321"}
        if filters:
            default_filters.update(filters)
        return self.memory.search(query, filters=default_filters)
    
    def get_research_goals(self):
        """获取研究目标"""
        return self.search_career_memory("AI research goals", 
                                       filters={"categories": ["research"]})
    
    def get_certification_status(self):
        """获取认证状态"""
        return self.search_career_memory("certification progress", 
                                       filters={"categories": ["certification"]})