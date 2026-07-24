/**
 * WeChatChat.jsx
 * UNA WeChat 风格聊天界面
 * 支持好友 Props + 从后端拉取真实历史记录
 */
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Smile } from "lucide-react";
import { authFetch } from "../../auth/session";

export default function WeChatChat({
  currentUserId,
  currentUserName,
  friendId = "ai_una",     // 聊天对象 ID
  friendName = "UNA",      // 聊天对象昵称
  apiBase = "",
  onClose,  // () => void 返回上一页
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔥 从后端拉取真实的聊天历史记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await authFetch(`/api/social/chat/history?friend_id=${friendId}&limit=50`);
        if (!res.ok) throw new Error("拉取历史失败");
        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
          // 将后端历史转换为本地消息格式
          const historyMessages = data.messages.map((msg, idx) => ({
            id: idx + 1,
            sender: msg.sender,
            senderName: msg.senderName,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            type: msg.type || "text",
          }));
          setMessages(historyMessages);
        } else {
          // 没有历史记录时，首次对话显示 AI 欢迎语
          setMessages([
            {
              id: 1,
              sender: friendId,
              senderName: friendName,
              content: `你好呀！我是 ${friendName}~ 💕\n有什么想聊的吗？我随时都在哦！😊`,
              timestamp: new Date().toISOString(),
              type: "text",
            },
          ]);
        }
      } catch (e) {
        console.error("加载聊天历史失败:", e);
        // 降级：显示欢迎语
        setMessages([
          {
            id: 1,
            sender: friendId,
            senderName: friendName,
            content: `你好呀！我是 ${friendName}~ 💕\n有什么想聊的吗？我随时都在哦！😊`,
            timestamp: new Date().toISOString(),
            type: "text",
          },
        ]);
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [apiBase, currentUserId, friendId, friendName]);

  // 发送消息
  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: currentUserId,
      senderName: currentUserName || "我",
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      // 调用 AI 对话 API（社交接口）
      const res = await authFetch('/api/social/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: "wechat_chat"
        })
      });

      if (!res.ok) throw new Error("AI 回复失败");

      const data = await res.json();
      const aiMessage = {
        id: Date.now() + 1,
        sender: friendId,
        senderName: friendName,
        content: data.response || "嗯嗯，我听到了！继续说吧~ 😊",
        timestamp: new Date().toISOString(),
        type: "text"
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      console.error("发送消息失败:", e);
      const errorMessage = {
        id: Date.now() + 1,
        sender: friendId,
        senderName: friendName,
        content: "抱歉，我现在有点小问题，一会儿再来找我聊吧~ 😅",
        timestamp: new Date().toISOString(),
        type: "text"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 按 Enter 发送
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return "刚刚";
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 是否需要显示时间戳（相邻消息间隔超过 5 分钟才显示）
  const shouldShowTime = (msg, idx) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    if (!prev.timestamp || !msg.timestamp) return false;
    const prevDate = new Date(prev.timestamp);
    const curDate = new Date(msg.timestamp);
    return (curDate - prevDate) > 5 * 60 * 1000; // 5 分钟
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4]">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#ededed] border-b border-gray-200 shadow-sm shrink-0">
        <button
          onClick={onClose}
          className="p-2 -m-2 text-gray-600 hover:text-gray-800 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-pink-600">
              {friendName.slice(0, 3)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{friendName}</p>
          </div>
        </div>
        <div className="w-8" /> {/* 占位 */}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((msg, idx) => (
          <div key={msg.id} className="flex flex-col">
            {/* 时间戳（间隔超过 5 分钟才显示） */}
            {shouldShowTime(msg, idx) && (
              <div className="flex justify-center mb-2">
                <span className="text-xs text-gray-400 bg-gray-200/60 px-2 py-0.5 rounded-full">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            )}

            {/* 消息内容 */}
            <div className={`flex ${msg.sender === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-2 max-w-[70%] ${msg.sender === currentUserId ? 'flex-row-reverse' : ''}`}>
                {/* 头像 */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.sender === currentUserId
                    ? 'bg-blue-500 text-white'
                    : 'bg-pink-100 text-pink-600'
                }`}>
                  {msg.sender === currentUserId
                    ? (currentUserName || "我").slice(0, 1).toUpperCase()
                    : friendName.slice(0, 3)
                  }
                </div>

                {/* 消息气泡 */}
                <div className={`px-3 py-2.5 shadow-sm ${
                  msg.sender === currentUserId
                    ? 'bg-[#95ec69] text-gray-900 rounded-2xl rounded-br-md'
                    : 'bg-white text-gray-900 rounded-2xl rounded-bl-md'
                }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[70%]">
              <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center text-xs font-bold text-pink-600">
                {friendName.slice(0, 3)}
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-200 bg-[#f6f6f6] p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent text-[15px] max-h-32"
              rows={1}
              style={{ minHeight: '40px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              inputText.trim() && !loading
                ? 'bg-[#07c160] text-white active:bg-[#06ad56] active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
