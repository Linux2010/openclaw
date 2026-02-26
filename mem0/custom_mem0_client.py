#!/usr/bin/env python3
"""
Custom Mem0 client that integrates with OpenClaw's Qwen model setup
"""
import os
import json
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
import sqlite3
import hashlib

class CustomMem0Client:
    def __init__(self, data_path="/Users/hope/.openclaw/mem0/data"):
        self.data_path = data_path
        self.qdrant_path = os.path.join(data_path, "qdrant")
        self.sqlite_path = os.path.join(data_path, "sqlite", "history.db")
        
        # Initialize Qdrant client (local)
        self.qdrant_client = QdrantClient(path=self.qdrant_path)
        
        # Initialize SQLite database
        self.init_sqlite_db()
        
        # Create collection if it doesn't exist
        self.create_collection()
    
    def init_sqlite_db(self):
        """Initialize SQLite database for history tracking"""
        os.makedirs(os.path.dirname(self.sqlite_path), exist_ok=True)
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                agent_id TEXT,
                memory TEXT,
                categories TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        ''')
        conn.commit()
        conn.close()
    
    def create_collection(self):
        """Create Qdrant collection for vector storage"""
        try:
            self.qdrant_client.get_collection("mem0_memories")
        except:
            # Create collection with 1536 dimensions (matching text-embedding-3-small)
            self.qdrant_client.create_collection(
                collection_name="mem0_memories",
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
            )
    
    def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using OpenClaw's existing embedding setup
        For now, we'll use a simple hash-based approach as placeholder
        In production, integrate with your actual embedding model
        """
        # Placeholder: In real implementation, call your embedding model
        # This is just for demonstration
        import numpy as np
        hash_val = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
        np.random.seed(hash_val % (2**32))
        return np.random.random(1536).tolist()
    
    def add_memory(self, messages: List[Dict[str, str]], user_id: str = "worldhello321", 
                   metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Add memory to the system"""
        if metadata is None:
            metadata = {}
        
        # Extract memory content from messages
        memory_content = self._extract_memory_content(messages)
        
        # Generate embedding
        embedding = self._generate_embedding(memory_content)
        
        # Generate unique ID
        memory_id = hashlib.md5(f"{user_id}_{memory_content}".encode()).hexdigest()
        
        # Store in Qdrant
        point = PointStruct(
            id=memory_id,
            vector=embedding,
            payload={
                "user_id": user_id,
                "memory": memory_content,
                "metadata": metadata,
                "created_at": "2026-02-26T13:50:00Z"
            }
        )
        self.qdrant_client.upsert(collection_name="mem0_memories", points=[point])
        
        # Store in SQLite
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO memories 
            (id, user_id, agent_id, memory, categories, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            memory_id,
            user_id,
            metadata.get("agent_id", "unknown"),
            memory_content,
            json.dumps(metadata.get("categories", [])),
            json.dumps(metadata)
        ))
        conn.commit()
        conn.close()
        
        return {"id": memory_id, "memory": memory_content, "user_id": user_id}
    
    def _extract_memory_content(self, messages: List[Dict[str, str]]) -> str:
        """Extract key information from conversation messages"""
        # Simple extraction: combine all message content
        content = " ".join([msg["content"] for msg in messages])
        return content
    
    def search_memory(self, query: str, user_id: str = "worldhello321", 
                     filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Search for relevant memories"""
        if filters is None:
            filters = {}
        
        # Generate query embedding
        query_embedding = self._generate_embedding(query)
        
        # Search in Qdrant
        search_result = self.qdrant_client.search(
            collection_name="mem0_memories",
            query_vector=query_embedding,
            query_filter={"must": [{"key": "user_id", "match": {"value": user_id}}]},
            limit=5
        )
        
        # Format results
        results = []
        for hit in search_result:
            results.append({
                "id": hit.id,
                "memory": hit.payload["memory"],
                "user_id": hit.payload["user_id"],
                "score": hit.score,
                "metadata": hit.payload.get("metadata", {})
            })
        
        return {"results": results}

# Example usage
if __name__ == "__main__":
    client = CustomMem0Client()
    print("Custom Mem0 client initialized successfully!")