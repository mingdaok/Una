
import asyncio
import os
import sys
import datetime
# 确保能导入 backend 模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database
from brain_engine import UnaBrain
import yaml

# 读取配置
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.yaml")
with open(CONFIG_PATH, 'r', encoding='utf-8') as f: config = yaml.safe_load(f)

brain = UnaBrain(
    api_key=config['apis']['silicon_base']['api_key'], 
    base_url=config['apis']['silicon_base']['base_url'],
    model=config['apis']['silicon_base']['model']
)

async def run_daily_routine(user_id="mobile_user"):
    print(f"✨ 正在生成 {datetime.date.today()} 的生活日记...")
    
    # 1. 检查今天有没有互动过
    last_time, _, _ = database.get_last_interaction(user_id)
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    
    has_interaction = False
    if last_time:
        last_date = last_time.split(" ")[0] # YYYY-MM-DD
        if last_date == today_str:
            has_interaction = True
            
    # 2. 决定日记类型
    if has_interaction:
        print("   -> 今天有过互动，跳过独处日记 (未来可开发共处日记)。")
        # 如果你想无论如何都写，注释掉下面这行
        return 
    else:
        print("   -> 今天没有互动，生成【独处日记】...")
    
    # 3. 生成内容
    result = await brain.write_solo_diary(user_id)
    content = result.get("content")
    mood = result.get("mood")
    
    print(f"📝 日记内容: {content}")
    print(f"🏷️ 心情: {mood}")
    
    # 4. 保存
    success = database.save_diary(user_id, today_str, "SOLO", content, mood, "memory_driven")
    if success:
        print("✅ 日记已保存到数据库！")
    else:
        print("⚠️ 今天已经写过日记了，不再重复。")

if __name__ == "__main__":
    asyncio.run(run_daily_routine())
