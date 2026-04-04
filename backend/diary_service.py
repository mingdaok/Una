import os
import json
import time
import requests
import yaml
import asyncio
from datetime import datetime

# === 路径配置 ===
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
STATIC_DIR = os.path.join(CURRENT_DIR, "static", "mobile", "diary_images")
CONFIG_PATH = os.path.join(ROOT_DIR, "config.yaml")

# === 加载配置 ===
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
else:
    config = {
        'apis': {
            'silicon_base': {
                'api_key': '',
                'base_url': 'https://api.siliconflow.cn/v1',
                'llm_model': 'deepseek-ai/DeepSeek-V2.5',
                'image_model': 'Kwai-Kolors/Kolors'
            }
        }
    }

SILICON_CONFIG = config.get('apis', {}).get('silicon_base', {})
SILICON_API_KEY = SILICON_CONFIG.get('api_key', '')
BASE_URL = SILICON_CONFIG.get('base_url', 'https://api.siliconflow.cn/v1')

# 确保图片目录存在
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)


class DiaryService:
    def __init__(self, brain=None):
        self.headers = {
            "Authorization": f"Bearer {SILICON_API_KEY}",
            "Content-Type": "application/json"
        }
        # brain_engine 实例，由 main_server 注入
        self.brain = brain
        # 延迟导入，避免循环引用
        import database as db
        self.db = db

    def get_all_memories(self, user_id):
        """读取该用户所有日记（从 SQLite 数据库）"""
        diaries = self.db.get_diaries(user_id, limit=50)
        # 补充 displayDate 字段便于前端展示
        for d in diaries:
            try:
                date_obj = datetime.strptime(d['date'], "%Y-%m-%d")
                d['displayDate'] = date_obj.strftime("%m.%d")
            except Exception:
                d['displayDate'] = d.get('date', '')
            # 添加随机微偏移（前端照片墙用）
            if 'x_offset' not in d or d['x_offset'] is None:
                d['x_offset'] = (int(time.time() * 1000 + hash(str(d.get('id', 0)))) % 11) - 5
            if 'y_offset' not in d or d['y_offset'] is None:
                d['y_offset'] = (int(time.time() * 1000 + hash(str(d.get('id', 1)))) % 11) - 5
            if 'rotation' not in d or d['rotation'] is None:
                d['rotation'] = (int(time.time() * 1000 + hash(str(d.get('id', 2)))) % 7) - 3
        return diaries

    async def generate_diary(self, user_id, force=False):
        """
        生成今日日记并存入数据库。
        - force=False 时，若今日已有日记则跳过。
        - 调用 brain_engine.write_daily_diary 获取内容和绘图 Prompt。
        """
        today_str = datetime.now().strftime("%Y-%m-%d")
        print(f"📝 [{user_id}] 开始生成 {today_str} 的日记...")

        if not force:
            existing = self.db.get_diaries(user_id, limit=1)
            if existing and existing[0].get('date') == today_str:
                print(f"⏭️ [{user_id}] 今日日记已存在，跳过。")
                return None

        if not self.brain:
            print("❌ DiaryService: brain 未注入，无法生成日记")
            return None

        # 1. 调用 brain_engine 生成日记内容 + 绘图 Prompt
        try:
            llm_result = await self.brain.write_daily_diary(user_id)
        except Exception as e:
            print(f"❌ LLM 日记生成失败: {e}")
            return None

        content = llm_result.get('content', '')
        mood = llm_result.get('mood', 'calm')
        image_prompt = llm_result.get('image_prompt', '')

        if not image_prompt:
            # 降级默认 Prompt
            image_prompt = "Makoto Shinkai style, anime style, a quiet room at night, soft light from window, depth of field, 8k wallpaper"

        print(f"🎨 [{user_id}] 绘图 Prompt: {image_prompt[:40]}...")

        # 2. 调用 Kolors 生图
        image_path = self._call_image_gen(image_prompt)

        # 3. 存入数据库
        success = self.db.save_diary(
            user_id=user_id,
            date=today_str,
            diary_type="DAILY",
            content=content,
            mood=mood,
            memory_ref="auto_generated",
            image_path=image_path or ""
        )

        if success:
            print(f"✅ [{user_id}] 日记已保存 | 心情: {mood}")
            return {
                "date": today_str,
                "content": content,
                "mood": mood,
                "img": f"/static/mobile/diary_images/{os.path.basename(image_path)}" if image_path else None
            }
        else:
            print(f"⚠️ [{user_id}] 日记今日已存在或保存失败")
            return None

    def _call_image_gen(self, prompt):
        """调用 Kolors 生图模型，返回本地保存路径"""
        model_name = SILICON_CONFIG.get('image_model', 'Kwai-Kolors/Kolors')
        try:
            # 风格强化前缀
            style_prefix = "(Makoto Shinkai style:1.3), (anime style:1.2), cinematic lighting, lens flare, vibrant colors, "
            final_prompt = f"{style_prefix} {prompt}, highly detailed, 8k wallpaper, masterpiece, best quality"
            negative_prompt = "nsfw, low quality, bad anatomy, text, watermark, username, signature, face, portrait, eyes, looking at viewer, selfie, photorealistic"

            payload = {
                "model": model_name,
                "prompt": final_prompt,
                "negative_prompt": negative_prompt,
                "image_size": "896x1152",
                "batch_size": 1,
                "num_inference_steps": 25,
                "guidance_scale": 6,
                "seed": int(time.time())
            }
            response = requests.post(f"{BASE_URL}/images/generations", headers=self.headers, json=payload, timeout=60)
            if response.status_code != 200:
                print(f"❌ 生图 API 错误: {response.text}")
                return None
            online_url = response.json()['images'][0]['url']
            return self._download_image(online_url)
        except Exception as e:
            print(f"❌ Image Error: {e}")
            return None

    def _download_image(self, url):
        """下载图片到本地静态目录"""
        try:
            filename = f"diary_{int(time.time())}.jpg"
            save_path = os.path.join(STATIC_DIR, filename)
            img_data = requests.get(url, timeout=30).content
            with open(save_path, 'wb') as f:
                f.write(img_data)
            return save_path
        except Exception as e:
            print(f"⚠️ 图片下载失败: {e}")
            return None