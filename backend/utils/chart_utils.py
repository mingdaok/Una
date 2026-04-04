import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import os
import datetime

def generate_curve(mood_data, user_id):
    """
    生成心情曲线图 (带日期版)
    mood_data: [(score, "2026-02-03 14:00:00"), ...]
    """
    if not mood_data or len(mood_data) < 2:
        return None

    scores = []
    times = []
    
    # 解析数据
    for item in mood_data:
        score = item[0]
        t_str = item[1] # 数据库里的原始时间字符串
        try:
            # 尝试解析标准 SQLite 时间格式
            dt = datetime.datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S")
            # 转为更短的显示格式: "02-04 14:30"
            display_time = dt.strftime("%m-%d %H:%M")
        except:
            # 如果解析失败，回退到原始字符串
            display_time = t_str
            
        scores.append(score)
        times.append(display_time)

    # --- 绘图设置 ---
    plt.figure(figsize=(12, 6), dpi=100) # 加宽画布
    plt.style.use('ggplot') # 使用漂亮的样式
    
    # 绘制主线
    plt.plot(times, scores, marker='o', linestyle='-', color='#7F5AF0', linewidth=3, markersize=8, label='Mood')
    
    # 填充区域 (正能量绿，负能量红)
    plt.fill_between(times, scores, 0, where=[s >= 0 for s in scores], facecolor='#2ecc71', alpha=0.1, interpolate=True)
    plt.fill_between(times, scores, 0, where=[s < 0 for s in scores], facecolor='#ff4757', alpha=0.1, interpolate=True)

    # 辅助线
    plt.axhline(y=0, color='gray', linestyle='--', alpha=0.6)
    
    # 设置标题和标签
    plt.title("Mood Trend (Last 50 Records)", fontsize=16, color='#333')
    plt.ylabel("Score (-5 ~ +5)", fontsize=12)
    plt.ylim(-6, 6)
    
    # 🔥 关键优化：X轴标签旋转 45度，防止重叠
    plt.xticks(rotation=45, ha='right', fontsize=10)
    
    # 调整边距，确保标签不被切掉
    plt.tight_layout()

    # --- 保存 ---
    current_dir = os.path.dirname(os.path.abspath(__file__))
    charts_dir = os.path.join(os.path.dirname(current_dir), "static", "mobile", "charts")
    os.makedirs(charts_dir, exist_ok=True)
        
    # 生成唯一文件名 (防止缓存)
    filename = f"mood_{user_id}_{datetime.datetime.now().strftime('%H%M%S')}.png"
    save_path = os.path.join(charts_dir, filename)
    
    plt.savefig(save_path)
    plt.close()
    
    print(f"📈 图表已生成: {filename}")
    return f"/static/mobile/charts/{filename}"
