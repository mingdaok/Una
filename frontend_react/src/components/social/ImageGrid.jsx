/**
 * ImageGrid.jsx
 * 朋友圈图片九宫格自适应组件
 * 规则：1 张大图 / 2-4 张 2×2 / 5-9 张 3×3
 */
export default function ImageGrid({ images, apiBase = "", onImageClick = () => {} }) {
  if (!images || images.length === 0) return null;

  // 补全图片 URL（兼容 HBuilderX file:// 环境）
  const fullUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${apiBase}${url}`;
  };

  const count = images.length;

  // 单张大图
  if (count === 1) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden" style={{ maxWidth: "240px" }}>
        <img
          src={fullUrl(images[0])}
          alt="朋友圈图片"
          className="w-full h-auto object-cover rounded-lg cursor-pointer"
          style={{ maxHeight: "300px", objectFit: "cover" }}
          onClick={() => onImageClick(0)}
        />
      </div>
    );
  }

  // 多图：2-4 张用 2 列，5-9 张用 3 列
  const cols = count <= 4 ? 2 : 3;
  const cellSize = cols === 2 ? "calc(50% - 2px)" : "calc(33.333% - 3px)";

  return (
    <div
      className="mt-2 flex flex-wrap gap-[3px]"
      style={{ maxWidth: cols === 2 ? "200px" : "240px" }}
    >
      {images.map((img, idx) => (
        <div
          key={idx}
          style={{ width: cellSize, paddingBottom: cellSize, position: "relative" }}
          className="rounded overflow-hidden bg-gray-100"
        >
          <img
            src={fullUrl(img)}
            alt={`图片 ${idx + 1}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            className="cursor-pointer"
            onClick={() => onImageClick(idx)}
          />
        </div>
      ))}
    </div>
  );
}
