"""
tts_service.py - GPT-SoVITS 语音合成服务封装
调用本地运行的 GPT-SoVITS api_v2.py (默认端口 9880)，合成你自己训练好的声音。
如果 GPT-SoVITS 服务不可用，自动降级回 edge-tts。
"""
from __future__ import annotations

import os
import uuid
import yaml
import asyncio
import aiohttp
import subprocess
import time

from speech_metrics import SpeechTrace, log_speech_stage

# === 读取配置 ===
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
CONFIG_PATH = os.path.join(ROOT_DIR, "config.yaml")

if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
else:
    config = {}

_gsv_conf = config.get('apis', {}).get('gpt_sovits', {})

GSV_HOST        = _gsv_conf.get('host', '127.0.0.1')
GSV_PORT        = _gsv_conf.get('port', 9880)
REF_AUDIO_PATH  = _gsv_conf.get('ref_audio_path', '')
PROMPT_TEXT     = _gsv_conf.get('prompt_text', '')
PROMPT_LANG     = _gsv_conf.get('prompt_lang', 'zh')
SPEED_NORMAL    = _gsv_conf.get('speed_normal', 1.0)
SPEED_SAD       = _gsv_conf.get('speed_sad', 0.85)
SPEED_HAPPY     = _gsv_conf.get('speed_happy', 1.1)
FALLBACK_EDGE   = _gsv_conf.get('fallback_edge_tts', True)

GSV_URL = f"http://{GSV_HOST}:{GSV_PORT}/tts"

# 输出目录（与 main_server.py 中的 AUDIO_DIR 保持一致）
AUDIO_DIR = os.path.join(CURRENT_DIR, "static", "voice")
os.makedirs(AUDIO_DIR, exist_ok=True)


def _emotion_to_speed(emotion) -> float:
    """根据情感标签映射语速"""
    if isinstance(emotion, list):
        emotion = emotion[0] if emotion else "neutral"
    emotion = str(emotion or "neutral").lower().strip()
    
    if emotion in ("sad", "cry", "depressed", "grief", "disappointed", "sorry"):
        return SPEED_SAD
    if emotion in ("happy", "joy", "excited", "laugh", "funny"):
        return SPEED_HAPPY
    return SPEED_NORMAL


def build_gsv_payload(clean_text: str, emotion="neutral") -> dict:
    """构建 GPT-SoVITS 请求载荷，并避免短语音的二次切分静音。"""
    return {
        "text": clean_text,
        "text_lang": "zh",
        "ref_audio_path": REF_AUDIO_PATH,
        "prompt_text": PROMPT_TEXT,
        "prompt_lang": PROMPT_LANG,
        "media_type": "wav",
        "streaming_mode": False,
        "speed_factor": _emotion_to_speed(emotion),
        "top_k": 35,
        "top_p": 0.95,
        "temperature": 0.75,
        "text_split_method": "cut0" if len(clean_text) <= 80 else "cut5",
        "fragment_interval": 0.05,
        "batch_size": 3,
        "repetition_penalty": 1.42,
        "sample_steps": 12,
    }


import json

async def _convert_wav_to_mp3(wav_filepath: str, mp3_filepath: str) -> bool:
    """将 WAV 文件转换为兼容更广的 MP3 文件"""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", wav_filepath,
            "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-q:a", "2", mp3_filepath,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            err_text = stderr.decode('utf-8', errors='ignore') if isinstance(stderr, bytes) else str(stderr)
            print(f"⚠️ [FFmpeg->MP3] 转换失败: {err_text[:200]}")
            return False
        return True
    except Exception as e:
        print(f"⚠️ [FFmpeg->MP3] 异常: {e}")
        return False


async def _run_rhubarb(audio_filepath: str) -> list:
    """运行 Rhubarb 分析音轨并返回 visemes 序列"""
    try:
        json_path = audio_filepath + ".json"
        rhubarb_exe = os.path.join(CURRENT_DIR, "rhubarb", "rhubarb.exe")
        if not os.path.exists(rhubarb_exe):
            print("⚠️ [Rhubarb] 引擎未找到，跳过口型生成的离线对齐")
            return []
            
        print(f"👄 [Rhubarb] 开始进行唇形对齐分析：{os.path.basename(audio_filepath)}")
        # 运行 Rhubarb 命令行
        cmd = [rhubarb_exe, "-f", "json", "-r", "phonetic", audio_filepath, "-o", json_path]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            stderr_text = stderr.decode('utf-8', errors='ignore') if isinstance(stderr, bytes) else str(stderr)
            print(f"❌ [Rhubarb] 执行失败: {stderr_text[:200]}")
            return []
            
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 提取时间轴
        visemes = data.get('mouthCues', [])
        # 清理临时 json 文件
        try: os.remove(json_path)
        except: pass
        
        print(f"✅ [Rhubarb] 共提取 {len(visemes)} 个音素切片")
        return visemes
    except Exception as e:
        print(f"❌ [Rhubarb] 异常: {e}")
        return []

async def generate_audio_gsv(
    text: str, emotion="neutral", *, trace: SpeechTrace | None = None
) -> tuple[str | None, list]:
    """
    调用 GPT-SoVITS 合成语音，并绑定时间戳返回。
    """
    if isinstance(emotion, list):
        emotion = emotion[0] if emotion else "neutral"
    emotion = str(emotion or "neutral").lower().strip()

    if not text or not text.strip():
        print(f"⚠️ [GSV] 跳过空文本: '{text}'")
        return None, []

    # 🔥 优化：清洗 Markdown 和多余生僻表情符，这会拖慢 TTS 的合成速度甚至导致卡壳
    import re
    # 移除过长的动作描写（超过20个字符的括号内容），保留简短的动作词
    clean_text = re.sub(r'\([^)]{21,}\)|\[[^\]]{21,}\]|（[^）]{21,}）|【[^】]{21,}】', '', text)
    # 移除 Markdown 格式
    clean_text = re.sub(r'[*_~`]', '', clean_text)
    # 匹配英文字符、数字、中文字符以及基本的中英文标点
    clean_text = re.sub(r'[^\w\s\u4e00-\u9fa5\uff00-\uffef。，！？、.,!?]', '', clean_text)
    clean_text = clean_text.strip()

    if not clean_text:
        print(f"⚠️ [GSV] 清洗后文本为空，跳过: '{text}' -> '{clean_text}'")
        return None, []

    print(f"🗣️ [GSV] 合成语音: 「{clean_text[:20]}...」 速度={_emotion_to_speed(emotion)}")

    payload = build_gsv_payload(clean_text, emotion)

    # 校验参考音频配置
    if not REF_AUDIO_PATH:
        print("⚠️ [GSV] ref_audio_path 未配置，跳过 GPT-SoVITS")
        return await _fallback_edge(text, emotion) if FALLBACK_EDGE else None

    # 生成文件名
    filename = f"{uuid.uuid4()}.wav"
    filepath = os.path.join(AUDIO_DIR, filename)

    try:
        print(f"🗣️ [GSV] 合成语音: 「{clean_text[:20]}...」 速度={_emotion_to_speed(emotion)}")
        # 注意：GPT-SoVITS 合成耗时较长，timeout 设长一点
        timeout = aiohttp.ClientTimeout(total=120)
        http_started = time.perf_counter()
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(GSV_URL, json=payload) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                    else:
                        text = await resp.text()
                        print(f"❌ [GSV] API 返回错误 {resp.status}: {text[:200]}")
                        content = None
        except Exception:
            log_speech_stage(
                trace, "gpt_http", (time.perf_counter() - http_started) * 1000, status="failed"
            )
            raise
        log_speech_stage(
            trace,
            "gpt_http",
            (time.perf_counter() - http_started) * 1000,
            status="ok" if content is not None else "failed",
        )

        if content is not None:
            write_started = time.perf_counter()
            try:
                with open(filepath, "wb") as f:
                    f.write(content)
            except Exception:
                log_speech_stage(
                    trace, "write_file", (time.perf_counter() - write_started) * 1000, status="failed"
                )
                raise
            log_speech_stage(
                trace, "write_file", (time.perf_counter() - write_started) * 1000
            )
            print(f"✅ [GSV] 合成成功: {filename}")
            rhubarb_started = time.perf_counter()
            try:
                visemes = await _run_rhubarb(filepath)
            except Exception:
                log_speech_stage(
                    trace, "rhubarb", (time.perf_counter() - rhubarb_started) * 1000, status="failed"
                )
                raise
            log_speech_stage(trace, "rhubarb", (time.perf_counter() - rhubarb_started) * 1000)

            mp3_filename = filename.replace('.wav', '.mp3')
            mp3_filepath = os.path.join(AUDIO_DIR, mp3_filename)
            transcode_started = time.perf_counter()
            try:
                transcoded = await _convert_wav_to_mp3(filepath, mp3_filepath)
            except Exception:
                log_speech_stage(
                    trace, "transcode", (time.perf_counter() - transcode_started) * 1000, status="failed"
                )
                raise
            log_speech_stage(
                trace,
                "transcode",
                (time.perf_counter() - transcode_started) * 1000,
                status="ok" if transcoded else "failed",
            )
            if transcoded:
                try:
                    os.remove(filepath)
                except:
                    pass
                return f"/static/voice/{mp3_filename}", visemes
            return f"/static/voice/{filename}", visemes

    except aiohttp.ClientConnectorError:
        print(f"❌ [GSV] 无法连接 GPT-SoVITS ({GSV_URL})，请确保 api_v2.py 已启动")
    except asyncio.TimeoutError:
        print("❌ [GSV] 合成超时（>120s）")
    except aiohttp.ClientError as e:
        print(f"❌ [GSV] HTTP 连接错误: {e}")
    except Exception as e:
        print(f"❌ [GSV] 发生异常: {e}")

    # ——— 降级处理 ———
    if FALLBACK_EDGE:
        print("⬇️ [GSV] 降级到 edge-tts...")
        return await _fallback_edge(text, emotion)
    return None, []


async def _fallback_edge(text: str, emotion="neutral") -> tuple[str | None, list]:
    """降级方案：使用 edge-tts 合成"""
    try:
        import edge_tts
        if isinstance(emotion, list):
            emotion = emotion[0] if emotion else "neutral"
        emotion = str(emotion or "neutral").lower().strip()
        
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        voice = "zh-CN-XiaoxiaoNeural"
        rate = "+0%"
        if emotion in ("sad", "cry", "depressed"): rate = "-5%"
        elif emotion in ("happy", "joy", "excited"): rate = "+10%"
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(filepath)
        print(f"🔊 [EdgeTTS] 降级合成成功: {filename}")

        # 将 mp3 转为 wav 给 rhubarb
        wav_filepath = filepath.replace(".mp3", ".wav")
        try:
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-i", filepath, "-ac", "1", "-ar", "16000", wav_filepath,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                err_text = stderr.decode('utf-8', errors='ignore') if isinstance(stderr, bytes) else str(stderr)
                print(f"⚠️ [FFmpeg/Rhubarb] 转换失败: {err_text[:200]}")
                visemes = []
            else:
                visemes = await _run_rhubarb(wav_filepath)
                # 清理转换格式产生的 wav 临时文件，节省空间，前端始终播放 mp3 即可
                try:
                    os.remove(wav_filepath)
                except:
                    pass
        except Exception as e:
            print(f"⚠️ [FFmpeg/Rhubarb] 转换或解析报错: {e}")
            visemes = []
            
        return f"/static/voice/{filename}", visemes
    except Exception as e:
        print(f"❌ [EdgeTTS] 降级失败: {e}")
        return None, []
