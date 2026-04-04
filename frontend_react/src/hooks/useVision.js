import { useState } from 'react';

export function useVision(onImageReady) {
    const isPlus = window.plus || navigator.userAgent.indexOf("Html5Plus") > -1;

    // 📸 拍照
    const takePhoto = () => {
        if (!isPlus) {
            alert("请在 App 环境下使用拍照功能");
            return;
        }
        const cmr = window.plus.camera.getCamera();
        cmr.captureImage((path) => {
            compressAndSend(path);
        }, (e) => {
            console.error("拍照失败: " + e.message);
        }, {
            filename: "_doc/camera/",
            index: 1
        });
    };

    // 🖼️ 从相册选择
    const pickImage = () => {
        if (!isPlus) {
            // Web 端 fallback
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                // Web 端用 canvas 压缩后再转 base64
                compressWithCanvas(file, (base64) => {
                    if (onImageReady) onImageReady(base64);
                });
            };
            input.click();
            return;
        }

        window.plus.gallery.pick((path) => {
            compressAndSend(path);
        }, (e) => {
            console.error("选择图片失败: " + e.message);
        }, {
            filter: "image"
        });
    };

    // 🔥 核心：先用 plus.zip.compressImage 压缩，再读取 base64
    // 手机照片原图可达 5-10MB，必须压缩后再发往云端，否则必超时
    const compressAndSend = (srcPath) => {
        // 压缩后的临时文件路径
        const dstPath = "_doc/cache/compressed_vision.jpg";

        window.plus.zip.compressImage(
            {
                src: srcPath,
                dst: dstPath,
                width: "800px",    // 最大宽度 800px，足够视觉识别
                height: "800px",   // 最大高度 800px
                quality: 60,       // JPEG 质量 60%，大幅减小体积
                overwrite: true
            },
            () => {
                // 压缩成功，读取 base64
                window.plus.io.resolveLocalFileSystemURL(dstPath, (entry) => {
                    entry.file((file) => {
                        const reader = new window.plus.io.FileReader();
                        reader.onloadend = (e) => {
                            const base64 = e.target.result; // data:image/jpeg;base64,...
                            console.log("📸 [Vision] 压缩完成，base64 长度:", base64?.length);
                            if (onImageReady) onImageReady(base64);
                        };
                        reader.onerror = (err) => {
                            console.error("❌ [Vision] 读取压缩图片失败:", err);
                        };
                        reader.readAsDataURL(file);
                    });
                }, (err) => {
                    console.error("❌ [Vision] 找不到压缩后文件:", err);
                });
            },
            (err) => {
                // 压缩失败，降级：直接读取原图（可能很大）
                console.warn("⚠️ [Vision] 压缩失败，尝试读取原图:", err.message);
                window.plus.io.resolveLocalFileSystemURL(srcPath, (entry) => {
                    entry.file((file) => {
                        const reader = new window.plus.io.FileReader();
                        reader.onloadend = (e) => {
                            if (onImageReady) onImageReady(e.target.result);
                        };
                        reader.readAsDataURL(file);
                    });
                });
            }
        );
    };

    // 🌐 Web 端 canvas 压缩（备用）
    const compressWithCanvas = (file, callback) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                    else { w = Math.round(w * MAX / h); h = MAX; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    return { takePhoto, pickImage };
}