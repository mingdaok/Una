from PyQt5.QtWidgets import QDialog, QVBoxLayout, QLabel, QPushButton
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QColor, QPalette

class CrisisDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("🔴 紧急求助提醒")
        self.setFixedSize(400, 200)
        self.setWindowModality(Qt.ApplicationModal)
        layout = QVBoxLayout(self)
        
        lbl = QLabel("感受到你的痛苦，请记住你并不孤单。\n拨打热线：12345 (24h)", self)
        lbl.setAlignment(Qt.AlignCenter)
        btn = QPushButton("我会照顾好自己", self)
        btn.clicked.connect(self.accept)
        
        layout.addWidget(lbl)
        layout.addWidget(btn)