/**
 * PublishPost.jsx
 * 发圈组件：文字输入 + 多图上传（最多 9 张）+ 提交
 * 采用底部弹出浮层的交互方式，类似微信"发朋友圈"
 */
import { useState, useRef, useEffect } from "react";
import { X, ImagePlus, Loader2, Send } from "lucide-react";

export default function PublishPost({
  currentUserId,
  currentUserName,
  apiBase = "",
  authorType = "user",  // "user" | "ai"
  onClose,              // () => void
  onPublished,          // (newPost) => void
}) {
  const [text, setText] = useState("");
  const [previewImages, setPreviewImages] = useState([]); // { file, previewUrl }
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [emojiPacks, setEmojiPacks] = useState([]);
  const [selectedEmojiPackId, setSelectedEmojiPackId] = useState(null);
  const fileInputRef = useRef(null);

  // -------- 表情包加载 --------
  useEffect(() => {
    const loadEmojiPacks = async () => {
      if (!currentUserId) return;
      try {
        const res = await fetch(`${apiBase}/api/social/emoji-packs?owner_type=user&owner_id=${currentUserId}`);
        if (!res.ok) return;
        const data = await res.json();
        setEmojiPacks(data.packs || []);
        if (data.packs && data.packs.length > 0) {
          setSelectedEmojiPackId(data.packs[0].id);
        }
      } catch (error) {
        console.error("加载表情包失败", error);
      }
    };
    loadEmojiPacks();
  }, [currentUserId, apiBase]);

  // -------- 选择图片 --------
  const handlePickImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 9 - previewImages.length;
    const selected = files.slice(0, remaining);
    const newPreviews = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPreviewImages((prev) => [...prev, ...newPreviews]);
    // 重置 input，允许重新选同一文件
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setPreviewImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // -------- 发布 --------
  const handlePublish = async () => {
    if (!text.trim() && previewImages.length === 0) {
      setError("请输入文字或选择图片");
      return;
    }
    setError("");
    setPublishing(true);

    try {
      // 1. 上传图片
      let imageUrls = [];
      if (previewImages.length > 0) {
        setUploading(true);
        const formData = new FormData();
        previewImages.forEach(({ file }) => formData.append("files", file));
        const uploadRes = await fetch(`${apiBase}/api/social/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.detail || "图片上传失败");
        imageUrls = uploadData.urls || [];
        setUploading(false);
      }

      // 2. 发布动态
      const postRes = await fetch(`${apiBase}/api/social/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_user_id: currentUserId,
          author_id: currentUserId,
          author_name: currentUserName || currentUserId,
          author_type: authorType,
          content: text.trim(),
          image_urls: imageUrls,
          location: location.trim(),
          emoji_pack_ids: selectedEmojiPackId ? [selectedEmojiPackId] : [],
        }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.detail || "发布失败");

      onPublished && onPublished(postData.post);
      onClose && onClose();
    } catch (e) {
      setError(e.message || "发布失败，请重试");
      setUploading(false);
    } finally {
      setPublishing(false);
    }
  };

  const isLoading = uploading || publishing;

  return (
    /* 全屏遮罩 */
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-t-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={onClose} className="text-gray-500 active:text-gray-800">
            <X size={22} />
          </button>
          <span className="font-semibold text-gray-800">发朋友圈</span>
          <button
            onClick={handlePublish}
            disabled={isLoading}
            className="bg-green-500 disabled:bg-gray-300 text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 active:scale-95 transition-transform"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {uploading ? "上传中..." : publishing ? "发布中..." : "发布"}
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* 文字输入 */}
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="这一刻的想法..."
            className="w-full min-h-[100px] text-[15px] text-gray-800 outline-none resize-none placeholder-gray-400 leading-relaxed"
            rows={4}
          />

          {/* 表情包选择（可选） */}
          {emojiPacks.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <label className="text-gray-500">表情包：</label>
              <select
                value={selectedEmojiPackId || ""}
                onChange={(e) => setSelectedEmojiPackId(Number(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {emojiPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 图片预览网格 */}
          {previewImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previewImages.map(({ previewUrl }, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {/* 添加按钮（最多 9 张） */}
              {previewImages.length < 9 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 active:bg-gray-50"
                >
                  <ImagePlus size={24} />
                </button>
              )}
            </div>
          )}

          {/* 位置标签 */}
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="📍 添加位置（可选）"
            className="w-full text-sm text-gray-500 outline-none py-2 border-t border-gray-100 placeholder-gray-400"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* 底部工具栏 */}
        {previewImages.length === 0 && (
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-gray-500 text-sm active:text-gray-800"
            >
              <ImagePlus size={20} />
              <span>照片/视频</span>
            </button>
          </div>
        )}

        {/* 隐藏的 file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePickImages}
        />
      </div>
    </div>
  );
}
