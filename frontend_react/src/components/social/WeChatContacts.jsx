/**
 * WeChatContacts.jsx
 * 微信风格好友列表页面
 * 点击好友进入聊天页面，第一条固定为 AI 伙伴 UNA
 */
import { useState } from "react";
import { ArrowLeft, Search, MessageCircle, UserPlus } from "lucide-react";
import WeChatChat from "./WeChatChat";

export default function WeChatContacts({
  currentUserId,
  currentUserName,
  apiBase = "",
  onClose,
}) {
  const [chatTarget, setChatTarget] = useState(null); // { id, name } 或 null
  const [searchText, setSearchText] = useState("");

  // P0 公网版只提供用户自己的 UNA，不暴露真人好友关系。
  const contactList = [
    {
      id: "ai_una",
      name: "UNA",
      subtitle: "你的 AI 伙伴",
      isAI: true,
      avatarColor: "#ec4899", // pink-500
    },
  ];

  // 搜索过滤
  const filteredList = searchText.trim()
    ? contactList.filter(
        (c) =>
          c.name.toLowerCase().includes(searchText.toLowerCase()) ||
          c.id.toLowerCase().includes(searchText.toLowerCase())
      )
    : contactList;

  // 如果正在聊天，显示聊天界面
  if (chatTarget) {
    return (
      <WeChatChat
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        friendId={chatTarget.id}
        friendName={chatTarget.name}
        apiBase={apiBase}
        onClose={() => setChatTarget(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#ededed]">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#ededed] border-b border-gray-200 shrink-0">
        <button
          onClick={onClose}
          className="p-2 -m-2 text-gray-600 active:text-gray-900"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-gray-800 text-base">消息</span>
        <div className="w-8" /> {/* 占位保持居中 */}
      </div>

      {/* 搜索栏 */}
      <div className="px-3 py-2 bg-[#ededed]">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="搜索好友..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <UserPlus size={40} className="mb-3 opacity-50" />
            <p className="text-sm">暂无好友</p>
          </div>
        ) : (
          filteredList.map((contact) => (
            <button
              key={contact.id}
              onClick={() =>
                setChatTarget({ id: contact.id, name: contact.name })
              }
              className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50 transition-colors text-left"
            >
              {/* 头像 */}
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{ backgroundColor: contact.avatarColor }}
                >
                  {contact.name.slice(0, 1).toUpperCase()}
                </div>
                {contact.isAI && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-blue-500 text-white px-1 rounded-full leading-3">
                    AI
                  </span>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-gray-900 truncate">
                  {contact.name}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {contact.subtitle}
                </p>
              </div>

              {/* 右侧图标 */}
              <MessageCircle size={18} className="text-gray-300 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
