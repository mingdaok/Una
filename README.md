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

Una
├─ .env.example
├─ 11.py
├─ backend
│  ├─ asr_engine.py
│  ├─ brain_engine.py
│  ├─ daily_life.py
│  ├─ data
│  │  └─ chroma_db
│  │     ├─ 01059d5c-bcbf-4056-b81a-a38a18a5080a
│  │     │  ├─ data_level0.bin
│  │     │  ├─ header.bin
│  │     │  ├─ length.bin
│  │     │  └─ link_lists.bin
│  │     ├─ 2f743b10-7945-4c10-9c99-2af00e5047db
│  │     │  ├─ data_level0.bin
│  │     │  ├─ header.bin
│  │     │  ├─ length.bin
│  │     │  └─ link_lists.bin
│  │     ├─ 42341a55-6938-41aa-abd0-12c367dad9b5
│  │     │  ├─ data_level0.bin
│  │     │  ├─ header.bin
│  │     │  ├─ length.bin
│  │     │  └─ link_lists.bin
│  │     ├─ 464a6ecc-220e-4dcd-8506-9ac6b98f1474
│  │     │  ├─ data_level0.bin
│  │     │  ├─ header.bin
│  │     │  ├─ length.bin
│  │     │  └─ link_lists.bin
│  │     ├─ chroma.sqlite3
│  │     └─ edc6bbec-bfa2-4c61-9a36-3a6f2e090958
│  │        ├─ data_level0.bin
│  │        ├─ header.bin
│  │        ├─ length.bin
│  │        └─ link_lists.bin
│  ├─ database.py
│  ├─ diary_service.py
│  ├─ main_server.py
│  ├─ memories.json
│  ├─ memory
│  │  ├─ service.py
│  │  ├─ vector_db.py
│  │  ├─ __init__.py
│  │  └─ __pycache__
│  │     ├─ service.cpython-311.pyc
│  │     ├─ vector_db.cpython-311.pyc
│  │     └─ __init__.cpython-311.pyc
│  ├─ server.py
│  ├─ static
│  │  ├─ libs
│  │  │  ├─ core_v4.js
│  │  │  ├─ live2dcubismcore.min.js
│  │  │  ├─ live2d_fix.js
│  │  │  ├─ live2d_plugin_v040.js
│  │  │  ├─ live2d_plugin_v4.js
│  │  │  ├─ pixi.min.js
│  │  │  ├─ pixi_v533.js
│  │  │  ├─ pixi_v5_final.js
│  │  │  └─ plugin_v040.js
│  │  ├─ live2d
│  │  │  └─ hiyori
│  │  │     ├─ hiyori_pro_mic.2048
│  │  │     │  ├─ texture_00.png
│  │  │     │  └─ texture_01.png
│  │  │     ├─ hiyori_pro_mic.cdi3.json
│  │  │     ├─ hiyori_pro_mic.moc3
│  │  │     ├─ hiyori_pro_mic.model3.json
│  │  │     ├─ hiyori_pro_mic.physics3.json
│  │  │     ├─ hiyori_pro_mic.pose3.json
│  │  │     ├─ hiyori_pro_mic.userdata3.json
│  │  │     └─ motions
│  │  │        ├─ Hiyori_m01.motion3.json
│  │  │        ├─ Hiyori_m02.motion3.json
│  │  │        ├─ Hiyori_m03.motion3.json
│  │  │        ├─ Hiyori_m04.motion3.json
│  │  │        ├─ Hiyori_m05.motion3.json
│  │  │        ├─ Hiyori_m06.motion3.json
│  │  │        ├─ Hiyori_m07.motion3.json
│  │  │        ├─ Hiyori_m08.motion3.json
│  │  │        ├─ Hiyori_m09.motion3.json
│  │  │        ├─ Hiyori_m10.motion3.json
│  │  │        ├─ micoff.motion3.json
│  │  │        ├─ micon.motion3.json
│  │  │        └─ singing.motion3.json
│  │  ├─ mobile
│  │  │  ├─ assets
│  │  │  │  ├─ bg_living.jpg
│  │  │  │  ├─ bg_study.jpg
│  │  │  │  ├─ book_opening.mp4
│  │  │  │  ├─ index-CDENEwwj.js
│  │  │  │  ├─ index-CTnhryUk.css
│  │  │  │  ├─ live2d
│  │  │  │  │  └─ hiyori
│  │  │  │  │     ├─ hiyori_pro_mic.2048
│  │  │  │  │     │  ├─ texture_00.png
│  │  │  │  │     │  └─ texture_01.png
│  │  │  │  │     ├─ hiyori_pro_mic.cdi3.json
│  │  │  │  │     ├─ hiyori_pro_mic.moc3
│  │  │  │  │     ├─ hiyori_pro_mic.model3.json
│  │  │  │  │     ├─ hiyori_pro_mic.physics3.json
│  │  │  │  │     ├─ hiyori_pro_mic.pose3.json
│  │  │  │  │     ├─ hiyori_pro_mic.userdata3.json
│  │  │  │  │     └─ motions
│  │  │  │  │        ├─ Hiyori_m01.motion3.json
│  │  │  │  │        ├─ Hiyori_m02.motion3.json
│  │  │  │  │        ├─ Hiyori_m03.motion3.json
│  │  │  │  │        ├─ Hiyori_m04.motion3.json
│  │  │  │  │        ├─ Hiyori_m05.motion3.json
│  │  │  │  │        ├─ Hiyori_m06.motion3.json
│  │  │  │  │        ├─ Hiyori_m07.motion3.json
│  │  │  │  │        ├─ Hiyori_m08.motion3.json
│  │  │  │  │        ├─ Hiyori_m09.motion3.json
│  │  │  │  │        ├─ Hiyori_m10.motion3.json
│  │  │  │  │        ├─ micoff.motion3.json
│  │  │  │  │        ├─ micon.motion3.json
│  │  │  │  │        └─ singing.motion3.json
│  │  │  │  ├─ prop_diary_closed.png
│  │  │  │  ├─ readme.txt
│  │  │  │  └─ wall_frame.png
│  │  │  ├─ charts
│  │  │  │  └─ mood_mingdaok_141557.png
│  │  │  ├─ diary_images
│  │  │  │  ├─ diary_1771080867.jpg
│  │  │  │  ├─ diary_1771082024.jpg
│  │  │  │  ├─ diary_1771082780.jpg
│  │  │  │  └─ diary_1771311243.jpg
│  │  │  ├─ favicon.ico
│  │  │  ├─ index.html
│  │  │  └─ libs
│  │  │     ├─ core_v4.js
│  │  │     ├─ live2d_plugin_v4.js
│  │  │     └─ pixi_v533.js
│  │  └─ voice
│  │     ├─ 00aed93d-8fb3-434f-baf7-d055ecd01393.mp3
│  ├─ temp_guest.wav
│  ├─ temp_input.wav
│  ├─ temp_mingdaok.wav
│  ├─ temp_mingdaok_16k.wav
│  ├─ test.wav
│  ├─ una_memory.db
│  ├─ utils
│  │  ├─ chart_utils.py
│  │  ├─ emotion_mapper.py
│  │  ├─ __init__.py
│  │  └─ __pycache__
│  │     ├─ chart_utils.cpython-311.pyc
│  │     ├─ emotion_mapper.cpython-311.pyc
│  │     └─ __init__.cpython-311.pyc
│  ├─ vision_service.py
│  └─ __pycache__
│     ├─ asr_engine.cpython-311.pyc
│     ├─ brain_engine.cpython-311.pyc
│     ├─ database.cpython-311.pyc
│     ├─ diary_service.cpython-311.pyc
│     ├─ utils.cpython-311.pyc
│     └─ vision_service.cpython-311.pyc
├─ config.yaml
├─ frontend_react
│  ├─ .env.development
│  ├─ .env.production
│  ├─ dist
│  │  ├─ assets
│  │  │  ├─ bg_living.jpg
│  │  │  ├─ bg_study.jpg
│  │  │  ├─ book_opening.mp4
│  │  │  ├─ index-BIzJYfBV.js
│  │  │  ├─ index-BTNcEbT9.css
│  │  │  ├─ live2d
│  │  │  │  └─ hiyori
│  │  │  │     ├─ hiyori_pro_mic.2048
│  │  │  │     │  ├─ texture_00.png
│  │  │  │     │  └─ texture_01.png
│  │  │  │     ├─ hiyori_pro_mic.cdi3.json
│  │  │  │     ├─ hiyori_pro_mic.moc3
│  │  │  │     ├─ hiyori_pro_mic.model3.json
│  │  │  │     ├─ hiyori_pro_mic.physics3.json
│  │  │  │     ├─ hiyori_pro_mic.pose3.json
│  │  │  │     ├─ hiyori_pro_mic.userdata3.json
│  │  │  │     └─ motions
│  │  │  │        ├─ Hiyori_m01.motion3.json
│  │  │  │        ├─ Hiyori_m02.motion3.json
│  │  │  │        ├─ Hiyori_m03.motion3.json
│  │  │  │        ├─ Hiyori_m04.motion3.json
│  │  │  │        ├─ Hiyori_m05.motion3.json
│  │  │  │        ├─ Hiyori_m06.motion3.json
│  │  │  │        ├─ Hiyori_m07.motion3.json
│  │  │  │        ├─ Hiyori_m08.motion3.json
│  │  │  │        ├─ Hiyori_m09.motion3.json
│  │  │  │        ├─ Hiyori_m10.motion3.json
│  │  │  │        ├─ micoff.motion3.json
│  │  │  │        ├─ micon.motion3.json
│  │  │  │        └─ singing.motion3.json
│  │  │  ├─ prop_diary_closed.png
│  │  │  ├─ readme.txt
│  │  │  └─ wall_frame.png
│  │  ├─ favicon.ico
│  │  ├─ index.html
│  │  └─ libs
│  │     ├─ core_v4.js
│  │     ├─ live2dcubismcore.min.js
│  │     ├─ live2d_fix.js
│  │     ├─ live2d_plugin_v040.js
│  │     ├─ live2d_plugin_v4.js
│  │     ├─ pixi.min.js
│  │     ├─ pixi_v533.js
│  │     ├─ pixi_v5_final.js
│  │     └─ plugin_v040.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  │  ├─ assets
│  │  │  ├─ bg_living.jpg
│  │  │  ├─ bg_study.jpg
│  │  │  ├─ book_opening.mp4
│  │  │  ├─ live2d
│  │  │  │  └─ hiyori
│  │  │  │     ├─ hiyori_pro_mic.2048
│  │  │  │     │  ├─ texture_00.png
│  │  │  │     │  └─ texture_01.png
│  │  │  │     ├─ hiyori_pro_mic.cdi3.json
│  │  │  │     ├─ hiyori_pro_mic.moc3
│  │  │  │     ├─ hiyori_pro_mic.model3.json
│  │  │  │     ├─ hiyori_pro_mic.physics3.json
│  │  │  │     ├─ hiyori_pro_mic.pose3.json
│  │  │  │     ├─ hiyori_pro_mic.userdata3.json
│  │  │  │     └─ motions
│  │  │  │        ├─ Hiyori_m01.motion3.json
│  │  │  │        ├─ Hiyori_m02.motion3.json
│  │  │  │        ├─ Hiyori_m03.motion3.json
│  │  │  │        ├─ Hiyori_m04.motion3.json
│  │  │  │        ├─ Hiyori_m05.motion3.json
│  │  │  │        ├─ Hiyori_m06.motion3.json
│  │  │  │        ├─ Hiyori_m07.motion3.json
│  │  │  │        ├─ Hiyori_m08.motion3.json
│  │  │  │        ├─ Hiyori_m09.motion3.json
│  │  │  │        ├─ Hiyori_m10.motion3.json
│  │  │  │        ├─ micoff.motion3.json
│  │  │  │        ├─ micon.motion3.json
│  │  │  │        └─ singing.motion3.json
│  │  │  ├─ prop_diary_closed.png
│  │  │  ├─ readme.txt
│  │  │  └─ wall_frame.png
│  │  ├─ favicon.ico
│  │  └─ libs
│  │     ├─ core_v4.js
│  │     ├─ live2dcubismcore.min.js
│  │     ├─ live2d_fix.js
│  │     ├─ live2d_plugin_v040.js
│  │     ├─ live2d_plugin_v4.js
│  │     ├─ pixi.min.js
│  │     ├─ pixi_v533.js
│  │     ├─ pixi_v5_final.js
│  │     └─ plugin_v040.js
│  ├─ src
│  │  ├─ App.jsx
│  │  ├─ components
│  │  │  ├─ DiaryBook.jsx
│  │  │  ├─ Live2DViewer.jsx
│  │  │  ├─ Live2DViewer.jsx.bak
│  │  │  ├─ WallGallery.css
│  │  │  ├─ WallGallery.jsx
│  │  │  └─ WallGallery.jsx.bak
│  │  ├─ hooks
│  │  │  ├─ useAudioRecorder.js
│  │  │  ├─ useUnaCore.js
│  │  │  ├─ useUnaCoreFixed.js
│  │  │  └─ useVision.js
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  └─ utils
│  │     └─ timeUtils.js
│  ├─ tailwind.config.js
│  ├─ vite.config.js
│  └─ vite.config.js.bak
├─ README.md
├─ requirements.txt
├─ start.py
├─ static
│  ├─ mobile
│  │  └─ diary_images
│  │     └─ diary_1771078324.jpg
│  ├─ mood_chart.png
│  └─ voice
└─ __pycache__
   ├─ brain_engine.cpython-311.pyc
   ├─ crisis_dialog.cpython-311.pyc
   ├─ database.cpython-311.pyc
   ├─ interaction_manager.cpython-311.pyc
   ├─ run_fixed.cpython-311.pyc
   ├─ run_fixed_all.cpython-311.pyc
   ├─ run_single_thread.cpython-311.pyc
   ├─ run_windows.cpython-311.pyc
   ├─ run_with_mouse.cpython-311.pyc
   ├─ ui_effects.cpython-311.pyc
   ├─ una_chat_task.cpython-311.pyc
   └─ utils.cpython-311.pyc

```