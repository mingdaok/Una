import os
import yaml
import json
import threading
import pyaudio
import audioop
import nls
from PyQt5.QtCore import QObject, pyqtSignal

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class VoiceProcessor(QObject):
    on_recording_start = pyqtSignal()
    on_recording_stop = pyqtSignal()
    on_realtime_text = pyqtSignal(str)
    on_error = pyqtSignal(str)

    def __init__(self):
        super().__init__()
        self.config = self._load_config()
        self.is_recording = False
        self.CHUNK = 640
        self.RATE = 16000 
        self.FORMAT = pyaudio.paInt16

    def _load_config(self):
        config_path = os.path.join(ROOT_DIR, "config.yaml")
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                return data.get('aliyun_nls', {})
        except: return {}

    def start(self):
        if self.is_recording: return
        self.is_recording = True
        threading.Thread(target=self._run_recognition, daemon=True).start()
        self.on_recording_start.emit()

    def stop(self):
        self.is_recording = False
        self.on_recording_stop.emit()

    def _run_recognition(self):
        ak_id = self.config.get('access_key_id')
        ak_secret = self.config.get('access_key_secret')
        app_key = self.config.get('app_key')
        # 🔥 获取配置的 region_id，如果没填默认用 cn-shanghai
        region = self.config.get('region_id', 'cn-shanghai')

        if not (ak_id and ak_secret and app_key):
            self.on_error.emit("Key 未配置")
            return

        # 🔥 动态构造 URL (比如 cn-beijing.aliyuncs.com)
        ws_url = f"wss://nls-gateway.{region}.aliyuncs.com/ws/v1"
        
        print(f"🌍 地域: {region}")
        print(f"🔗 连接: {ws_url}")

        p = pyaudio.PyAudio()
        try:
            stream = p.open(format=self.FORMAT, channels=1, rate=self.RATE, input=True, frames_per_buffer=self.CHUNK)
        except Exception as e:
            self.on_error.emit(f"麦克风打开失败: {e}")
            return

        def on_result_changed(text):
            try:
                res = json.loads(text)
                self.on_realtime_text.emit(res['payload']['result'])
            except: pass
        
        def on_error(text):
            print(f"❌ 阿里云报错: {text}")
            self.on_error.emit(str(text))

        try:
            transcriber = nls.NlsSpeechTranscriber(
                url=ws_url,  # 使用动态 URL
                akid=ak_id, aksecret=ak_secret, appkey=app_key,
                on_result_changed=on_result_changed,
                on_error=on_error,
                region_id=region # 🔥 传入地域ID给 SDK
            )
            
            transcriber.start(aformat="pcm", enable_intermediate_result=True)
            
            while self.is_recording:
                data = stream.read(self.CHUNK, exception_on_overflow=False)
                # 简单音量检测，防止无声也一直发
                rms = audioop.rms(data, 2)
                if rms > 100: 
                    transcriber.send_audio(data)
            
            transcriber.stop()
            
        except Exception as e:
            self.on_error.emit(str(e))
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()