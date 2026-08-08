from __future__ import annotations

import os
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
import sys
import yaml
import uuid
import json
import asyncio
import threading
import datetime
import subprocess 
import time  # 新增：用于心跳计时
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from concurrent.futures import ThreadPoolExecutor
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# === 下载必要的 NLTK 数据 (已禁用) ===
# try:
#     import nltk
#     try:
#         nltk.data.find('tokenizers/punkt')
#     except LookupError:
#         print("📥 下载 NLTK punkt 数据...")
#         nltk.download('punkt')
#     try:
#         nltk.data.find('taggers/averaged_perceptron_tagger')
#     except LookupError:
#         print("📥 下载 NLTK averaged_perceptron_tagger 数据...")
#         nltk.download('averaged_perceptron_tagger')
# except ImportError:
#     print("⚠️ NLTK 未安装，跳过数据下载")

# === 路径设定 ===
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
sys.path.append(CURRENT_DIR)
STATIC_DIR = os.path.join(CURRENT_DIR, "static") 
AUDIO_DIR = os.path.join(STATIC_DIR, "voice")
CONFIG_PATH = os.path.join(ROOT_DIR, "config.yaml")

# === 引入服务 ===
try:
    from memory.service import MemoryService
except ImportError:
    try: from service import MemoryService
    except ImportError:
        sys.path.append(os.path.join(CURRENT_DIR, "memory"))
        from service import MemoryService

try:
    from utils.emotion_mapper import Live2DEmotionMapper
    from utils import chart_utils 
    import database 
    import social_db
except ImportError:
    class Live2DEmotionMapper:
        def get_motion_file(self, e): return "Hiyori_m01"

try:
    from diary_service import DiaryService
except ImportError:
    sys.path.append(CURRENT_DIR)
    from diary_service import DiaryService

try:
    from vision_service import VisionService
except ImportError:
    try:
        from backend.vision_service import VisionService
    except:
        print("⚠️ 找不到 vision_service.py")
        VisionService = None

try:
    import social_api as social_api_module
    from social_api import router as social_router
except ImportError:
    try:
        import backend.social_api as social_api_module
        from backend.social_api import router as social_router
    except Exception as _e:
        print(f"⚠️ 找不到 social_api.py: {_e}")
        social_router = None
        social_api_module = None

from auth_api import auth_service, get_current_user, router as auth_router
from media_service import register_media, media_url, router as media_router, sign_history_audio_urls
from settings import settings
from live2d_action import ActionDirector
from live2d_motion import MotionDirectorV3, is_motion_v3_candidate, normalize_live2d_model
from chat_control import ControlPrefixDemux, sanitize_reply_text
from speech_delivery import SpeechReplyDelivery
from speech_metrics import log_speech_stage
from speech_stream import SpeechStreamCoordinator
from voice_call_api import create_voice_call_router
from voice_call_memory import VoiceCallMemory
from voice_call_service import VoiceCallService
from voice_call_tts import GptSovitsPcmClient

# === 加载配置 ===
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f: config = yaml.safe_load(f)
else: config = {'apis': {'silicon_base': {'api_key': '', 'base_url': '', 'model': ''}}}

AUDIO_BASE_URL = config.get('app', {}).get('audio_base_url', '').strip() or "http://127.0.0.1:8000"
if AUDIO_BASE_URL.endswith('/'):
    AUDIO_BASE_URL = AUDIO_BASE_URL[:-1]

def make_absolute_audio_url(path: str) -> str:
    if not path or not isinstance(path, str):
        return path
    path = path.strip()
    if not path:
        return path
    return path


def protect_generated_audio(user_id: str, generated_path: str | None) -> str | None:
    """登记 TTS 文件并返回私有媒体 URL，避免对外泄露静态文件路径。"""
    if not generated_path or generated_path.startswith("/api/media/"):
        return generated_path
    filepath = os.path.join(AUDIO_DIR, os.path.basename(generated_path))
    if not os.path.isfile(filepath):
        return None
    media = register_media(user_id, "audio", filepath)
    return media_url(media["id"], user_id)

try:
    from brain_engine import UnaBrain
    from asr_engine import SenseVoiceASR
    from tts_service import generate_audio_gsv as generate_audio_file  # GPT-SoVITS
except ImportError as e:
    print(f"❌ 导入失败: {e}")
    sys.exit(1)

# === 初始化 FastAPI ===
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(media_router)

if not os.path.exists(AUDIO_DIR): os.makedirs(AUDIO_DIR)
# 挂载 /assets 和 /libs 路径，让前端相对路径资源能正确访问
MOBILE_DIR = os.path.join(STATIC_DIR, "mobile")
ASSETS_DIR = os.path.join(MOBILE_DIR, "assets")
LIBS_DIR   = os.path.join(MOBILE_DIR, "libs")
VOICE_DIR  = os.path.join(MOBILE_DIR, "voice")
VAD_DIR    = os.path.join(MOBILE_DIR, "vad")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

if os.path.exists(LIBS_DIR):
    app.mount("/libs", StaticFiles(directory=LIBS_DIR), name="libs")
    print("✅ [Static] /libs 目录已挂载")

if os.path.exists(VOICE_DIR):
    app.mount("/voice", StaticFiles(directory=VOICE_DIR), name="voice-call-static")

if os.path.exists(VAD_DIR):
    app.mount("/vad", StaticFiles(directory=VAD_DIR), name="voice-vad-static")

if os.path.exists(MOBILE_DIR):
    app.mount("/static/mobile", StaticFiles(directory=MOBILE_DIR), name="mobile-static")

# 挂载朋友圈图片目录（social_api.py 上传后存放于此）
SOCIAL_IMG_DIR = os.path.join(STATIC_DIR, "social_images")
os.makedirs(SOCIAL_IMG_DIR, exist_ok=True)

# 注册朋友圈路由
if social_router:
    app.include_router(social_router)
    print("✅ [Social] 朋友圈 API 路由已挂载")

# === 初始化核心引擎 ===
ASSETS_DIR = os.path.join(STATIC_DIR, "mobile", "assets")
INDEX_HTML = os.path.join(STATIC_DIR, "mobile", "index.html")

@app.get("/", response_class=FileResponse)
async def serve_index():
    if os.path.exists(INDEX_HTML):
        return INDEX_HTML
    return JSONResponse(status_code=404, content={"message": "Frontend index.html not found"})

brain = UnaBrain(
    api_key=config['apis']['silicon_base']['api_key'], 
    base_url=config['apis']['silicon_base']['base_url'],
    model=config['apis']['silicon_base'].get('llm_model', 'deepseek-ai/DeepSeek-V2.5')
)
asr = SenseVoiceASR()
memory_service = MemoryService()
emotion_mapper = Live2DEmotionMapper()
action_director = ActionDirector()
motion_director = MotionDirectorV3()
voice_call_tts_client = GptSovitsPcmClient(
    sample_rate=int(
        config.get('apis', {}).get('gpt_sovits', {}).get('output_sample_rate', 32000)
    )
)
voice_call_service = VoiceCallService(
    asr=asr,
    brain=brain,
    memory=VoiceCallMemory(database, memory_service, recall_timeout_ms=150),
    tts=voice_call_tts_client,
)
app.include_router(create_voice_call_router(auth_service, voice_call_service))
# 将 brain 实例注入 DiaryService
diary_service = DiaryService(brain=brain)
vision_service = VisionService() if 'VisionService' in globals() and VisionService else None
executor = ThreadPoolExecutor(max_workers=2)

# 将 brain 实例注入 social_api
if social_api_module:
    social_api_module.brain_instance = brain
    print("✅ [Brain Injection] brain 实例已注入 social_api")


# =========================================================================
# 🔥 TTS 语音生成 - 由 tts_service.py (GPT-SoVITS) 提供
# generate_audio_file 已在 import 阶段通过别名绑定为 generate_audio_gsv
# 接口保持不变：await generate_audio_file(text, emotion) -> "/static/voice/xxx.wav"
# =========================================================================

# =========================================================================
#                     WebSocket & 主动对话逻辑
# =========================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections = {} 

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"🔌 用户[{user_id}] 已连接, 当前连接数: {len(self.active_connections[user_id])}")
        asyncio.create_task(self.trigger_welcome_back(user_id))

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                print(f"🔌 用户[{user_id}] 断开连接, 剩余连接数: {len(self.active_connections[user_id])}")

    async def broadcast_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            if isinstance(message, dict) and message.get('audio_url'):
                message['audio_url'] = make_absolute_audio_url(message['audio_url'])
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    self.disconnect(connection, user_id)
    
    async def send_ai_reply(self, reply_text, emotion, user_id, mood_score=0, is_proactive=False, audio_url=None, visemes=None):
        reply_text = sanitize_reply_text(reply_text)
        if not reply_text:
            return
        if not audio_url or visemes is None:
            audio_url, visemes = await generate_audio_file(reply_text, emotion)
        audio_url = protect_generated_audio(user_id, audio_url)

        if not is_proactive:
            database.add_message(user_id, "ai", reply_text, mood_score, audio_url)
        
        await self.broadcast_to_user(user_id, {
            "type": "final_reply", "text": reply_text, "audio_url": audio_url,
            "visemes": visemes or [],
            "emotion": emotion, "crisis_level": "NORMAL"
        })

    # 🔥 新增：用于单独发送一小段语音碎片的通道
    async def send_ai_reply_chunk(
        self,
        reply_text,
        emotion,
        user_id,
        chunk_index,
        reply_id=None,
        trace=None,
    ) -> bool:
        reply_text = sanitize_reply_text(reply_text)
        if not reply_text:
            return False
        if reply_id is not None and not speech_stream_coordinator.is_current(
            user_id, reply_id
        ):
            return False
        print(f"🎵 [Chunk] reply={reply_id} chunk={chunk_index} 开始生成")
        try:
            audio_url, visemes = await generate_audio_file(
                reply_text, emotion, trace=trace
            )
        except Exception:
            print(f"❌ [Chunk] reply={reply_id} chunk={chunk_index} 生成异常")
            return False
        if reply_id is not None and not speech_stream_coordinator.is_current(
            user_id, reply_id
        ):
            return False
        audio_url = protect_generated_audio(user_id, audio_url)
        if not audio_url:
            print(f"❌ [Chunk] reply={reply_id} chunk={chunk_index} 生成失败")
            return False
        
        message = {
            "type": "audio_stream_chunk", 
            "chunk_index": chunk_index,
            "text": reply_text, 
            "audio_url": audio_url,
            "visemes": visemes or [],
            "emotion": emotion,
            "reply_id": reply_id,
        }
        delivery_started = time.perf_counter()
        try:
            await self.broadcast_to_user(user_id, message)
        except Exception:
            log_speech_stage(
                trace,
                "ws_delivery",
                (time.perf_counter() - delivery_started) * 1000,
                status="failed",
            )
            return False
        log_speech_stage(
            trace,
            "ws_delivery",
            (time.perf_counter() - delivery_started) * 1000,
        )
        print(f"📤 [Chunk] reply={reply_id} chunk={chunk_index} 已发送")
        return True

    async def trigger_welcome_back(self, user_id: str):
        last_time, last_content, last_mood = database.get_last_interaction(user_id)
        if not last_time: return
        try:
            time_str = last_time.split(".")[0]
            last_dt = datetime.datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
            now_dt = datetime.datetime.utcnow() 
            diff_hours = (now_dt - last_dt).total_seconds() / 3600.0
            if diff_hours < 2.0:
                return
            welcome_data = await brain.make_proactive_greeting(user_id, last_time, last_content, last_mood, diff_hours)
            await asyncio.sleep(1.0)
            await self.send_ai_reply(welcome_data['reply'], welcome_data.get('emotion', 'happy'), user_id, is_proactive=True)
        except Exception as e: print(f"Welcome Error: {e}")

ws_manager = ConnectionManager()
speech_stream_coordinator = SpeechStreamCoordinator(max_parallel_synthesis=1)

class AsyncInteractionManager:
    def __init__(self, wait_interval=3.0):
        self.buffers = {}
        self.timers = {}
        self.wait_interval = wait_interval
        self.lock = asyncio.Lock()

    async def handle_input(self, text: str, emotion: str = None, user_id="mobile_user"):
        clean_text = text.strip()
        if not clean_text: return
        await ws_manager.broadcast_to_user(user_id, {"type": "user_sync", "text": clean_text})
        stored_text = clean_text
        if emotion and emotion not in ["neutral", "unknown"]: stored_text = f"{clean_text} (语气:{emotion})"

        async with self.lock:
            if user_id not in self.buffers: self.buffers[user_id] = []
            self.buffers[user_id].append(stored_text)
            if user_id in self.timers and self.timers[user_id]: self.timers[user_id].cancel()
            self.timers[user_id] = asyncio.create_task(self._wait_and_process(user_id))

    async def _wait_and_process(self, user_id):
        try:
            await asyncio.sleep(self.wait_interval)
            async with self.lock:
                if user_id in self.buffers and self.buffers[user_id]:
                    combined_text = "，".join(self.buffers[user_id])
                    self.buffers[user_id] = []
                    self.timers[user_id] = None
                    await process_and_push_response(combined_text, user_id)
        except asyncio.CancelledError: pass 

    async def interrupt(self, user_id):
        await speech_stream_coordinator.cancel(user_id)
        async with self.lock:
            if user_id in self.timers and self.timers[user_id]: self.timers[user_id].cancel()
            self.buffers[user_id] = []

global_manager = AsyncInteractionManager(wait_interval=3.0)

async def process_and_push_response(user_text, user_id, live2d_model=None):
    live2d_model = normalize_live2d_model(live2d_model)
    await ws_manager.broadcast_to_user(user_id, {"type": "typing_status", "status": "thinking"})
    search_query = user_text
    if len(user_text) < 5:
        search_query += " 开心 快乐 成功"

    loop = asyncio.get_running_loop()
    recall_task = loop.run_in_executor(None, memory_service.recall, user_id, search_query)
    asyncio.create_task(brain.update_profile_task(user_id, user_text))

    recent_moods = database.get_recent_mood_scores(user_id, 5)
    negative_count = len([m for m in recent_moods if m <= -2])
    
    # 将用户最新消息写入数据库
    database.add_message(user_id, "user", user_text, 0, None)

    # 🔥 [优化] RAG 超时熔断：最多等 1.0 秒，超时则放弃长期记忆，不阻塞大模型
    try:
        relevant_memories = await asyncio.wait_for(recall_task, timeout=1.0)
    except asyncio.TimeoutError:
        print("⚠️ [RAG] 记忆检索超时(>1.0s)，跳过长期记忆，直接启动 LLM")
        relevant_memories = ""

    # 🌊 开始启动流式迭代
    full_reply_text = ""
    current_emotion = "neutral"
    current_mood_score = 0
    chunk_index = 0
    delivery_demux = ControlPrefixDemux(live2d_model=live2d_model)
    reply_id = uuid.uuid4().hex

    async def render_speech_unit(unit, trace):
        return await ws_manager.send_ai_reply_chunk(
            unit.text,
            unit.emotion,
            user_id,
            unit.index,
            reply_id=reply_id,
            trace=trace,
        )

    speech_delivery = SpeechReplyDelivery(
        coordinator=speech_stream_coordinator,
        user_id=user_id,
        reply_id=reply_id,
        broadcast=ws_manager.broadcast_to_user,
        render_unit=render_speech_unit,
    )
    await speech_delivery.start()

    async def publish_text_chunk(raw_text):
        nonlocal full_reply_text, chunk_index
        text_chunk = sanitize_reply_text(raw_text)
        if not text_chunk:
            return

        full_reply_text += text_chunk
        await ws_manager.broadcast_to_user(user_id, {
            "type": "text_stream_chunk",
            "reply_id": reply_id,
            "chunk_index": chunk_index,
            "text": text_chunk,
            "emotion": current_emotion
        })
        print(f"📝 [Stream] 发送文字碎片 {chunk_index} 给用户 {user_id}: '{text_chunk[:30]}...'")

        await speech_delivery.add_text(text_chunk, current_emotion)
        chunk_index += 1

    print(f"🎬 [Stream] reply={reply_id} 开始流式音频给用户 {user_id}")

    try:
        # 使用流式接口获取片段
        async for item in brain.chat_stream(user_id, user_text, long_term_memory=relevant_memories, recent_negative_count=negative_count, live2d_model=live2d_model):
            if item["type"] == "meta":
                current_emotion = item.get("emotion", "neutral")
                current_mood_score = item.get("mood_score", 0)
            elif item["type"] == "live2d_action_candidate":
                plan = item.get("plan")
                if is_motion_v3_candidate(plan):
                    event = motion_director.decide(user_id, plan, live2d_model)
                else:
                    event = action_director.decide(user_id, plan)
                if event is not None:
                    await ws_manager.broadcast_to_user(user_id, event)
            elif item["type"] == "sentence":
                _, safe_body = delivery_demux.feed(item.get("text", ""))
                await publish_text_chunk(safe_body)

    except Exception as e:
        print(f"Streaming error: {e}")
        if not full_reply_text: full_reply_text = "..."

    _, safe_tail = delivery_demux.finish()
    await publish_text_chunk(safe_tail)
    full_reply_text = sanitize_reply_text(full_reply_text)

    database.add_message(user_id, "ai", full_reply_text, current_mood_score, None)
    summary = await speech_delivery.finish(full_text=full_reply_text)
    print(
        f"🏁 [Stream] reply={reply_id} 流式音频结束给用户 {user_id}, "
        f"总文本长度: {len(full_reply_text)}, failed_chunks={summary.failed}"
    )

    asyncio.create_task(brain.update_profile_task(user_id, user_text))
    threading.Thread(target=memory_service.remember, args=(user_id, user_text, full_reply_text, current_emotion)).start()
    if current_mood_score <= -3: await send_mood_chart(user_id)

async def send_mood_chart(user_id):
    try:
        data = database.get_mood_trend(user_id, limit=50)
        if len(data) >= 2:
            url = chart_utils.generate_curve(data, user_id)
            if url: await ws_manager.broadcast_to_user(user_id, {"type": "chart_push", "url": url})
    except: pass

class ChatRequest(BaseModel):
    text: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    await global_manager.handle_input(request.text, user_id=current_user["id"])
    return {"status": "buffered"}

@app.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    history = database.get_recent_history(current_user["id"], 50)
    return sign_history_audio_urls(history, current_user["id"])

def convert_audio_to_wav(input_path, output_path):
    try:
        subprocess.run(['ffmpeg', '-y', '-i', input_path, '-ar', '16000', '-ac', '1', '-f', 'wav', output_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except: return False

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, ticket: str):
    user_id = auth_service.consume_ws_ticket(ticket)
    if not user_id:
        await websocket.close(code=1008)
        return
    await ws_manager.connect(websocket, user_id)
    temp_audio = os.path.join(CURRENT_DIR, f"temp_{user_id}.wav")
    converted_audio = os.path.join(CURRENT_DIR, f"temp_{user_id}_16k.wav")
    loop = asyncio.get_event_loop()
    last_heartbeat = time.time()
    
    try:
        file_handle = open(temp_audio, "wb")
        while True:
            try:
                # 设置接收超时，30秒没消息就发送心跳
                msg = await asyncio.wait_for(websocket.receive(), timeout=30)
                last_heartbeat = time.time()  # 收到消息，更新心跳时间
                
                if "bytes" in msg: 
                    file_handle.write(msg["bytes"])
                elif "text" in msg:
                    try:
                        data = json.loads(msg["text"])
                        msg_type = data.get("type")
                        
                        # 🔥🔥🔥 [优化] 文字消息：绕过 3s 防抖池，即发即答 🔥🔥🔥
                        if msg_type == "text":
                            content = data.get("content", "")
                            client_message_id = data.get("client_message_id")
                            live2d_model = normalize_live2d_model(data.get("live2d_model"))
                            if content:
                                print(f"📩 收到文字消息: '{content}' (长度:{len(content)})")
                                # 同步文本给前端显示
                                await ws_manager.broadcast_to_user(user_id, {"type": "user_sync", "text": content, "client_message_id": client_message_id})
                                # 直通车：绕过防抖等待池，瞬间起跑
                                asyncio.create_task(process_and_push_response(content, user_id, live2d_model=live2d_model))

                        # 处理客户端心跳响应
                        elif msg_type == "pong":
                            print(f"❤️ 收到用户[{user_id}]心跳响应")
                            continue
                            
                        elif msg_type == "idle_signal":
                            stage = data.get("stage")
                            if stage == 1: 
                                await ws_manager.broadcast_to_user(user_id, {"type": "final_reply", "text":"", "motion_file": "Shy"})
                            elif stage == 2: 
                                await ws_manager.send_ai_reply("嗯？", "Thinking", user_id, is_proactive=True)
                            elif stage == 3:
                                nudge = await brain.make_gentle_nudge(user_id)
                                await ws_manager.send_ai_reply(nudge['reply'], nudge.get('emotion','shy'), user_id, is_proactive=True)
                        elif msg_type == "get_mood_chart": 
                            await send_mood_chart(user_id)
                        elif msg_type == "interrupt":
                            await global_manager.interrupt(user_id)
                            file_handle.close()
                            file_handle = open(temp_audio, "wb")
                        elif data.get("text") == "stop":
                            file_handle.close()
                            if os.path.exists(temp_audio) and os.path.getsize(temp_audio) > 500:
                                success = convert_audio_to_wav(temp_audio, converted_audio)
                                target_file = converted_audio if success else temp_audio
                                text, emo = await loop.run_in_executor(executor, asr.recognize, target_file)
                                if text: 
                                    print(f"🎤 [语音直通] 识别出文本: {text}，绕过防抖等待，立即响应！")
                                    # 同步文本给前端
                                    await ws_manager.broadcast_to_user(user_id, {"type": "user_sync", "text": text})
                                    
                                    # 清空可能的纯文本打字残留
                                    await global_manager.interrupt(user_id)
                                    
                                    # 构建带有语气标签的底层串
                                    stored_text = text if not emo or emo in ["neutral", "unknown"] else f"{text} (语气:{emo})"
                                    
                                    # 💥 直通车：绕过 3.0s 等待池，瞬间起跑
                                    asyncio.create_task(process_and_push_response(stored_text, user_id))
                            file_handle = open(temp_audio, "wb")
                    except Exception as e:
                        print(f"消息处理错误: {e}")
                        
            except asyncio.TimeoutError:
                # 30秒没收到消息，发送心跳
                current_time = time.time()
                if current_time - last_heartbeat > 45:  # 如果超过45秒没任何消息，认为连接已死
                    print(f"⏰ 用户[{user_id}]心跳超时，关闭连接")
                    break
                    
                try:
                    print(f"❤️ 发送心跳给用户[{user_id}]")
                    await websocket.send_json({"type": "ping"})
                except:
                    break
                    
            except WebSocketDisconnect:
                print(f"用户[{user_id}] WebSocket 正常断开")
                break
            except Exception as e:
                print(f"WebSocket 异常: {e}")
                break
                
    except Exception as e:
        print(f"连接错误: {e}")
    finally:
        try: 
            file_handle.close() 
        except: 
            pass
        ws_manager.disconnect(websocket, user_id)

@app.get("/diaries")
async def get_diaries_endpoint(current_user: dict = Depends(get_current_user)):
    return database.get_diaries(current_user["id"], limit=20)

@app.get("/api/diary")
async def get_diary_api(current_user: dict = Depends(get_current_user)):
    """获取指定用户的日记列表"""
    return diary_service.get_all_memories(current_user["id"])

@app.get("/api/memories")
async def get_memories_api(current_user: dict = Depends(get_current_user)):
    """兼容旧端点，带 user_id 过滤"""
    return diary_service.get_all_memories(current_user["id"])

class DiaryContent(BaseModel):
    content: str

@app.post("/api/generate")
async def generate_diary_api(req: DiaryContent, current_user: dict = Depends(get_current_user)):
    """兼容旧端点：手动触发日记生成"""
    return await diary_service.generate_diary(current_user["id"])

@app.post("/api/diary/generate")
async def generate_diary_new_api(req: DiaryContent, current_user: dict = Depends(get_current_user)):
    """新端点：手动触发今日日记生成"""
    result = await diary_service.generate_diary(current_user["id"], force=True)
    if result:
        return {"status": "ok", "diary": result}
    return {"status": "skipped", "msg": "今日日记已存在"}

# =========================================================================
#                     🔥 [新增] 视觉功能专用接口
# =========================================================================
class PhotoRequest(BaseModel):
    image: str
    text: str = ""

@app.post("/api/vision_chat")
async def vision_chat_api(req: PhotoRequest, current_user: dict = Depends(get_current_user)):
    if not vision_service:
        return {"reply": "我的视觉模块好像没装好...", "emotion": "sad", "audio": None}

    user_id = current_user["id"]

    # 1. 识别 (VisionService 会自动处理 base64 前缀问题)
    reply_text = sanitize_reply_text(
        vision_service.see_and_reply(req.image, req.text)
    )
    if not reply_text:
        reply_text = "我刚才没能看清，可以再让我看一次吗？"

    # 2. 🔥 [优化] 通过 WebSocket 流式推送，复用前端已有的音频队列播放逻辑
    async def _push_vision_audio():
        speech_delivery = None
        try:
            emotion = "happy"
            reply_id = uuid.uuid4().hex

            async def render_speech_unit(unit, trace):
                return await ws_manager.send_ai_reply_chunk(
                    unit.text,
                    unit.emotion,
                    user_id,
                    unit.index,
                    reply_id=reply_id,
                    trace=trace,
                )

            speech_delivery = SpeechReplyDelivery(
                coordinator=speech_stream_coordinator,
                user_id=user_id,
                reply_id=reply_id,
                broadcast=ws_manager.broadcast_to_user,
                render_unit=render_speech_unit,
            )
            await speech_delivery.start()

            # 文字先行上屏
            await ws_manager.broadcast_to_user(user_id, {
                "type": "text_stream_chunk",
                "reply_id": reply_id,
                "chunk_index": 0,
                "text": reply_text,
                "emotion": emotion
            })

            await speech_delivery.add_text(reply_text, emotion)

            # 写入数据库
            database.add_message(user_id, "ai", reply_text, 0, None)

            await speech_delivery.finish(full_text=reply_text)
        except Exception as e:
            if speech_delivery is not None:
                await speech_delivery.cancel()
            print(f"❌ [Vision TTS Push] 推送失败: {e}")

    # 启动异步推送任务，不阻塞 HTTP 响应
    asyncio.create_task(_push_vision_audio())

    # HTTP 只确认已受理；回复统一通过 WebSocket 发送，避免前端重复上屏与播放。
    return {"status": "accepted"}


# =========================================================================
#   🔥 [新增] 手机语音输入接口（base64 音频 -> ASR -> WebSocket 推送）
#   解决 HBuilder APK 中 WebSocket 二进制传输不稳定的问题
# =========================================================================
import base64 as base64_lib

class VoiceInputRequest(BaseModel):
    audio_base64: str       # 纯 base64 编码的 WAV 音频

@app.post("/api/voice_input")
async def voice_input_api(req: VoiceInputRequest, current_user: dict = Depends(get_current_user)):
    """
    手机录音 -> base64 -> HTTP POST -> 这里
    后端解码 -> 保存 -> ASR -> WebSocket 推送 AI 回复
    """
    user_id = current_user["id"]
    print(f"🎙️ [VoiceInput] 收到语音请求，用户: {user_id}")

    # 1. 解码 base64
    try:
        audio_bytes = base64_lib.b64decode(req.audio_base64)
    except Exception as e:
        print(f"❌ [VoiceInput] base64 解码失败: {e}")
        return {"status": "error", "msg": "音频解码失败"}

    if len(audio_bytes) < 500:
        print(f"⚠️ [VoiceInput] 音频太短 ({len(audio_bytes)} bytes)")
        return {"status": "too_short"}

    # 2. 保存临时文件
    temp_audio = os.path.join(CURRENT_DIR, f"temp_{user_id}.wav")
    converted_audio = os.path.join(CURRENT_DIR, f"temp_{user_id}_16k.wav")
    with open(temp_audio, "wb") as f:
        f.write(audio_bytes)
    print(f"💾 [VoiceInput] 已保存: {len(audio_bytes)} bytes")

    # 3. 转码 + ASR（在线程池执行，不阻塞主线程）
    loop = asyncio.get_event_loop()
    def run_asr():
        success = convert_audio_to_wav(temp_audio, converted_audio)
        target = converted_audio if success else temp_audio
        return asr.recognize(target)

    text, emotion = await loop.run_in_executor(executor, run_asr)
    print(f"🎤 [VoiceInput] 识别结果: '{text}' | 情感: {emotion}")

    # 4. 识别成功则走正常对话，AI 回复会通过 WebSocket 推给前端
    if text:
        await global_manager.handle_input(text, emotion=emotion, user_id=user_id)
        return {"status": "ok", "text": text}

    print("⚠️ [VoiceInput] 未识别到语音")
    return {"status": "empty"}




# =========================================================================
#               🕥 定时任务：北京时间 23:30 自动生成日记
# =========================================================================
async def scheduled_diary_job():
    """
    每天北京时间 23:30 触发，为所有有历史对话的用户自动生成当日日记。
    北京时间 (CST, UTC+8) 23:30 = UTC 15:30，使用 Asia/Shanghai 时区。
    """
    user_ids = database.get_all_user_ids()
    print(f"📅 [定时任务] 开始为 {len(user_ids)} 个用户生成日记...")
    for uid in user_ids:
        try:
            await diary_service.generate_diary(uid)
        except Exception as e:
            print(f"❌ [{uid}] 定时日记生成失败: {e}")
    print("✅ [定时任务] 所有用户日记生成完毕")


async def scheduled_social_post_job():
    """
    每天北京时间 09:00、12:00、18:00 触发，AI 自动发朋友圈。
    """
    user_ids = database.get_all_user_ids()
    print(f"📅 [定时任务] 开始为 {len(user_ids)} 个用户发布 AI 朋友圈...")
    for uid in user_ids:
        try:
            today_messages = database.get_today_messages(uid)
            conversation_summary = "\n".join([m['content'] for m in today_messages[-8:]]) if today_messages else ""
            emotion_type = "happy"
            if today_messages:
                # 简单情感判断：最后一句中含 sad 关键词时
                last = today_messages[-1]['content']
                if any(w in last for w in ['难过', '悲伤', '失落', '痛苦']):
                    emotion_type = 'sad'
                elif any(w in last for w in ['开心', '高兴', '快乐', '兴奋']):
                    emotion_type = 'happy'
                elif any(w in last for w in ['疲惫', '安静', '宁静']):
                    emotion_type = 'calm'
                else:
                    emotion_type = 'thoughtful'

            social_payload = await brain.generate_social_post(uid, conversation_summary=conversation_summary, emotion_type=emotion_type)
            if not social_payload or not social_payload.get('content'):
                continue

            emoji_pack_ids = await brain.match_emoji_packs(social_payload.get('emoji_keywords', []), ai_id='ai_una')
            content = social_payload.get('content', '')
            # 自动插入 1-2 个 emoji
            extra_emojis = ''.join(social_payload.get('emojis', [])[:2])
            if extra_emojis and extra_emojis not in content:
                content = f"{content} {extra_emojis}"

            social_db.create_post(
                owner_user_id=uid,
                author_id='ai_una',
                author_name='UNA',
                author_type='ai',
                author_avatar='/static/social_images/avatars/ai_una/avatar.png',
                content=content,
                images=social_payload.get('image_urls', []),
                location='',
                emoji_pack_ids=emoji_pack_ids,
                post_type='ai',
                visibility='public'
            )
        except Exception as e:
            print(f"❌ [{uid}] AI 自动发圈失败: {e}")
    print("✅ [定时任务] AI 朋友圈发布完成")


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(application):
    """FastAPI 生命周期：启动时初始化定时调度器"""
    scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")
    # 每天北京时间 23:30 触发
    scheduler.add_job(
        scheduled_diary_job,
        CronTrigger(hour=23, minute=30, timezone="Asia/Shanghai"),
        id="daily_diary",
        replace_existing=True
    )
    # AI 发圈：09:00 / 12:00 / 18:00
    scheduler.add_job(
        scheduled_social_post_job,
        CronTrigger(hour="9,12,18", minute=0, timezone="Asia/Shanghai"),
        id="daily_social_post",
        replace_existing=True
    )
    scheduler.start()
    print("⏰ [Scheduler] 日记定时任务已启动 (每天北京时间 23:30)")
    print("⏰ [Scheduler] AI 自动发圈任务已启动 (每天北京时间 09:00/12:00/18:00)")
    try:
        yield
    finally:
        try:
            await voice_call_service.close()
            print("☎️ [VoiceCall] 实时语音资源已关闭")
        finally:
            scheduler.shutdown()
            print("⏰ [Scheduler] 定时任务已停止")


# 将 lifespan 注入 app（注意：需要在 app 定义之后、路由之前设置）
app.router.lifespan_context = lifespan


if __name__ == "__main__":
    import uvicorn
    print("🚀 Una AI Server Started on Port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
