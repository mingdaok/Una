import os

# ================= 配置 =================
# 暂时用这个占位符，等你买了服务器，去 .env.production 里填写真实 IP 即可
# 这里的修改是为了让代码读取 .env 文件，而不是写死 IP
FIX_LOGIC = {
    # 1. 修复 Live2DViewer
    "frontend_react/src/components/Live2DViewer.jsx": {
        "old": 'const SERVER_URL = "http://192.168.1.85:8000";',
        "new": 'const ENV_HOST = import.meta.env.VITE_API_HOST || "http://127.0.0.1:8000";\n    const SERVER_URL = window.plus ? ENV_HOST : "";'
    },
    # 2. 修复 WallGallery
    "frontend_react/src/components/WallGallery.jsx": {
        "old": 'const SERVER_URL = "http://192.168.1.85:8000";',
        "new": 'const ENV_HOST = import.meta.env.VITE_API_HOST || "http://127.0.0.1:8000";\n        const SERVER_URL = ENV_HOST;'
    },
    # 3. 修复 Vision Hook
    "frontend_react/src/hooks/useVision.js": {
        "old": 'const ENV_HOST = import.meta.env.VITE_API_HOST || "192.168.1.85:8000";',
        "new": 'const ENV_HOST = import.meta.env.VITE_API_HOST || "127.0.0.1:8000";'
    }
}

def apply_fixes():
    print("🔧 开始修正前端硬编码 IP...")
    for file_path, replace_rules in FIX_LOGIC.items():
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            if replace_rules["old"] in content:
                new_content = content.replace(replace_rules["old"], replace_rules["new"])
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"✅ 已修复: {file_path}")
            else:
                print(f"⚠️ 未找到旧代码或已修复: {file_path}")
        else:
            print(f"❌ 文件不存在: {file_path}")

if __name__ == "__main__":
    apply_fixes()