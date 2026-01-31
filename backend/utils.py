import yaml
import os
import matplotlib.pyplot as plt

def load_config(config_path="config.yaml"):
    """加载 YAML 配置文件"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(current_dir, config_path)
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print(f"❌ 错误: 找不到配置文件 {full_path}")
        return None

def save_mood_chart(history, filename="static/mood_chart.png"):
    """
    根据情绪历史生成折线图并保存
    history: list of int (例如 [-2, 0, 3, 5])
    filename: 保存路径
    """
    if not history:
        return
    
    # 确保目录存在
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # 清除旧图并绘制新数据
    plt.clf() 
    
    # 绘制折线
    plt.plot(history, marker='o', linestyle='-', color='#5dade2', linewidth=2, label='Mood Score')
    
    # 图表美化
    plt.title("Una - Mood Trend", fontsize=14)
    plt.xlabel("Recent Dialogues", fontsize=10)
    plt.ylabel("Score (-5 to +5)", fontsize=10)
    plt.ylim(-6, 6) # 固定纵坐标范围
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.axhline(0, color='#e74c3c', linewidth=1, linestyle='--') # 零点基准线
    
    # 保存图片
    plt.tight_layout()
    plt.savefig(filename)
    # 释放内存
    plt.close()