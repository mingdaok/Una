import nls
import json
import threading
import pyaudio
import queue
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

class UnaVoiceRecognizer:
    def __init__(self, appkey, akid, aksecret):
        self.appkey, self.akid, self.aksecret = appkey.strip(), akid.strip(), aksecret.strip()
        self.rate, self.chunk = 16000, 640
        self.pa = pyaudio.PyAudio()
        self.result_queue = queue.Queue()
        self.is_recording = False
        
        # --- 新增：文字缓存 ---
        self.full_sentence_cache = "" 

    def _get_token(self):
        try:
            client = AcsClient(self.akid, self.aksecret, "cn-shanghai")
            request = CommonRequest()
            request.set_domain('nls-meta.cn-shanghai.aliyuncs.com')
            request.set_version('2019-02-28')
            request.set_action_name('CreateToken')
            return json.loads(client.do_action_with_exception(request))['Token']['Id']
        except Exception as e:
            print(f"Token获取失败: {e}")
            return None

    def on_sentence_end(self, message, *args):
        # 阿里云认为一句结束了，我们把结果累加到缓存
        res = json.loads(message)
        text = res['payload']['result']
        if text.strip():
            self.full_sentence_cache += text
            # 注意：这里先不 put 到 result_queue

    def on_result_changed(self, message, *args):
        # 实时显示（中间结果），提供视觉反馈
        res = json.loads(message)
        current_part = res['payload']['result']
        print(f"\r[Una 倾听中...] {self.full_sentence_cache + current_part}", end="")

    def record_loop(self, transcriber):
        try:
            # 开启流式识别，允许中间结果
            transcriber.start(aformat="pcm", enable_intermediate_result=True)
            stream = self.pa.open(format=pyaudio.paInt16, channels=1, rate=self.rate, input=True)
            
            while self.is_recording:
                data = stream.read(self.chunk, exception_on_overflow=False)
                transcriber.send_audio(data)
            
            # --- 关键：松开按键后的处理 ---
            stream.stop_stream()
            stream.close()
            # 停止前确保最后一句话也被处理
            transcriber.stop() 
            
            # 将整段话一次性放入队列
            if self.full_sentence_cache.strip():
                self.result_queue.put(self.full_sentence_cache)
                self.full_sentence_cache = "" # 清空缓存供下次使用
                
        except Exception as e:
            print(f"\n[ASR录音错误] {e}")

    def start_recording(self):
        if self.is_recording: return
        self.is_recording = True
        self.full_sentence_cache = "" # 重置缓存
        
        token = self._get_token()
        if not token: return
        
        transcriber = nls.NlsSpeechTranscriber(
            url="wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1",
            token=token, appkey=self.appkey,
            on_sentence_end=self.on_sentence_end,
            on_result_changed=self.on_result_changed
        )
        threading.Thread(target=self.record_loop, args=(transcriber,), daemon=True).start()

    def stop_recording(self):
        self.is_recording = False
        print("\n[VAD] 停止录制，正在整理回答...")

    def get_text(self):
        try: return self.result_queue.get(timeout=0.01)
        except queue.Empty: return None