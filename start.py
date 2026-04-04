import subprocess
import time
import os
import sys
import webbrowser
import platform

def run_project():
    print("🚀 正在启动 UNA 疗愈系统 (APK 最终适配版)...")
    
    # === 1. 路径配置 ===
    project_root = os.path.dirname(os.path.abspath(__file__))
    # 指向你的 Python 大脑
    backend_path = os.path.join(project_root, "backend", "main_server.py")
    # 指向整合后的前端文件 (用于检查)
    static_index = os.path.join(project_root, "backend", "static", "mobile", "index.html")
    
    python_exe = sys.executable
    
    # === 2. 检查环境 ===
    if not os.path.exists(backend_path):
        print(f"❌ 错误: 找不到后端文件 {backend_path}")
        return
    
    # 检查是否真的整合成功了
    if not os.path.exists(static_index):
        print(f"⚠️ 警告: 在 backend/static/mobile 下没找到 index.html")
        print("👉 你可能还没运行 merge_and_upgrade.py 进行打包？")
        print("👉 暂时继续启动，但界面可能无法显示...")
    else:
        print("✅ 检测到 React 前端已成功植入 Python 后端！")

    # 准备启动标志 (Windows下避免弹黑框)
    creation_flags = 0
    if platform.system() == "Windows":
        creation_flags = subprocess.CREATE_NEW_CONSOLE

    # === 3. 启动后端 (Python) ===
    # 这是唯一需要运行的服务，它同时负责 AI 计算和 托管 React 界面
    print(f"🧠 [1/1] 正在唤醒 AI 大脑 (Port 8000)...")
    server_process = subprocess.Popen(
        [python_exe, backend_path],
        creationflags=creation_flags
    )

    # === 4. 打开浏览器 ===
    print("⏳ 等待服务就绪 (3秒)...")
    time.sleep(3) 

    # 关键：这里直接访问 Python 托管的静态文件
    # 你的手机 APK 也是访问这个地址 (或者是 / 根路径，取决于你的后端路由配置)
    # 最终适配的根路径访问地址
    url = "http://127.0.0.1:8000/"
    
    print(f"🌍 打开传送门: {url}")
    webbrowser.open(url)

    print("-" * 40)
    print("✅ UNA 系统完全启动！")
    print("📱 手机 APK 请连接: http://[你的电脑IP]:8000")
    print("👉 后端运行中 (PID: {})".format(server_process.pid))
    print("🛑 按 Ctrl+C 关闭服务")
    print("-" * 40)

    # === 5. 守护进程 ===
    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 正在关闭服务...")
        server_process.terminate()
        print("👋 再见！")

if __name__ == "__main__":
    run_project()