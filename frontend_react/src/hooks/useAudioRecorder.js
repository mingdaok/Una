import { useState, useRef } from 'react';
import { API_HOST } from '../config';

// 获取后端地址（与 useUnaCore 保持一致）
const getApiBase = () => {
  const ENV_HOST = API_HOST;
  let cleanHost = ENV_HOST.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const isPlus = window.plus || navigator.userAgent.indexOf("Html5Plus") > -1 || window.location.protocol === 'file:';
  return isPlus ? `http://${cleanHost}` : "";
};

// onStopSignal 保留参数签名兼容性，但现在使用 HTTP POST 发送音频，不再需要它
export function useAudioRecorder(onAudioData, onStopSignal) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const plusRecorder = useRef(null);

  // 判断是否在 App 环境
  const isPlus = window.plus || navigator.userAgent.indexOf("Html5Plus") > -1;

  // === 开始录音 ===
  const startRecording = async () => {
    if (isPlus) {
      startNativeRecording();
    } else {
      startWebRecording();
    }
  };

  // === 停止录音 ===
  const stopRecording = () => {
    if (isPlus) {
      stopNativeRecording();
    } else {
      stopWebRecording();
    }
  };

  // ==========================================
  // 💻 Web 录音 (电脑端调试用)
  // ==========================================
  const startWebRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (onAudioData) onAudioData(reader.result);
          if (onStopSignal) onStopSignal();
        };
        reader.readAsArrayBuffer(blob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Web录音失败:", err);
    }
  };

  const stopWebRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // ==========================================
  // 📱 App 原生录音 - 使用 HTTP POST 发送（最稳方案）
  // ==========================================
  const startNativeRecording = () => {
    if (!window.plus) return;

    const r = window.plus.audio.getRecorder();
    plusRecorder.current = r;

    const recordOpts = {
      filename: "_doc/audio/temp_voice.wav",
      format: "wav"
    };

    console.log("🎙️ [App] 启动录音...");

    try {
      r.record(recordOpts, (path) => {
        console.log("✅ [App] 录音完成，路径:", path);
        // 延迟 200ms 确保文件写入完成，然后上传
        setTimeout(() => uploadAudioToServer(path), 200);
      }, (e) => {
        console.error("❌ [App] 录音报错:", e.message);
      });
      setIsRecording(true);
    } catch (e) {
      console.error("❌ [App] 调用 record 异常:", e);
    }
  };

  const stopNativeRecording = () => {
    if (plusRecorder.current && isRecording) {
      plusRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // 🔥 核心：用 readAsDataURL 读取音频，再 HTTP POST 发给后端
  // 比 WebSocket 二进制更稳定，readAsDataURL 在 HBuilder 中完全可靠
  const uploadAudioToServer = (path) => {
    window.plus.io.resolveLocalFileSystemURL(path, (entry) => {
      entry.file((file) => {
        const reader = new window.plus.io.FileReader();

        reader.onloadend = async (e) => {
          const base64DataUrl = e.target.result; // "data:audio/wav;base64,..."
          if (!base64DataUrl) {
            console.error("❌ [App] 音频文件读取为空");
            return;
          }

          console.log(`🚀 [App] 音频读取成功，准备上传，大小: ${base64DataUrl.length} chars`);

          // 提取纯 base64（去掉 "data:audio/wav;base64," 前缀）
          const base64Audio = base64DataUrl.includes(',')
            ? base64DataUrl.split(',')[1]
            : base64DataUrl;

          // 获取 user_id（从 localStorage 读取，与 App.jsx 保持一致）
          const userId = localStorage.getItem("una_user") || "mobile_user";
          const apiBase = getApiBase();

          try {
            console.log("📤 [App] 上传音频到后端...");
            const res = await fetch(`${apiBase}/api/voice_input`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio_base64: base64Audio,
                user_id: userId
              })
            });

            const data = await res.json();
            console.log("✅ [App] 语音上传成功，状态:", data.status);
            // 后端会通过 WebSocket 把 AI 回复推送给前端，无需在这里处理
          } catch (err) {
            console.error("❌ [App] 上传音频失败:", err);
          }
        };

        reader.onerror = (e) => {
          console.error("❌ [App] 音频文件读取失败:", e);
        };

        // 用 readAsDataURL，在 HBuilder 中最可靠
        reader.readAsDataURL(file);
      });
    }, (e) => {
      console.error("❌ [App] 找不到音频文件:", e.message);
    });
  };

  return { isRecording, startRecording, stopRecording };
}