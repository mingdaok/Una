from PyQt5.QtCore import QTimer, QObject, pyqtSignal

class TypewriterEffect(QObject):
    char_stepped = pyqtSignal(str) # 每蹦一个字发一次信号

    def __init__(self, interval=50):
        super().__init__()
        self.timer = QTimer()
        self.timer.timeout.connect(self._on_timeout)
        self.text = ""
        self.index = 0
        self.interval = interval

    def start(self, text):
        self.stop() # 先停掉旧的
        self.text = text
        self.index = 0
        self.timer.start(self.interval)

    def stop(self):
        self.timer.stop()

    def _on_timeout(self):
        if self.index < len(self.text):
            self.index += 1
            # 发送当前已显示的所有文字
            self.char_stepped.emit(self.text[:self.index])
        else:
            self.timer.stop()