#!/usr/bin/env python3
"""
向量记忆层集成脚本
- 从 SQLite 读取日志
- 生成文本嵌入
- 存储到 ChromaDB
"""

import sqlite3
import chromadb
from chromadb.utils import embedding_functions
import os
import sys

# 配置路径
SHARED_DIR = "/Users/hope/.openclaw/shared"
SQLITE_DB = os.path.join(SHARED_DIR, "memory.db")
CHROMA_DIR = os.path.join(SHARED_DIR, "vector_store")

def get_sqlite_entries():
    """从 SQLite 获取未向量化的日志条目"""
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    
    # 检查是否已存在向量元数据表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vector_metadata (
            sqlite_id INTEGER PRIMARY KEY,
            chroma_id TEXT,
            embedded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 获取未处理的条目
    cursor.execute("""
        SELECT id, content, source_file, entry_date 
        FROM memory_entries 
        WHERE id NOT IN (SELECT sqlite_id FROM vector_metadata)
    """)
    
    entries = cursor.fetchall()
    conn.close()
    return entries

def init_chroma_client():
    """初始化 ChromaDB 客户端"""
    os.makedirs(CHROMA_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # 使用本地嵌入模型（兼容中文）
    embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"  # 轻量级多语言模型
    )
    
    collection = client.get_or_create_collection(
        name="memory_embeddings",
        embedding_function=embedding_function
    )
    return collection

def sync_to_vector_db():
    """同步日志到向量数据库"""
    print("🔄 开始同步日志到向量数据库...")
    
    entries = get_sqlite_entries()
    if not entries:
        print("✅ 所有日志已同步")
        return
    
    collection = init_chroma_client()
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    
    for entry_id, content, source_file, entry_date in entries:
        try:
            # 添加到向量数据库
            collection.add(
                documents=[content],
                metadatas=[{
                    "source_file": source_file,
                    "entry_date": entry_date,
                    "sqlite_id": entry_id
                }],
                ids=[f"entry_{entry_id}"]
            )
            
            # 记录已处理
            cursor.execute(
                "INSERT INTO vector_metadata (sqlite_id, chroma_id) VALUES (?, ?)",
                (entry_id, f"entry_{entry_id}")
            )
            
            print(f"✅ 已处理: {source_file}")
            
        except Exception as e:
            print(f"❌ 处理失败 {source_file}: {e}")
    
    conn.commit()
    conn.close()
    print(f"✅ 向量同步完成! 共处理 {len(entries)} 条记录")

def hybrid_search(query_text, n_results=5):
    """混合检索：向量相似度 + SQLite 元数据"""
    collection = init_chroma_client()
    
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
        include=["documents", "metadatas"]
    )
    
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--init":
        sync_to_vector_db()
    elif len(sys.argv) > 1 and sys.argv[1] == "--search":
        if len(sys.argv) < 3:
            print("用法: --search <查询文本>")
        else:
            results = hybrid_search(sys.argv[2])
            print("\n🔍 检索结果:")
            for i, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
                print(f"\n{i+1}. {meta['source_file']} ({meta['entry_date']})")
                print(f"   {doc[:200]}...")
    else:
        print("用法: --init | --search <查询文本>")