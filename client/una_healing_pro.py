import sys
import os

# --- 🔥 配置：允许自动播放 & 跨域 ---
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--autoplay-policy=no-user-gesture-required --disable-web-security"

from PyQt5.QtWidgets import QApplication, QWidget, QHBoxLayout, QVBoxLayout, QTextBrowser, QLineEdit
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineSettings
from PyQt5.QtCore import Qt, QUrl, QEvent 

# 导入模块
from interaction_manager import InteractionManager
from una_chat_task import UnaChatTask
from ui_effects import TypewriterEffect
from voice_processor import VoiceProcessor 

class UnaHealingApp(QWidget):
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("Una AI - 语音转写确认版")
        self.resize(1100, 750)
        
        # --- 初始化 ---
        self.im = InteractionManager(wait_interval=5000)
        self.typewriter = TypewriterEffect(interval=50)
        self.voice_processor = VoiceProcessor()
        
        # --- 信号绑定 ---
        self.im.user_speech_finalized.connect(self._start_chat_task)
        self.typewriter.char_stepped.connect(self._update_text_ui)
        self.im.interrupt_signal.connect(self._stop_js_voice)

        # 语音信号
        self.voice_processor.on_recording_start.connect(self._on_mic_start)
        self.voice_processor.on_recording_stop.connect(self._on_mic_stop)
        self.voice_processor.on_realtime_text.connect(self._on_voice_text_update)
        self.voice_processor.on_error.connect(self._on_mic_error)
        
        self.current_task = None
        self.init_ui()

        # 全局事件过滤器 (监听空格)
        self.installEventFilter(self)
        
    def init_ui(self):
        layout = QHBoxLayout(self)
        
        # --- Live2D ---
        self.web_view = QWebEngineView()
        self.web_view.settings().setAttribute(QWebEngineSettings.LocalContentCanAccessFileUrls, True)
        self.web_view.settings().setAttribute(QWebEngineSettings.AllowRunningInsecureContent, True)
        self.web_view.page().setBackgroundColor(Qt.transparent)
        
        ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        html_path = os.path.join(ROOT_DIR, "frontend", "index.html")
        self.web_view.load(QUrl.fromLocalFile(html_path))
        
        layout.addWidget(self.web_view, 3)

        # --- 聊天区 ---
        chat_layout = QVBoxLayout()
        self.chat_display = QTextBrowser()
        self.chat_display.setStyleSheet("background: rgba(255, 255, 255, 180); border-radius: 12px; padding: 10px; font-size: 16px;")
        
        self.input_field = QLineEdit()
        self.input_field.setFixedHeight(40)
        self.input_field.setPlaceholderText("💡 按住空格说话 -> 松开确认 -> 按回车发送")
        self.input_field.returnPressed.connect(self.handle_send)
        
        chat_layout.addWidget(self.chat_display)
        chat_layout.addWidget(self.input_field)
        layout.addLayout(chat_layout, 2)

    # ==========================================
    # ⌨️ 按键监听 (Event Filter)
    # ==========================================
    def eventFilter(self, obj, event):
        if event.type() == QEvent.KeyPress:
            if event.key() == Qt.Key_Space and not event.isAutoRepeat():
                # 如果有焦点且有文字，允许打空格
                if self.input_field.hasFocus() and self.input_field.text():
                     return False 
                
                # 否则启动录音
                if not self.voice_processor.is_recording:
                    self._stop_js_voice()
                    self.voice_processor.start()
                return True 

        elif event.type() == QEvent.KeyRelease:
            if event.key() == Qt.Key_Space and not event.isAutoRepeat():
                if self.voice_processor.is_recording:
                    self.voice_processor.stop()
                    return True

        return super().eventFilter(obj, event)

    # ==========================================
    # 🎤 语音回调 (关键修改区域)
    # ==========================================
    def _on_mic_start(self):
        self.input_field.setStyleSheet("border: 2px solid #e74c3c; background-color: #fdedec;")
        self.input_field.setPlaceholderText("🎤 正在聆听...")
        self.input_field.clear() 

    def _on_mic_stop(self):
        """
        松开空格键时触发
        """
        self.input_field.setStyleSheet("")
        text = self.input_field.text().strip()
        
        if text:
            print(f"🎤 语音识别完成: {text}")
            
            # 👇👇👇👇👇👇 关键控制区 👇👇👇👇👇👇
            
            # 【模式 A：手动发送 (你现在想要的)】
            # 仅仅把光标放进去，不发送，等待你按回车
            self.input_field.setPlaceholderText("按回车发送，或修改文字...")
            self.input_field.setFocus() # 聚焦输入框
            # self.input_field.end()      # 光标移到最后 (PyQt5部分版本可能不支持，如报错请注释掉)
            
            # 【模式 B：自动发送 (以前的逻辑)】
            # 如果以后想改回“松手即发”，把上面的注释掉，取消下面这行的注释即可：
            # self.handle_send() 
            
            # 👆👆👆👆👆👆 关键控制区 👆👆👆👆👆👆
            
        else:
            self.input_field.setPlaceholderText("💡 没听清？按住空格重试...")

    def _on_voice_text_update(self, text):
        # 实时把字打在输入框里
        self.input_field.setText(text)

    def _on_mic_error(self, err_msg):
        self.input_field.setPlaceholderText(f"错误: {err_msg}")
        self.input_field.setStyleSheet("border: 2px solid orange;")

    # ==========================================
    # 📨 发送与处理逻辑
    # ==========================================
    def handle_send(self):
        text = self.input_field.text().strip()
        if not text: return

        self._stop_js_voice()
        self.typewriter.stop()

        self.chat_display.append(f"<div style='color:#2980b9; margin-bottom:5px;'><b>你:</b> {text}</div>")
        self.input_field.clear()
        self.input_field.setPlaceholderText("Una 正在思考...") # 发送后提示
        
        self.im.handle_new_input(text)

    def _start_chat_task(self, final_text):
        self.input_field.setEnabled(False)
        if self.current_task:
            try: self.current_task.finished_signal.disconnect()
            except: pass
            if self.current_task.isRunning(): self.current_task.terminate()

        self.current_task = UnaChatTask(final_text)
        self.current_task.finished_signal.connect(self.process_response)
        self.current_task.start()

    def process_response(self, data):
        sender = self.sender()
        if sender != self.current_task: return

        self.input_field.setEnabled(True)
        self.input_field.setFocus()
        self.input_field.setPlaceholderText("💡 按住空格说话...")
        
        reply = data.get("reply", "")
        local_path = data.get("local_audio_path", "")
        
        self.chat_display.append("") 
        self.current_reply_prefix = f"<div style='color:#e67e22; margin-top:10px;'><b>Una:</b> "
        self.typewriter.start(reply)

        if local_path and os.path.exists(local_path):
            js_path = QUrl.fromLocalFile(local_path).toString()
            self.web_view.page().runJavaScript(f"window.playVoice('{js_path}')")

    def _stop_js_voice(self):
        self.web_view.page().runJavaScript("window.stopVoice()")

    def _update_text_ui(self, current_text):
        cursor = self.chat_display.textCursor()
        cursor.movePosition(cursor.End)
        cursor.movePosition(cursor.StartOfBlock, cursor.KeepAnchor)
        cursor.removeSelectedText()
        cursor.insertHtml(f"{self.current_reply_prefix}{current_text}</div>")
        self.chat_display.moveCursor(cursor.End)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    win = UnaHealingApp()
    win.show()
    sys.exit(app.exec_())