import os
import yaml
import requests
import json
import base64

# === 路径配置 ===
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
CONFIG_PATH = os.path.join(ROOT_DIR, "config.yaml")

# === 加载配置 ===
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
else:
    config = {}

SILICON_CONFIG = config.get('apis', {}).get('silicon_base', {})
API_KEY = SILICON_CONFIG.get('api_key', '')
BASE_URL = SILICON_CONFIG.get('base_url', 'https://api.siliconflow.cn/v1')
VISION_MODEL = SILICON_CONFIG.get('vision_model', 'Qwen/Qwen2.5-VL-72B-Instruct')

class VisionService:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
        print(f"👀 [VisionService] 视觉模组已加载: {VISION_MODEL}")

    def see_and_reply(self, image_data, user_context=""):
        """
        让 Una 看图并说话
        image_data: 可能是纯 Base64，也可能是带 data:image 前缀的字符串
        """
        
        # 🔥🔥🔥 核心修复：智能清洗 Base64 前缀 🔥🔥🔥
        # 如果前端传来了前缀，保留它；如果没有，手动加上
        final_image_url = image_data
        if "base64," in image_data:
            # 如果已经包含前缀（例如 data:image/jpeg;base64,...），直接用
            final_image_url = image_data
        else:
            # 如果是纯 Base64 字符串，手动补上前缀
            final_image_url = f"data:image/jpeg;base64,{image_data}"

        user_prompt = "请用这双眼睛看看这张照片。用第一人称‘我’(Una) 的语气，温柔、感性地描述你看到了什么。就像我们在视频通话一样。不要太啰嗦，要在100字以内。"
        if user_context:
            user_prompt += f"\n(用户补充说: {user_context})"

        payload = {
            "model": VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": final_image_url  # ✅ 使用处理好的 URL
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 150,
            "temperature": 1.0
        }

        # 3. 发送请求
        try:
            response = requests.post(f"{BASE_URL}/chat/completions", headers=self.headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                res_json = response.json()
                if 'choices' in res_json and len(res_json['choices']) > 0:
                    reply = res_json['choices'][0]['message']['content']
                    print(f"💬 [Vision Reply]: {reply}")
                    return reply
                else:
                    print(f"⚠️ API 返回结构异常: {res_json}")
                    return "嗯...我好像没看清，这是什么呀？"
            else:
                print(f"❌ 视觉API报错: {response.text}")
                return "哎呀，我看不太清...是不是信号不好？"
                
        except Exception as e:
            print(f"❌ 视觉连接失败: {e}")
            return "我的眼睛好像有点模糊... (网络错误)"