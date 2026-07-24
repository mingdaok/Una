// ==========================================
// 🌍 全局环境与 API 配置
// ==========================================

// 🔄 【切换开关】
// true = 本地局域网测试环境 (手机电脑在同一局域网)
// false = 公网正式环境
export const IS_TESTING = false;

// 1️⃣ 测试环境 IP (请填入你电脑的局域网 IPv4 地址)
// 可以打开 CMD 输入 ipconfig 查看 IPv4 地址
const TEST_IP = "192.168.0.110:8000";

// 2️⃣ 正式环境 IP (云服务器公网 IP)
const PUBLIC_IP = "39.102.147.7:8081";

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const fallbackHost = IS_TESTING ? TEST_IP : PUBLIC_IP;

export const API_HOST = fallbackHost;

export function getApiBase() {
  const isPlus = window.plus || navigator.userAgent.includes('Html5Plus') || window.location.protocol === 'file:';
  if (configuredApiBase) return configuredApiBase;
  return isPlus ? `http://${fallbackHost}` : '';
}

export function getWebSocketBase() {
  const apiBase = getApiBase();
  if (apiBase) return apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
}
