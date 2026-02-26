import os
from mem0 import Memory
import sys
sys.path.append('/Users/hope/.openclaw/mem0')
from custom_mem0_client import CustomMem0Client

class LocalMem0Client:
    def __init__(self):
        """Initialize Mem0 client with custom Qwen configuration"""
        self.memory = CustomMem0Client()
        self.agent_id = "main"
    
    def add_memory(self, messages, user_id="worldhello321", metadata=None):
        """Add memory with agent identification"""
        if metadata is None:
            metadata = {}
        metadata["agent_id"] = self.agent_id
        return self.memory.add(messages, user_id=user_id, metadata=metadata)
    
    def search_memory(self, query, user_id="worldhello321", filters=None):
        """Search memories across all agents"""
        return self.memory.search(query, user_id=user_id, filters=filters)
    
    def get_agent_memories(self, agent_id, user_id="worldhello321"):
        """Get memories specific to an agent"""
        filters = {"agent_id": agent_id}
        return self.search_memory("", user_id=user_id, filters=filters)