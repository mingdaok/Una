/**
 * Lightbox.jsx
 * 朋友圈图片大图预览组件（全屏）
 */
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Lightbox({ images, currentIndex, onClose, onPrev, onNext, apiBase = "" }) {
  if (!images || images.length === 0) return null;

  const normalizedUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${apiBase}${url}`;
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  const currentImage = images[currentIndex] || images[0];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={normalizedUrl(currentImage)}
          alt="大图预览"
          className="max-h-[95vh] max-w-[95vw] object-contain transition-transform duration-300"
          style={{ transform: "scale(1)" }}
          onClick={(e) => e.stopPropagation()}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/70 p-2 rounded-full"
        >
          <X size={20} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-3 text-white bg-black/40 hover:bg-black/70 p-2 rounded-full"
        >
          <ChevronLeft size={28} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-3 text-white bg-black/40 hover:bg-black/70 p-2 rounded-full"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
