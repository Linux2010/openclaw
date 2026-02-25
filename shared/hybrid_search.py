#!/usr/bin/env python3
"""
混合检索脚本：结合 SQLite FTS5 和 ChromaDB 向量搜索
用法: python3 hybrid_search.py "查询内容"
"""

import sys
import sqlite3
import chromadb
from chromadb.utils import embedding_functions

# 配置路径
SHARED_DIR = "/Users/hope/.openclaw/shared"
SQLITE_DB = f"{SHARED_DIR}/memory.db"
VECTOR_DB = f"{SHARED_DIR}/vector_db"

def sqlite_search(query):
    """执行 SQLite FTS5 搜索"""
    try:
        conn = sqlite3.connect(SQLITE_DB)
        cursor = conn.cursor()
        
        # 确保 FTS 表存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_fts';")
        if not cursor.fetchone():
            print("⚠️  FTS 表不存在，仅使用向量搜索")
            return []
            
        # 执行 FTS 查询
        cursor.execute("""
            SELECT source_file, content, title 
            FROM memory_entries 
            WHERE id IN (
                SELECT rowid FROM memory_fts WHERE memory_fts MATCH ?
            )
            LIMIT 5
        """, (query,))
        
        results = cursor.fetchall()
        conn.close()
        return results
    except Exception as e:
        print(f"SQLite 查询失败: {e}")
        return []

def vector_search(query):
    """执行 ChromaDB 向量搜索"""
    try:
        client = chromadb.PersistentClient(path=VECTOR_DB)
        collection = client.get_collection("memory")
        
        results = collection.query(
            query_texts=[query],
            n_results=3
        )
        
        matches = []
        for i, doc in enumerate(results['documents'][0]):
            metadata = results['metadatas'][0][i]
            similarity = results['distances'][0][i]
            matches.append({
                'source': metadata['source'],
                'content': doc,
                'similarity': 1.0 - similarity  # 转换为相似度
            })
        return matches
    except Exception as e:
        print(f"向量搜索失败: {e}")
        return []

def main():
    if len(sys.argv) < 2:
        print("用法: python3 hybrid_search.py \"查询内容\"")
        return
        
    query = sys.argv[1]
    print(f"\n🔍 混合检索结果 (查询: '{query}'):\n")
    
    # 执行 SQLite 搜索
    sqlite_results = sqlite_search(query)
    if sqlite_results:
        print("✅ 精确匹配 (SQLite FTS5):")
        for source, content, title in sqlite_results:
            preview = content[:100] + "..." if len(content) > 100 else content
            print(f"  📄 {source}: {preview}")
    else:
        print("⚠️  无精确匹配结果")
    
    print()
    
    # 执行向量搜索
    vector_results = vector_search(query)
    if vector_results:
        print("🧠 语义匹配 (ChromaDB):")
        for result in vector_results:
            preview = result['content'][:100] + "..." if len(result['content']) > 100 else result['content']
            print(f"  📄 {result['source']} (相似度: {result['similarity']:.2f}): {preview}")
    else:
        print("⚠️  无语义匹配结果")

if __name__ == "__main__":
    main()