import WallGallery from './components/WallGallery';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, LogIn, ArrowLeft, Volume2, Wifi, WifiOff, FastForward, Camera, Users } from 'lucide-react';
import DiaryBook from './components/DiaryBook';
import Live2DViewer from './components/Live2DViewer';
import SocialFeed from './components/social/SocialFeed';
import WeChatContacts from './components/social/WeChatContacts';
// 🔥 修复 1: 引用合并后的正确文件 (去掉 Fixed)
import { useUnaCore } from './hooks/useUnaCore';
import { useVision } from './hooks/useVision';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { getApiBase } from './config';
import { authFetch, authenticate, clearSession, getSession, refreshSession } from './auth/session';

export default function App() {
  // 🌍 动态获取 API 地址
  const isPlus = window.plus || navigator.userAgent.indexOf("Html5Plus") > -1 || window.location.protocol === 'file:';
  const apiBase = getApiBase();

  // 🔥 修复 2: 定义资源基础路径 (解决视频/图片引用报错)
  const baseUrl = import.meta.env.BASE_URL || "./";

  const [user, setUser] = useState(getSession()?.user || null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!getSession()?.access_token);
  const [inputUser, setInputUser] = useState("");
  const [inputPwd, setInputPwd] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState("");

  const [scene, setScene] = useState('living');
  const [isBookTransitioning, setIsBookTransitioning] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [showSocial, setShowSocial] = useState(false);  // 朋友圈
  const [showChat, setShowChat] = useState(false);    // WeChat 聊天

  const videoRef = useRef(null);

  // 核心 Hooks
  const {
    messages, setMessages, sendMessage, sendAudioData, sendImage,
    lipValue, interrupt, playAudio, connectionStatus, replayChunks,
    sendStopSignal, motionEvent, motionGeneration
  } = useUnaCore(isLoggedIn);

  // 第二个参数 sendStopSignal：录音停止并发送完音频后，自动向后端发 stop 触发识别
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(sendAudioData, sendStopSignal);
  const [text, setText] = useState("");

  // 📸 工具：补全音频 URL（解决 App 环境下相对路径无法播放的问题）
  const formatAudioUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path; // 已是完整地址，直接用
    // App 环境下，相对路径必须补全域名
    if (apiBase) return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;
    return path; // Web 环境保留相对路径
  };

  // 📸 视觉功能核心逻辑
  const { pickImage } = useVision(async (base64Image) => {
    // 1. 先把图片发给 WebSocket (在聊天界面显示)
    sendImage(base64Image);

    console.log("📤 [Frontend] 正在发送视觉请求...");
    try {
      const res = await authFetch('/api/vision_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, text: "" })
      });

      const data = await res.json();
      console.log("📥 [Frontend] 收到视觉回复:", data);

      if (!res.ok) throw new Error(data.detail || '视觉请求失败');
    } catch (e) {
      console.error("❌ 视觉请求失败:", e);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '（哎呀，我看不太清...可能网络断了）',
        isAI: true,
        date: new Date()
      }]);
    }
  });

  const isStudy = scene === 'study';

  useEffect(() => {
    if (!getSession()?.refresh_token) return;
    refreshSession().then(next => {
      if (next) {
        setUser(next.user);
        setIsLoggedIn(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!inputUser.trim() || !inputPwd) {
      setAuthError("请输入账号和密码");
      return;
    }
    try {
      setAuthError("");
      const next = await authenticate(inputUser, inputPwd, isRegisterMode);
      setUser(next.user);
      setIsLoggedIn(true);
    } catch (error) {
      setAuthError(error.message || "认证失败");
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setUser(null);
    setMessages([]);
  };

  const handleMicStart = () => {
    interrupt();
    startRecording();
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText('');
  };

  const handleOpenBook = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.error(e));
    }
    setIsBookTransitioning(true);
  };

  const handleVideoEnd = () => {
    setIsBookTransitioning(false);
    setIsBookOpen(true);
  };

  // 跳过视频动画
  const handleSkipVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsBookTransitioning(false);
    setIsBookOpen(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${baseUrl}assets/bg_living.jpg)` }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-10 bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl w-[80%] max-w-[320px] backdrop-blur-md">
          <h1 className="text-3xl text-white font-serif text-center mb-2">Una</h1>
          <p className="text-center text-white/60 text-sm mb-5">{isRegisterMode ? '创建你的私有 UNA' : '登录你的私有 UNA'}</p>
          <div className="space-y-4">
            <input value={inputUser} onChange={e => setInputUser(e.target.value)} placeholder="账号" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none" />
            <input type="password" value={inputPwd} onChange={e => setInputPwd(e.target.value)} placeholder="密码" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none" />
            {authError && <p className="text-red-200 text-sm text-center">{authError}</p>}
            <button onClick={handleLogin} className="w-full bg-gradient-to-r from-[#8d6e63] to-[#5d4037] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><LogIn size={18} /> {isRegisterMode ? '注册并进入' : '登录'}</button>
            <button onClick={() => { setIsRegisterMode(value => !value); setAuthError(''); }} className="w-full text-white/70 text-sm py-1">
              {isRegisterMode ? '已有账号？去登录' : '没有账号？立即注册'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black w-screen h-screen overflow-hidden font-sans relative select-none">

      {/* 客厅场景 */}
      <AnimatePresence>
        {!isStudy && (
          <motion.div
            key="living"
            className="absolute inset-0 w-full h-full z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="fixed inset-0 bg-cover bg-center z-0 pointer-events-none" style={{ backgroundImage: `url(${baseUrl}assets/bg_living.jpg)` }} />
            <Live2DViewer
              lipValue={lipValue}
              emotion={[...messages].reverse().find(message => message.isAI)?.emotion}
              motionEvent={motionEvent}
              motionGeneration={motionGeneration}
              actionOverride={motionEvent}
            />

            <div className="absolute top-4 right-4 z-50">
              {connectionStatus === 'OPEN' ? <Wifi size={16} className="text-green-400/50" /> : <WifiOff size={16} className="text-red-500" />}
            </div>
            <div onClick={() => setScene('study')} className="absolute top-[10%] right-[5%] w-[35%] h-[40%] z-20 active:bg-white/10 transition-colors" />
            <button onClick={handleLogout} className="absolute top-4 left-4 z-30 text-white/30 text-xs">退出</button>

            {messages.length > 0 && (
              <div className="absolute bottom-[18%] w-full flex justify-center z-30 pointer-events-none">
                <div
                  onClick={() => {
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg.isAI) {
                      if (lastMsg.chunkList && lastMsg.chunkList.length > 0) {
                        replayChunks(lastMsg.chunkList);
                      } else if (lastMsg.audio_url) {
                        playAudio(lastMsg.audio_url, lastMsg.visemes || []);
                      }
                    }
                  }}
                  className={`
                        pointer-events-auto backdrop-blur px-5 py-3 rounded-2xl text-sm max-w-[85%] shadow-lg border transition-all duration-300 flex items-center gap-2
                        ${messages[messages.length - 1].isAI ? 'bg-white/90 text-[#5d4037] border-[#d7ccc8]' : 'bg-black/60 text-white border-white/20'}
                    `}
                >
                  <span>{messages[messages.length - 1].text}</span>
                  {messages[messages.length - 1].isAI && <Volume2 size={14} className="text-[#8d6e63] min-w-[14px]" />}
                </div>
              </div>
            )}

            <div className="absolute bottom-0 w-full p-4 z-30 pt-4 bg-gradient-to-t from-black/60 to-transparent flex gap-3 items-center">
              <div className="flex-1 bg-white/20 backdrop-blur rounded-full flex items-center border border-white/10">

                {/* 📸 相机按钮 */}
                <button
                  onClick={pickImage}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
                  title="发照片"
                >
                  <Camera size={24} />
                </button>

                <input value={text} onChange={e => setText(e.target.value)} className="w-full bg-transparent px-4 py-2 text-white outline-none placeholder-white/50" placeholder="和 Una 聊聊..." />
              </div>
              <button onMouseDown={handleMicStart} onMouseUp={stopRecording} onTouchStart={handleMicStart} onTouchEnd={stopRecording}
                className={`p-3 rounded-full text-white shadow-lg ${isRecording ? 'bg-pink-500 scale-110' : 'bg-white/20'}`}>
                <Mic size={20} />
              </button>
              <button onClick={handleSend} className="bg-[#8d6e63] p-3 rounded-full text-white shadow-lg"><Send size={20} /></button>
              {/* 🌸 朋友圈入口 */}
              <button
                onClick={() => setShowSocial(true)}
                className="p-3 rounded-full text-white shadow-lg bg-white/20 active:scale-90 transition-transform"
                title="朋友圈"
              >
                <Users size={20} />
              </button>
              {/* 💬 WeChat 聊天入口 */}
              <button
                onClick={() => setShowChat(true)}
                className="p-3 rounded-full text-white shadow-lg bg-pink-500/80 hover:bg-pink-500 active:scale-90 transition-transform"
                title="和 UNA 聊天"
              >
                💬
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === 书房场景 === */}
      {isStudy && (
        <motion.div
          key="study"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            width: '100vh', height: '100vw',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            zIndex: 50,
            backgroundColor: '#2c241b',
          }}
        >
          <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${baseUrl}assets/bg_study.jpg)` }} />
          <WallGallery isStudy={true} userId={user?.id} />

          {!isBookOpen && !isBookTransitioning && (
            <button onClick={() => setScene('living')} className="absolute top-6 left-6 z-50 bg-black/40 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm border border-white/10">
              <ArrowLeft size={20} /> 回到客厅
            </button>
          )}

          {!isBookOpen && !isBookTransitioning && (
            <img
              src={`${baseUrl}assets/prop_diary_closed.png`}
              alt="Diary"
              onClick={handleOpenBook}
              style={{ bottom: '0%', right: '52%', width: '27%' }}
              className="absolute cursor-pointer z-30 drop-shadow-2xl hover:scale-105 transition-transform origin-bottom-right"
            />
          )}

          {/* 视频容器 */}
          <div
            className={`absolute inset-0 z-40 flex items-center justify-center transition-all duration-700 ease-in-out ${isBookTransitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <video
              ref={videoRef}
              src={`${baseUrl}assets/book_opening.mp4`}
              playsInline
              preload="none"
              onEnded={handleVideoEnd}
              className="relative z-50 w-[80%] max-w-[800px] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
            />

            <button
              onClick={handleSkipVideo}
              className="absolute bottom-10 right-10 z-50 flex items-center gap-1 text-white/50 hover:text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full backdrop-blur-md transition-all text-xs tracking-wider"
            >
              跳过动画 <FastForward size={14} />
            </button>
          </div>

          <AnimatePresence>
            {isBookOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
              >
                <DiaryBook messages={messages} onClose={() => setIsBookOpen(false)} playAudio={playAudio} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 🌸 朋友圈全屏页面 */}
      <AnimatePresence>
        {showSocial && (
          <motion.div
            key="social"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28 }}
            className="fixed inset-0 z-[100]"
          >
            <SocialFeed
              currentUserId={user?.id}
              currentUserName={user?.username}
              apiBase={apiBase}
              onClose={() => setShowSocial(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 WeChat 聊天全屏页面 */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            key="chat"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28 }}
            className="fixed inset-0 z-[100]"
          >
            <WeChatContacts
              currentUserId={user?.id}
              currentUserName={user?.username}
              apiBase={apiBase}
              onClose={() => setShowChat(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
