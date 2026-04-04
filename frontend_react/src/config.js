// ==========================================
// 🌍 全局环境与 API 配置
// ==========================================

// 🔄 【切换开关】
// true = 本地局域网测试环境 (手机电脑在同一局域网)
// false = 公网正式环境
export const IS_TESTING = true;

// 1️⃣ 测试环境 IP (请填入你电脑的局域网 IPv4 地址)
// 可以打开 CMD 输入 ipconfig 查看 IPv4 地址
const TEST_IP = "192.168.0.110:8000";

// 2️⃣ 正式环境 IP (云服务器公网 IP)
const PUBLIC_IP = "39.102.147.7:8080";

// 最终使用的基础 API HOST
const API_HOST_BASE = IS_TESTING ? TEST_IP : PUBLIC_IP;

// 导出最终 HOST (无视 Vite 环境变量，强行采用本文件的开关)
export const API_HOST = API_HOST_BASE;
