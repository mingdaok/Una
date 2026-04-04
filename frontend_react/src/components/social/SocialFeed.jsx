/**
 * SocialFeed.jsx
 * UNA 朋友圈主页面
 * 功能：顶部封面 + 发圈按钮，下方无限滚动动态列表
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, PlusCircle, RefreshCw, Loader2, Camera, Upload } from "lucide-react";
import PostCard from "./PostCard";
import PublishPost from "./PublishPost";
import Lightbox from "./Lightbox";

const PAGE_SIZE = 10;

export default function SocialFeed({
  currentUserId,
  currentUserName,
  apiBase = "",
  onClose,  // () => void 关闭朋友圈
}) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, images: [], currentIndex: 0 });
  const loaderRef = useRef(null);  // 无限滚动触发元素

  // -------- 拉取动态列表 --------
  const fetchFeed = useCallback(async (targetPage = 1, append = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${apiBase}/api/social/feed?page=${targetPage}&page_size=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts((prev) => append ? [...prev, ...data.items] : data.items);
      setTotal(data.total);
      setPage(targetPage);
    } catch (e) {
      setError("加载失败，请检查网络");
      console.error("Feed 拉取失败:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBase]);

  // 首次加载
  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  // 获取用户档案（头像/封面）
  useEffect(() => {
    if (!currentUserId) return;
    const loadProfile = async () => {
      try {
        const res = await fetch(`${apiBase}/api/social/user/${currentUserId}/profile`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUserProfile(data.profile || null);
      } catch (e) {
        setUserProfile(null);
        console.error("获取用户档案失败", e);
      }
    };
    loadProfile();
  }, [currentUserId, apiBase]);


  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed(1, false);
  };

  // 无限滚动：观察底部 loader 元素
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && posts.length < total) {
          fetchFeed(page + 1, true);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loaderRef, loading, posts.length, total, page, fetchFeed]);

  const handleCoverUpload = async (file) => {
    if (!file || !currentUserId) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiBase}/api/social/user/${currentUserId}/cover`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("封面上传失败");
      const data = await res.json();
      if (data.profile) setUserProfile(data.profile);
      handleRefresh();
    } catch (e) {
      console.error("封面上传失败", e);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file || !currentUserId) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiBase}/api/social/user/${currentUserId}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("头像上传失败");
      const data = await res.json();
      if (data.profile) setUserProfile(data.profile);
      handleRefresh();
    } catch (e) {
      console.error("头像上传失败", e);
    } finally {
      setAvatarUploading(false);
    }
  };

  const openLightbox = (images, index = 0) => {
    if (!images || images.length === 0) return;
    setLightbox({ open: true, images, currentIndex: index });
  };

  const closeLightbox = () => setLightbox({ ...lightbox, open: false });

  const nextLightbox = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }));
  };

  const prevLightbox = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }));
  };


  // 发布成功后将新动态插入顶部
  const handlePublished = (newPost) => {
    if (newPost) {
      setPosts((prev) => [newPost, ...prev]);
      setTotal((t) => t + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#f4f4f4] flex flex-col overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* === 顶部导航栏 === */}
      <div className="bg-[#ededed] flex items-center justify-between px-4 py-3 shrink-0 border-b border-gray-200">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-600 active:text-gray-900 text-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-gray-800 text-base">UNA 朋友圈</span>
        <button
          onClick={() => setShowPublish(true)}
          className="flex items-center gap-1 text-gray-600 active:text-[#07c160] transition-colors"
          title="发朋友圈"
        >
          <PlusCircle size={22} />
        </button>
      </div>

      {/* === 封面头图区 === */}
      <div className="relative h-44 shrink-0 flex items-end px-4 pb-4">
        {userProfile && userProfile.cover_url ? (
          <img
            src={userProfile.cover_url.startsWith('http') ? userProfile.cover_url : `${apiBase}${userProfile.cover_url}`}
            alt="封面"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#8d6e63] to-[#5d4037]" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="flex items-center gap-3 relative z-10">
          {/* 头像 */}
          <div className="relative">
            {userProfile && userProfile.avatar_url ? (
              <img
                src={userProfile.avatar_url.startsWith('http') ? userProfile.avatar_url : `${apiBase}${userProfile.avatar_url}`}
                alt="头像"
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl bg-white/90 flex items-center justify-center text-2xl font-bold text-[#8d6e63] shadow-lg"
              >
                {(currentUserName || currentUserId || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            {/* Camera 图标 */}
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md cursor-pointer">
              {avatarUploading ? (
                <Loader2 size={12} className="animate-spin text-gray-600" />
              ) : (
                <Camera size={12} className="text-gray-600" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">
              {userProfile?.nickname || currentUserName || currentUserId}
            </p>
            <p className="text-white/80 text-xs">UNA 陪伴空间</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="absolute top-3 right-4 text-white/80 active:text-white bg-black/25 rounded-full p-1"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>

        <label
          className="absolute top-3 left-4 flex items-center gap-1 text-white/90 bg-black/30 px-2 py-1 rounded-full text-xs cursor-pointer"
          title="更换封面"
        >
          <Camera size={14} />
          更换封面
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCoverUpload(file);
              e.target.value = "";
            }}
          />
        </label>

        {coverUploading && (
          <div className="absolute bottom-3 left-4 text-white text-xs flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" /> 上传中...
          </div>
        )}
      </div>

      {/* === 动态列表 === */}
      <div className="flex-1 overflow-y-auto">
        {/* 错误提示 */}
        {error && (
          <div className="text-center text-red-400 text-sm py-6">{error}</div>
        )}

        {/* 空状态 */}
        {!loading && posts.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-5xl mb-3">🌸</p>
            <p className="text-sm">还没有动态，快来发第一条吧~</p>
            <button
              onClick={() => setShowPublish(true)}
              className="mt-4 px-6 py-2 bg-[#8d6e63] text-white rounded-full text-sm active:opacity-80"
            >
              发朋友圈
            </button>
          </div>
        )}

        {/* 动态卡片列表 */}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            apiBase={apiBase}
            onRefresh={handleRefresh}
            onOpenLightbox={(images, index) => openLightbox(images, index)}
          />
        ))}

        {/* 无限滚动 loader */}
        <div ref={loaderRef} className="flex justify-center py-4">
          {loading && <Loader2 size={20} className="animate-spin text-gray-400" />}
          {!loading && posts.length > 0 && posts.length >= total && (
            <span className="text-gray-300 text-xs">— 已到底部 —</span>
          )}
        </div>
      </div>

      {/* === 发圈浮层 === */}
      {showPublish && (
        <PublishPost
          currentUserId={currentUserId}
          currentUserName={currentUserName || currentUserId}
          apiBase={apiBase}
          onClose={() => setShowPublish(false)}
          onPublished={handlePublished}
        />
      )}

      {/* === 大图预览 === */}
      {lightbox.open && (
        <Lightbox
          images={lightbox.images}
          currentIndex={lightbox.currentIndex}
          apiBase={apiBase}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}
    </div>
  );
}
