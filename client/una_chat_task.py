import requests
import json
import os
from PyQt5.QtCore import QThread, pyqtSignal

# 动态获取项目根目录，确保下载路径正确
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class UnaChatTask(QThread):
    # 定义两个信号：
    # 1. 完成信号：带回回复文本和音频路径
    finished_signal = pyqtSignal(dict)
    # 2. 错误信号：方便调试
    error_signal = pyqtSignal(str)

    def __init__(self, text):
        super().__init__()
        self.text = text
        self.api_url = "http://127.0.0.1:8000/chat"

    def run(self):
        try:
            print(f"🚀 发送请求: {self.text}")
            
            # --- 🔥 关键修复：确保 JSON 字段名为 'text' ---
            # 必须与 main_server.py 里的 ChatRequest 类定义完全一致
            payload = {
                "text": self.text,       # 字段名必须是 "text"
                "user_id": "master_una"  # 用户ID，可自定义
            }
            
            # 发送 POST 请求
            response = requests.post(self.api_url, json=payload, timeout=30)
            
            # 检查 HTTP 状态码 (如果是 422/500 这里会抛出异常)
            response.raise_for_status()
            
            # 解析返回数据
            data = response.json()
            reply = data.get("reply", "...")
            audio_url = data.get("audio_url")
            
            local_audio_path = None
            
            # 如果有语音，下载下来
            if audio_url:
                # 拼接完整的下载 URL
                full_url = f"http://127.0.0.1:8000{audio_url}"
                
                # 确定保存路径: static/voice/文件名
                file_name = audio_url.split("/")[-1]
                save_dir = os.path.join(ROOT_DIR, "static", "voice")
                if not os.path.exists(save_dir):
                    os.makedirs(save_dir)
                    
                local_audio_path = os.path.join(save_dir, file_name)
                
                # 下载文件
                print(f"⬇️ 正在下载语音: {full_url}")
                audio_res = requests.get(full_url)
                with open(local_audio_path, "wb") as f:
                    f.write(audio_res.content)
                print(f"✅ 语音已保存: {local_audio_path}")

            # 发送结果回 UI
            self.finished_signal.emit({
                "reply": reply,
                "local_audio_path": local_audio_path
            })

        except Exception as e:
            print(f"❌ 通信错误: {e}")
            self.error_signal.emit(str(e))
            # 即使出错，也反馈一个默认回复，防止 UI 卡死
            self.finished_signal.emit({
                "reply": f"大脑连接出错了: {str(e)}",
                "local_audio_path": None
            })