// ==========================================
// 🌍 全局环境与 API 配置
// ==========================================

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const API_HOST = configuredApiBase.replace(/^https?:\/\//, '');

export function getApiBase() {
  if (configuredApiBase) return configuredApiBase;
  return '';
}

export function getWebSocketBase() {
  const apiBase = getApiBase();
  if (apiBase) return apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
}
