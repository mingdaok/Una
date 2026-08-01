import logging
import os
import re
import subprocess
import threading
import time

import numpy as np
import torch
from funasr import AutoModel


logging.basicConfig(level=logging.ERROR)


class SenseVoiceASR:
    def __init__(self, model_id="iic/SenseVoiceSmall", device="cpu"):
        self._inference_lock = threading.Lock()
        print(f"正在加载本地语音模型: {model_id} ...")
        start_time = time.time()

        if torch.cuda.is_available():
            device = "cuda"

        try:
            self.model = AutoModel(
                model=model_id,
                trust_remote_code=True,
                device=device,
                disable_update=True,
                vad_model="fsmn-vad",
                vad_kwargs={"max_single_segment_time": 30000},
            )
            print(f"语音模型加载完成，耗时: {time.time() - start_time:.2f}s")
        except Exception as error:
            print(f"模型加载失败: {error}")
            self.model = None

    def _convert_audio_to_pcm(self, input_path):
        """Convert an audio file to the 16 kHz mono WAV expected by SenseVoice."""
        output_path = input_path.replace(".wav", "_fixed.wav")
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", input_path,
                    "-ar", "16000", "-ac", "1", "-f", "wav",
                    output_path,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            return output_path
        except Exception:
            return input_path

    def recognize(self, audio_file_path):
        """Recognize an audio file while preserving the existing FFmpeg fallback."""
        if not self.model:
            return "", "neutral"

        target_path = self._convert_audio_to_pcm(audio_file_path)
        try:
            result = self.model.generate(
                input=target_path,
                cache={},
                language="auto",
                use_itn=True,
                batch_size_s=60,
                merge_vad=True,
                merge_length_s=15,
            )
            if target_path != audio_file_path and os.path.exists(target_path):
                os.remove(target_path)
            return self._parse_result(result)
        except Exception as error:
            print(f"语音识别出错: {error}")
            if target_path != audio_file_path and os.path.exists(target_path):
                os.remove(target_path)
            return "", "neutral"

    def recognize_pcm16(self, pcm: bytes, sample_rate: int = 16000):
        if sample_rate != 16000:
            raise ValueError("实时语音只接受 16 kHz PCM")
        if not self.model:
            return "", "neutral"
        if not pcm:
            return "", "neutral"
        if len(pcm) % 2 or len(pcm) > 960000:
            raise ValueError("PCM16 字节长度非法")

        waveform = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
        with self._inference_lock:
            result = self.model.generate(
                input=waveform,
                cache={},
                language="auto",
                use_itn=True,
                batch_size_s=60,
                merge_vad=True,
                merge_length_s=15,
            )
        return self._parse_result(result)

    def _parse_result(self, result):
        if not result:
            return "", "neutral"

        raw_text = result[0].get("text", "")
        emotion = "neutral"
        if re.search(r"<\|HAPPY\|>", raw_text):
            emotion = "happy"
        elif re.search(r"<\|SAD\|>", raw_text):
            emotion = "sad"
        elif re.search(r"<\|ANGRY\|>", raw_text):
            emotion = "angry"
        elif re.search(r"<\|FEAR\|>", raw_text):
            emotion = "fearful"
        elif re.search(r"<\|DISGUST\|>", raw_text):
            emotion = "disgusted"

        clean_text = re.sub(r"<\|.*?\|>", "", raw_text).strip()
        print(f"[ASR] 原始: {raw_text}")
        print(f"[ASR] 情感: {emotion} | 文本: {clean_text}")
        return clean_text, emotion
