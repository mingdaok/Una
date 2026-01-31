import sys
import os
import yaml
import sqlite3
import uuid
import edge_tts  # 导入微软语音库
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# --- 🔧 1. 核心路径配置 ---
# 获取当前脚本所在目录 (backend)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# 获取项目根目录 (backend 的上一级)
ROOT_DIR = os.path.dirname(CURRENT_DIR)

# 拼接绝对路径
CONFIG_PATH = os.path.join(ROOT_DIR, "config.yaml")
DB_PATH = os.path.join(CURRENT_DIR, "una_memory.db")
AUDIO_DIR = os.path.join(ROOT_DIR, "static", "voice")

print(f"🌍 项目根目录: {ROOT_DIR}")
print(f"🔊 音频存储目录: {AUDIO_DIR}")

# --- 🔧 2. 加载配置 ---
if not os.path.exists(CONFIG_PATH):
    # 兼容性：尝试在当前目录找
    CONFIG_PATH = os.path.join(CURRENT_DIR, "config.yaml")
    if not os.path.exists(CONFIG_PATH):
        print(f"❌ 严重错误: 找不到配置文件 config.yaml")
        sys.exit(1)

try:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
except Exception as e:
    print(f"❌ 读取配置文件失败: {e}")
    sys.exit(1)

# --- 🔧 3. 导入 AI 核心 ---
sys.path.append(CURRENT_DIR)
try:
    from brain_engine import UnaBrain
except ImportError as e:
    print(f"❌ 模块导入失败: {e}")
    print("请确保 brain_engine.py 在 backend 文件夹内")
    sys.exit(1)

# --- 🔧 4. 初始化 FastAPI ---
app = FastAPI()

# 允许跨域 (让客户端能访问)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件 (让前端能下载音频)
if not os.path.exists(AUDIO_DIR):
    os.makedirs(AUDIO_DIR)
app.mount("/voice", StaticFiles(directory=AUDIO_DIR), name="voice")

# 初始化 AI 大脑
try:
    brain = UnaBrain(
        api_key=config['apis']['silicon_base']['api_key'], 
        base_url=config['apis']['silicon_base']['base_url'],
        model=config['apis']['silicon_base']['model']
    )
    print("🧠 AI 大脑初始化成功")
except KeyError as e:
    print(f"❌ 配置文件缺少字段: {e}")
    sys.exit(1)

# 定义请求格式
class ChatRequest(BaseModel):
    text: str
    user_id: str = "default_user"

# --- 🚀 核心接口: 聊天 + 语音 ---
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_input = request.text.strip()
    if not user_input:
        return {"reply": "...", "audio_url": None}

    print(f"📩 收到消息: {user_input}")

    # --- 第一步: AI 思考 ---
    try:
        response_data = await brain.chat(request.user_id, user_input)
        reply_text = response_data.get("reply", "我好像走神了...")
        
        # 危机干预日志
        if response_data.get("crisis_level") == "CRISIS":
            print(f"🛡️ 触发危机干预！回复: {reply_text}")

    except Exception as e:
        print(f"❌ AI 思考出错: {e}")
        reply_text = "对不起，我现在脑子有点乱。"

    print(f"🗣️ Una 回复: {reply_text}")

    # --- 第二步: 语音合成 (Edge-TTS) ---
    audio_filename = f"{uuid.uuid4()}.mp3"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)
    has_audio = False

    try:
        print(f"🎙️ 正在生成语音...")
        # 💡 声音选择：
        # zh-CN-XiaoxiaoNeural (可爱少女，最推荐)
        # zh-CN-YunxiNeural (活泼少年)
        voice = "zh-CN-XiaoxiaoNeural"
        
        communicate = edge_tts.Communicate(reply_text, voice)
        await communicate.save(audio_path)
        
        has_audio = True
        print(f"✅ 语音生成完毕: {audio_filename}")
        
    except Exception as e:
        print(f"⚠️ TTS 生成失败: {e}")
        # 即使语音失败，也返回文字，不让程序崩掉

    # --- 第三步: 返回结果给客户端 ---
    return {
        "reply": reply_text,
        # 如果生成成功，返回下载链接；否则 None
        "audio_url": f"/voice/{audio_filename}" if has_audio else None,
        # 返回本地路径，方便本地客户端直接读取
        "local_audio_path": audio_path if has_audio else None
    }

# --- 数据库初始化 ---
def init_db():
    try:
        import database
        database.init_db()
        print("💾 数据库连接正常")
    except Exception as e:
        print(f"⚠️ 数据库初始化警告: {e}")

if __name__ == "__main__":
    init_db()
    import uvicorn
    print("🚀 后端服务启动中 (端口 8000)...")
    uvicorn.run(app, host="127.0.0.1", port=8000)