# UNA - AI 虚拟治愈伴侣 (Virtual Healing Companion)

## 本地实时语音通话

实时语音通话是独立于 Live2D 的轻量页面，共享现有账号、对话历史、用户画像和长期记忆。建议依次打开三个 PowerShell 窗口：

```powershell
cd 'PATH\TO\GPT-SoVITS\GPT-SoVITS'
& '.\gptsovits_env\Scripts\python.exe' api_v2.py
```

```powershell
cd 'PATH\TO\Una'
python backend/main_server.py
```

开发模式再启动前端：

```powershell
cd frontend_react
npm run dev
```

- 开发入口：`http://127.0.0.1:5173/?view=voice`
- FastAPI 发布入口：`http://127.0.0.1:8000/?view=voice`
- 启动 GPT-SoVITS 后应确认日志显示 CUDA 可用，并确保 `config.yaml` 的 `output_sample_rate` 与实际模型输出一致。
- 语音页不会加载 PixiJS、Live2D 模型、动作系统或 Rhubarb；返回普通 UNA 页面后才按需加载 Live2D 运行库。

<div align="center">
  <img src="https://via.placeholder.com/150/5dade2/FFFFFF?text=UNA+AI" alt="Una Logo" width="120">
  <br>
  <b>不仅仅是一个聊天机器人，更是一个拥有 Live2D 形象、长期情感记忆、超低延迟流式语音和多模态能力的专属 AI 伴侣。</b>
</div>

---

## ✨ 核心特性 | Key Features

### 🗣️ 超低延迟的“拟真”语音流式交互
- **句级流式截流 (Sentence-Level Streaming)**：大模型逐字输出时，后端智能地“逢标点（强弱皆可）断句”，第一时间推送文字并异步并行启动 TTS，做到“秒出字、紧跟着出声”。
- **有序并行列车消费**：后端多图层并发生成音频碎片，前端通过严格的队列**下标游标 (Chunk Index)** 控制，确保音频和文字丝滑连播，即使高频聊天也不会乱序或卡顿。

### 👄 精确的 Live2D 音素唇形同步与情绪引擎
- **Rhubarb Lip-Sync**：系统自动调用 Rhubarb 将生成的 `.wav` 音轨提炼出精确的动作唇形时间轴 (Visemes)，并推给前端的 Live2D（Hiyori模型）。
- **情境动作编排**：大模型自动在回复中吐出符合当前语境的情感动作标签（如 `EMOTION: happy` / `shy` / `sad`），实时控制前段虚拟主播的姿势和表情。

### 🧠 主动思考与动态情感长期记忆 (RAG)
- **用户画像捕捉**：随着聊天的深入，Una 会不经意地提取你的“新设定”（名字、职业、喜好）并自动存入或更新画像。
- **触发式与超时空回应**：
  - **沉默打破 (Nudge)**：当用户挂机超过设定时间，Una 会极为轻柔地主动搭话。
  - **久别重逢**：当用户下线十多个小时再次上线时，Una 能够感知到现实世界的时间流逝并致以不同时间段的早晚安问候。
- **危机干预与情绪折线图**：持续性的负面情绪触发情绪底线，她会主动安抚并转换话题。同时会自动绘制多日心情走势变化图推给前端呈现。

### 📸 视觉多模态能力 (Vision)
- 用户向 Una 发送图片（随手拍），Una 会调用大语言视觉模型（基于 Qwen2.5-VL-72B）扮演第一人称的口吻，在秒级用语音给出 30-50 字的极具情绪反馈的评价。

### 📓 她的私生活：AI 日记与自动朋友圈
- **定时调度器 (APScheduler)** 日夜运作。
- **自动手账**：每天晚上（如 23:30），Una 会根据你们今天一整天的谈话生成一篇充满少女感和内心情感记录的**私人日记**。
- **智能动态发布**：在每天定点（早、中、晚），Una 甚至会自动更新属于她自己的“朋友圈 / 动态”，还会根据当时的心情配上相对应的 Emoji 和情绪标签。

---

## 🏗️ 架构总览 | Architecture

本项目采用了**高度解耦的前后端分离架构**，以及大量的 WebSocket 异步双工链路。

### 🖥️ 后端 (Backend Engine)
- **框架**: `Python` + `FastAPI` + `uvicorn`
- **大核心 (Brain)**: 硅基流动 DeepSeek-V2.5 API 控制对话与理解逻辑。
- **视觉 (Vision)**: 硅基流动 Qwen2.5-VL-72B-Instruct 提供快速图片认知。
- **声音 (TTS)**: 高度集成本地化配置的 **GPT-SoVITS**（自定义音色模型训练），若服务无响应或失败则自动无感降级到微软 **Edge-TTS**。
- **识音 (ASR)**: 阿里 SenseVoice 模型。
- **记忆层 (Memory)**: ChromaDB (向量库用于长文本概念检索) + SQLite (结构化存放画像、聊天记录及日记和社交动态)。

### 📱 前端 (Frontend App)
- **框架**: `React 18` + `Vite`
- **核心组件**:
  - `useUnaCore.js`: 高阶的 WebSocket 保活心跳防丢失设计和负责维护乱序音频排队的 `Chunk List` 技术。
  - `Live2DViewer.jsx`: 使用 `PixiJS` + `Live2DCubismSDK` 操作虚拟皮套。
  - `DiaryBook & WallGallery`: 移动端兼容友好的回忆墙与朋友圈交互组件。

---

## 📂 核心代码目录结构 | Project Structure

```text
Una/
├── backend/                       # Python FastAPI 后端
│   ├── main_server.py             # 核心服务主入口 (路由、WS通信、定时器)
│   ├── brain_engine.py            # AI 大脑核心引擎 (流式截流、危机拦截等)
│   ├── tts_service.py             # GPT-SoVITS / Edge-TTS 调度与 Rhubarb 对齐生成
│   ├── vision_service.py          # 视觉多模态模型看图驱动支持
│   ├── asr_engine.py              # ASR 语音识别
│   ├── diary_service.py           # 根据聊天记录生成日常日记
│   ├── social_api.py & db         # 朋友圈和平台生态系统的 API/数据库支持
│   ├── memory/                    # RAG 记忆向量提取、召回功能模块
│   └── static/                    # 存放前端编译产物及语音包、资源
├── frontend_react/                # React 移动端/桌面端项目
│   ├── src/
│   │   ├── components/            # React 组件层 (Live2D、展示墙)
│   │   ├── hooks/                 # 自定义钩子如 useUnaCore.js (核心WS链路)
│   │   ├── App.jsx
│   │   └── index.css
│   ├── dist/                      # `npm run build` 出的静态产物 (挂载向后端)
│   └── vite.config.js
├── README.md                      # 本文档
├── config.yaml                    # AI Token、数据库与外部模型配置池
└── start.py                       # 开发环境/发布模式一键启动脚本
```

---

## 🚀 部署与运行 | Getting Started

### 1. 配置环境 (Configuration)
复制 `config.example.yaml` 为 `config.yaml`，再填写你自己的 API 密钥、GPT-SoVITS 地址和参考音频路径。真实的 `config.yaml`、数据库、长期记忆和用户媒体均已被 Git 忽略，请勿强制提交。

### 2. 启动前端 (Frontend Development)
```bash
cd frontend_react
npm install
npm run dev
```

### 3. 启动后端 (Backend Runtime)
确保你安装了 Python 3.10+ 和相关的依赖。需要下载 FFmpeg、Rhubarb 进系统 PATH。
```bash
pip install -r requirements.txt
python start.py
```
*`start.py` 会负责拉起主服务应用和处理前端资源的搬运调度*。

---

## 🎉 未来规划 | Roadmap
- [x] 多模态（识图）实现。
- [x] 毫秒级唇形精准同步。
- [x] 流式 TTS 与句首高优先级出声列车算法。
- [ ] 更复杂的外部技能生态系统（帮看天气、备忘录等）。
- [ ] Android / iOS 重原生封装 (React Native / Uniapp) 的 App 化。

> **免责声明**: 本产品由于涉及到心理情绪疗愈干预等行为，内置的大量指导 prompt 设置并不具备真实的临床医疗指导资格，仅限于技术及情感陪伴交流之用途。
