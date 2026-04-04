import uuid
import datetime
import sys
import os

# --- 1. 导入处理 (采纳源 A: 兼容性更强) ---
# 尝试将当前目录加入路径，防止找不到模块
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from vector_db import MemoryStorage
except ImportError:
    try:
        from .vector_db import MemoryStorage
    except ImportError:
        sys.path.append(os.path.dirname(current_dir))
        from vector_db import MemoryStorage

class MemoryService:
    def __init__(self):
        self.storage = MemoryStorage()
        print("🧠 [MemoryService] 记忆服务已启动")

    def remember(self, user_id, user_text, ai_reply, emotion):
        """
        [写入] 将对话存入向量数据库
        """
        # 校验长度，太短的对话没有记忆价值 (采纳源 B)
        if len(user_text) < 2 and len(ai_reply) < 2:
            return

        mem_id = str(uuid.uuid4())
        
        # 获取详细时间，包含星期几 (采纳源 A: 增加上下文)
        now = datetime.datetime.now()
        time_str = now.strftime("%Y-%m-%d %A %H:%M")
        
        metadata = {
            "timestamp": time_str,
            "emotion": emotion,
            "role": "dialogue_pair"
        }
        
        # 构建嵌入文本：包含时间、情绪、对话内容 (融合 A 和 B)
        # 格式：[时间] [情绪] User: ... | Una: ...
        full_text_to_embed = f"[{time_str}] [{emotion}] 用户: {user_text} | Una: {ai_reply}"
        
        self.storage.add(user_id, mem_id, full_text_to_embed, metadata)
        print(f"💾 [记忆固化] {time_str} | 用户: {user_text[:10]}... -> Una: {ai_reply[:10]}...")

    def recall(self, user_id, current_query_text):
        """
        [回忆] 智能检索：广撒网(20条) + 精过滤(阈值)
        (主要采纳源 B 的逻辑，因为它更健壮)
        """
        # 如果库是空的，直接返回
        if self.storage.count(user_id) == 0:
            return ""

        # 🔥 策略：广撒网，获取前 20 条最相似的
        results = self.storage.query(user_id, current_query_text, n_results=20)
        
        # 防御性编程：防止返回空结果
        if not results['documents'] or not results['documents'][0]:
            return ""

        documents = results['documents'][0]
        metadatas = results['metadatas'][0]
        
        # 安全获取距离 (防止旧版 ChromaDB 返回 None)
        distances = results.get('distances', [[0]*len(documents)])[0]

        memory_context = []
        
        # 🔥 阈值过滤：越小越相似。1.5 是一个比较好的经验值
        # 大于 1.5 说明相关性很低，直接丢弃，防止 AI 胡乱联系
        THRESHOLD = 1.5 

        # 使用 zip 同时遍历文档、元数据和距离
        for doc, meta, dist in zip(documents, metadatas, distances):
            if dist > THRESHOLD:
                continue # 太不相关了，跳过

            # 既然 embedding 文本里已经包含了时间，直接使用 doc 即可
            # 或者为了强调，可以再次格式化
            memory_context.append(doc)

        # 如果过滤完一条都不剩
        if not memory_context:
            return ""

        # 用换行符连接所有记忆片段
        return "\n".join(memory_context)