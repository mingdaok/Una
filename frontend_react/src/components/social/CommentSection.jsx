/**
 * CommentSection.jsx
 * 朋友圈点赞列表 + 评论区 + 楼中楼输入框
 */
import { useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";

export default function CommentSection({
  postId,
  likes = [],
  comments = [],
  currentUserId,
  currentUserName,
  apiBase = "",
  onLikeToggle,     // (newLikes) => void
  onCommentAdded,   // (newComment) => void
}) {
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, userName }
  const [submitting, setSubmitting] = useState(false);

  const isLiked = likes.some((l) => l.user_id === currentUserId);

  // -------- 点赞 / 取消点赞 --------
  const handleLike = async () => {
    try {
      const res = await fetch(`${apiBase}/api/social/post/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUserId, user_name: currentUserName }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        // 及时反馈父组件：本地按结果切换点赞状态
        onLikeToggle && onLikeToggle(data.action, data.like_count);
      }
    } catch (e) {
      console.error("点赞失败:", e);
    }
  };

  // -------- 发表评论 --------
  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/social/post/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          user_name: currentUserName,
          content: inputText.trim(),
          reply_to_id: replyTo?.id || null,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setInputText("");
        setReplyTo(null);
        setShowInput(false);
        onCommentAdded && onCommentAdded(data.comment);
      }
    } catch (e) {
      console.error("评论失败:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const startReply = (comment) => {
    setReplyTo({ id: comment.id, userName: comment.user_name || comment.user_id });
    setShowInput(true);
  };

  // -------- 渲染单条评论 --------
  const renderComment = (c, isReply = false) => {
    const commentAvatarUrl = c.user_avatar
      ? (c.user_avatar.startsWith("http") ? c.user_avatar : `${apiBase}${c.user_avatar}`)
      : null;
    const commentInitial = (c.user_name || c.user_id || "?").slice(0, 1).toUpperCase();

    return (
      <div key={c.id} className={`flex gap-1.5 text-[13px] leading-snug ${isReply ? "mt-1.5 ml-3" : "mt-1.5"}`}>
        {/* 评论头像 */}
        <div className="shrink-0 mt-0.5">
          {commentAvatarUrl ? (
            <img src={commentAvatarUrl} alt="" className="w-5 h-5 rounded-sm object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-sm bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-500">
              {commentInitial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-blue-500 font-medium mr-1">
            {c.user_name || c.user_id}
          </span>
          {c.reply_to_id && c.replies_to_name && (
            <>
              <span className="text-gray-400 text-xs">回复</span>
              <span className="text-blue-500 font-medium mx-1">{c.replies_to_name}</span>
            </>
          )}
          <span className="text-gray-700">{c.content}</span>
          <button
            className="ml-2 text-gray-400 text-xs active:text-blue-400"
            onClick={() => startReply(c)}
          >
            回复
          </button>
          {/* 子回复 */}
          {c.replies && c.replies.length > 0 && (
            <div className="border-l-2 border-gray-200 pl-2 mt-1 space-y-1">
              {c.replies.map((r) => renderComment(r, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-2">
      {/* 操作栏：点赞 & 评论 */}
      <div className="flex items-center gap-4 py-1">
        <button
          className={`flex items-center gap-1 text-sm transition-all active:scale-90 ${
            isLiked ? "text-red-500" : "text-gray-400"
          }`}
          onClick={handleLike}
        >
          <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
          <span>{likes.length > 0 ? likes.length : ""}</span>
        </button>
        <button
          className="flex items-center gap-1 text-sm text-gray-400 active:scale-90"
          onClick={() => { setReplyTo(null); setShowInput(!showInput); }}
        >
          <MessageCircle size={16} />
          <span>{comments.length > 0 ? comments.length : ""}</span>
        </button>
      </div>

      {/* 点赞用户列表（微信风格：昵称用 · 隔开） */}
      {likes.length > 0 && (
        <div className="flex items-center gap-1 text-[12px] text-blue-500 bg-gray-50 rounded px-2 py-1 mb-1 flex-wrap">
          <Heart size={11} fill="currentColor" className="text-red-400 shrink-0" />
          {likes.map((l, i) => (
            <span key={l.user_id}>
              {l.user_name || l.user_id}
              {i < likes.length - 1 && <span className="text-gray-300 mx-0.5">·</span>}
            </span>
          ))}
        </div>
      )}

      {/* 评论列表 */}
      {comments.length > 0 && (
        <div className="bg-gray-50 rounded px-2 py-1 space-y-0.5">
          {comments.map((c) => renderComment(c))}
        </div>
      )}

      {/* 评论输入框 */}
      {showInput && (
        <div className="flex items-center gap-2 mt-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
          {replyTo && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              回复 <span className="text-blue-500">{replyTo.userName}</span>：
            </span>
          )}
          <input
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={replyTo ? "" : "发表评论..."}
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400 min-w-0"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !inputText.trim()}
            className="text-blue-500 active:text-blue-700 disabled:text-gray-300"
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
