# UNA - AI Virtual Healing Companion (AI 虚拟治愈伴侣)

<div align="center">
  <img src="https://via.placeholder.com/150/5dade2/FFFFFF?text=UNA+AI" alt="Una Logo" width="120">
  <br>
  <b>一个拥有 Live2D 形象、情感记忆和语音交互能力的桌面 AI 伴侣</b>
</div>

## 📖 项目简介 | Introduction

Una 是一个基于本地运行的 AI 陪伴系统。她不仅仅是一个聊天机器人，她拥有：
- **生动的形象**：通过集成 Live2D 模型，支持口型同步 (Lip-Sync) 和动作交互。
- **温暖的声音**：利用微软 Edge-TTS 技术，提供情感丰富的语音回复。
- **长期的记忆**：基于 SQLite 数据库，她能记住你们的过往对话和情绪波动。
- **危机干预**：内置心理危机识别机制，提供温暖的引导与支持。

项目采用 **前后端分离** 架构：
- **后端 (Brain)**: Python FastAPI + DeepSeek (SiliconFlow) + Edge-TTS
- **客户端 (Body)**: PyQt5 + QWebEngineView (嵌入式浏览器)
- **前端 (Face)**: HTML5 + PixiJS + Live2D Cubism SDK

## 📂 目录结构 | Project Structure

```text
UNA/
├── backend/             # [大脑] 后端服务
│   ├── main_server.py   # 启动入口 (FastAPI)
│   ├── brain_engine.py  # AI 核心逻辑
│   ├── una_memory.db    # 记忆数据库 (自动生成)
│   └── ...
├── client/              # [身体] 桌面客户端
│   ├── una_healing_pro.py # 启动入口 (PyQt5)
│   ├── interaction_manager.py # 交互中控
│   └── ...
├── frontend/            # [面孔] Live2D 展示层
│   ├── index.html       # 模型渲染核心
│   ├── assets/          # JS 依赖库
│   └── Resources/       # Live2D 模型文件 (如 Hiyori, LLNY)
├── static/              # [公共资源]
│   └── voice/           # 语音缓存目录
├── config.yaml          # 全局配置文件
└── requirements.txt     # 项目依赖