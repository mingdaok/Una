from PyQt5.QtCore import QTimer, QObject, pyqtSignal

class InteractionManager(QObject):
    """
    交互中控：
    1. 缓冲用户输入 (5s)
    2. 发送打断信号给 UI，让 UI 去调 JS 停止音频
    """
    user_speech_finalized = pyqtSignal(str) # 说话结束信号
    interrupt_signal = pyqtSignal()         # 打断信号

    def __init__(self, wait_interval=5000):
        super().__init__()
        self.wait_interval = wait_interval
        self.buffer = []
        self.timer = QTimer()
        self.timer.setSingleShot(True)
        self.timer.timeout.connect(self._emit_final_text)

    def handle_new_input(self, text):
        # 1. 只要用户一开口，先发信号让 Una 闭嘴
        self.interrupt_signal.emit()
        
        # 2. 存入缓冲区
        clean_text = text.strip()
        if clean_text:
            self.buffer.append(clean_text)
        
        # 3. 重置倒计时
        self.timer.start(self.wait_interval)

    def _emit_final_text(self):
        if self.buffer:
            combined_text = "，".join(self.buffer)
            self.user_speech_finalized.emit(combined_text)
            self.buffer = [] # 清空