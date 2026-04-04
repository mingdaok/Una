/**
 * WeChatChat.jsx
 * UNA WeChat 风格聊天界面
 * 白色主题，消息气泡，"小妹妹" 风格
 */
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Smile } from "lucide-react";

export default function WeChatChat({
  currentUserId,
  currentUserName,
  apiBase = "",
  onClose,  // () => void 返回上一页
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: "ai_una",
          senderName: "UNA",
          content: "你好呀！我是 UNA，你的小妹妹~ 💕\n有什么想聊的吗？我随时都在哦！😊",
          timestamp: new Date().toISOString(),
          type: "text"
        }
      ]);
    }
  }, []);

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
      const res = await fetch(`${apiBase}/api/social/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          message: userMessage.content,
          context: "wechat_chat"  // 标记为微信聊天上下文
        })
      });

      if (!res.ok) throw new Error("AI 回复失败");

      const data = await res.json();
      const aiMessage = {
        id: Date.now() + 1,
        sender: "ai_una",
        senderName: "UNA",
        content: data.response || "嗯嗯，我听到了！继续说吧~ 😊",
        timestamp: new Date().toISOString(),
        type: "text"
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      console.error("发送消息失败:", e);
      const errorMessage = {
        id: Date.now() + 1,
        sender: "ai_una",
        senderName: "UNA",
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
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // 1分钟内
      return "刚刚";
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 24小时内
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <button
          onClick={onClose}
          className="p-2 -m-2 text-gray-600 hover:text-gray-800 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-pink-600">UNA</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">UNA</p>
            <p className="text-xs text-gray-500">你的小妹妹</p>
          </div>
        </div>
        <div className="w-8" /> {/* 占位 */}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            {/* 时间戳 */}
            <div className="flex justify-center mb-2">
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                {formatTime(msg.timestamp)}
              </span>
            </div>

            {/* 消息内容 */}
            <div className={`flex ${msg.sender === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-2 max-w-[70%] ${msg.sender === currentUserId ? 'flex-row-reverse' : ''}`}>
                {/* 头像 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.sender === currentUserId
                    ? 'bg-blue-500 text-white'
                    : 'bg-pink-100 text-pink-600'
                }`}>
                  {msg.sender === currentUserId
                    ? (currentUserName || "我").slice(0, 1).toUpperCase()
                    : "UNA"
                  }
                </div>

                {/* 消息气泡 */}
                <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                  msg.sender === currentUserId
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">
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
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold">
                UNA
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1">
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
      <div className="border-t border-gray-100 bg-white p-4">
        <div className="flex items-end gap-3">
          <button className="p-2 text-gray-400 hover:text-gray-600 active:scale-95 transition-transform">
            <Smile size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-h-32"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || loading}
            className={`p-3 rounded-full transition-all ${
              inputText.trim() && !loading
                ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}