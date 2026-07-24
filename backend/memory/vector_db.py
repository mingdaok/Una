import os
from settings import settings

# 获取数据库存储路径
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
DB_PERSIST_PATH = settings.chroma_path or os.path.join(BACKEND_DIR, "data", "chroma_db")

class MemoryStorage:
    def __init__(self):
        import chromadb
        from chromadb.utils import embedding_functions

        print("🧠 [VectorDB] 正在连接多用户记忆库 (Smart Recall版)...")
        
        if not os.path.exists(DB_PERSIST_PATH):
            os.makedirs(DB_PERSIST_PATH)
            
        self.client = chromadb.PersistentClient(path=DB_PERSIST_PATH)
        
        self.emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )

    def _get_user_collection(self, user_id):
        safe_user_id = f"u_{user_id}".replace("-", "_").replace(" ", "_")
        return self.client.get_or_create_collection(
            name=safe_user_id,
            embedding_function=self.emb_fn
        )

    def add(self, user_id, doc_id, text, metadata):
        collection = self._get_user_collection(user_id)
        collection.add(
            ids=[doc_id],
            documents=[text],
            metadatas=[metadata]
        )

    def query(self, user_id, query_text, n_results=10):
        collection = self._get_user_collection(user_id)
        
        if collection.count() == 0:
            return {"documents": [], "metadatas": [], "distances": []}

        # 🔥 关键修改：请求返回 "distances" (距离分数)
        # include 参数告诉 ChromaDB 我们需要哪些数据
        results = collection.query(
            query_texts=[query_text],
            n_results=n_results,
            include=["documents", "metadatas", "distances"] 
        )
        return results

    def count(self, user_id):
        collection = self._get_user_collection(user_id)
        return collection.count()
