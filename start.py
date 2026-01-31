import subprocess
import time
import os
import sys

def run_project():
    print("🚀 正在启动 UNA 系统...")
    
    # 获取当前 python 解释器的路径 (确保用的是同一个环境)
    python_exe = sys.executable

    # 1. 启动后端 (在一个独立的控制台窗口中打开)
    # creationflags=subprocess.CREATE_NEW_CONSOLE 是 Windows 专用指令，用来弹新窗口
    print("🧠 启动后端服务 (backend/main_server.py)...")
    server_process = subprocess.Popen(
        [python_exe, "backend/main_server.py"], 
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

    # 2. 等待几秒
    print("⏳ 等待 3 秒让大脑苏醒...")
    time.sleep(3)

    # 3. 启动客户端 (直接在当前终端运行，或者也弹窗，这里选择弹窗以免阻塞)
    print("👁️ 启动客户端界面 (client/una_healing_pro.py)...")
    try:
        # 使用 subprocess.run 会阻塞主脚本，直到客户端关闭
        subprocess.run([python_exe, "client/una_healing_pro.py"])
    except KeyboardInterrupt:
        print("\n🛑 用户强制停止")

    # 4. 清理工作 (可选：当客户端关闭时，自动把后端也杀掉)
    # 如果你希望关掉窗口时连后端一起关，把下面几行取消注释
    print("🧹 正在关闭后端服务...")
    server_process.terminate()
    
    print("✅ 程序已退出")

if __name__ == "__main__":
    run_project()