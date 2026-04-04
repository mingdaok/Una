import os
import time
import torch
import logging
import re
import subprocess
from funasr import AutoModel

# 配置日志
logging.basicConfig(level=logging.ERROR)

class SenseVoiceASR:
    def __init__(self, model_id="iic/SenseVoiceSmall", device="cpu"):
        """
        初始化本地语音识别引擎 (SenseVoiceSmall)
        """
        print(f"⏳ 正在加载本地语音模型: {model_id} ...")
        start_time = time.time()
        
        # 自动使用 GPU 如果可用
        if torch.cuda.is_available():
            device = "cuda"
            
        try:
            # 加载模型 (第一次会自动下载)
            # trust_remote_code=True 必须开启以加载 SenseVoice 结构
            self.model = AutoModel(
                model=model_id,
                trust_remote_code=True,
                device=device,
                disable_update=True,
                vad_model="fsmn-vad", 
                vad_kwargs={"max_single_segment_time": 30000},
            )
            print(f"✅ 语音模型加载完成！耗时: {time.time() - start_time:.2f}s")
        except Exception as e:
            print(f"❌ 模型加载失败: {e}")
            self.model = None

    def _convert_audio_to_pcm(self, input_path):
        """
        [新增辅助] 强制将音频转为 16k 采样率的单声道 WAV，提高识别成功率
        """
        output_path = input_path.replace(".wav", "_fixed.wav")
        try:
            # 使用 ffmpeg 强制转码为 SenseVoice 最喜欢的格式
            subprocess.run([
                'ffmpeg', '-y', '-i', input_path,
                '-ar', '16000', '-ac', '1', '-f', 'wav',
                output_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return output_path
        except:
            return input_path # 转码失败则尝试原样识别

    def recognize(self, audio_file_path):
        """
        [终极修复版] 识别音频文件，使用正则暴力清洗所有标签
        """
        if not self.model:
            return "", "neutral"

        # 🔥 关键修复：先转码再识别，解决手机端采样率不匹配导致的识别失败
        target_path = self._convert_audio_to_pcm(audio_file_path)

        try:
            # SenseVoice 推理
            res = self.model.generate(
                input=target_path,
                cache={},
                language="auto", # 建议 auto，支持中英混合
                use_itn=True,
                batch_size_s=60,
                merge_vad=True, 
                merge_length_s=15,
            )
            
            # 清理临时转码文件
            if target_path != audio_file_path and os.path.exists(target_path):
                os.remove(target_path)

            if res and len(res) > 0:
                # 原始输出通常包含 <|zh|><|HAPPY|><|speech|>...
                raw_text = res[0].get("text", "")
                
                # 1. 🔥 提取情感 (使用正则精确匹配标签)
                emotion = "neutral"
                if re.search(r'<\|HAPPY\|>', raw_text): emotion = "happy"
                elif re.search(r'<\|SAD\|>', raw_text): emotion = "sad"
                elif re.search(r'<\|ANGRY\|>', raw_text): emotion = "angry"
                elif re.search(r'<\|FEAR\|>', raw_text): emotion = "fearful"
                elif re.search(r'<\|DISGUST\|>', raw_text): emotion = "disgusted"
                
                # 2. 🔥【核武器清洗】删除所有 <|xxxx|> 格式的标签
                clean_text = re.sub(r'<\|.*?\|>', '', raw_text)
                
                # 3. 二次清洗：去除首尾空格
                clean_text = clean_text.strip()
                
                # 调试日志
                print(f"🎤 [ASR] 原始: {raw_text}")
                print(f"😁 [ASR] 情感: {emotion} | 文本: {clean_text}")
                
                return clean_text, emotion
            
            return "", "neutral"

        except Exception as e:
            print(f"❌ 识别出错: {e}")
            if target_path != audio_file_path and os.path.exists(target_path):
                os.remove(target_path)
            return "", "neutral"