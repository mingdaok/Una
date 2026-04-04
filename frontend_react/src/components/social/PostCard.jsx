/**
 * PostCard.jsx
 * 朋友圈单条动态卡片
 * 包含：头像、昵称、正文、图片网格、底部互动区
 */
import { useState } from "react";
import ImageGrid from "./ImageGrid";
import CommentSection from "./CommentSection";

// 根据 author_type 和 author_id 生成头像占位背景色
function avatarColor(id) {
  const colors = [
    "#8d6e63", "#6d9e4a", "#5b8dd9", "#c1855f",
    "#9575cd", "#26a69a", "#ec7b72", "#78909c",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// 格式化相对时间（微信朋友圈风格）
function relativeTime(ts) {
  if (!ts) return "";
  const now = new Date();
  const t = new Date(ts.replace(" ", "T") + (ts.includes("Z") ? "" : "Z"));
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return ts.slice(0, 10);
}

export default function PostCard({
  post,
  currentUserId,
  currentUserName,
  apiBase = "",
  onRefresh,  // () => void 刷新整个列表
  onOpenLightbox = () => {},
}) {
  const [localPost, setLocalPost] = useState(post);

  // 点赞后本地更新，避免 UX 卡顿（仍保留可选全局刷新）
  const handleLikeToggle = (action, likeCount) => {
    setLocalPost((prev) => {
      const currentLikes = prev.likes || [];
      if (action === "liked") {
        if (currentLikes.some((l) => l.user_id === currentUserId)) {
          return prev;
        }
        return {
          ...prev,
          likes: [...currentLikes, { user_id: currentUserId, user_name: currentUserName || currentUserId }],
        };
      }
      if (action === "unliked") {
        return {
          ...prev,
          likes: currentLikes.filter((l) => l.user_id !== currentUserId),
        };
      }
      return prev;
    });

    // 若需要强一致性，可以保持刷新；默认不会阻塞用户交互
    // onRefresh && onRefresh();
  };

  const handleCommentAdded = (newComment) => {
    // 乐观更新：把新评论追加到本地
    setLocalPost((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), newComment],
    }));
  };

  const p = localPost;
  const initials = (p.author_name || p.author_id || "?").slice(0, 1).toUpperCase();
  const bgColor = avatarColor(p.author_id || "default");
  const isAI = p.author_type === "ai";

  const getAvatarUrl = () => {
    if (p.author_avatar) {
      if (p.author_avatar.startsWith("http")) return p.author_avatar;
      return `${apiBase}${p.author_avatar}`;
    }
    return null;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="flex gap-3 py-4 px-4 border-b border-gray-100 bg-white">
      {/* 头像 */}
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="头像"
            className="w-10 h-10 rounded-md object-cover shadow-sm"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm select-none"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        )}
        {isAI && (
          <span className="absolute right-0 bottom-0 text-[9px] bg-blue-500 text-white px-1 rounded-full leading-4">
            AI
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* 昵称 */}
        <p className="text-blue-500 font-semibold text-[15px] leading-tight">
          {p.author_name || p.author_id}
          {isAI && (
            <span className="ml-1 text-[10px] bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full align-middle">
              AI
            </span>
          )}
        </p>

        {/* 正文 */}
        {p.content && (
          <p className="mt-1 text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {p.content}
          </p>
        )}

        {/* 图片网格 */}
        <ImageGrid images={p.images} apiBase={apiBase} onImageClick={(idx) => onOpenLightbox(p.images, idx)} />

        {/* 位置 + 时间 */}
        <div className="flex items-center gap-2 mt-2 text-gray-400 text-[12px]">
          {p.location && <span>📍 {p.location}</span>}
          <span>{relativeTime(p.timestamp)}</span>
        </div>

        {/* 互动区 */}
        <CommentSection
          postId={p.id}
          likes={localPost.likes || []}
          comments={localPost.comments || []}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          apiBase={apiBase}
          onLikeToggle={handleLikeToggle}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </div>
  );
}
