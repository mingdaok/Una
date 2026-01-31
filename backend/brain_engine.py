import json
from openai import OpenAI
import database

class UnaBrain:
    def __init__(self, api_key, base_url, model):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.crisis_keywords = ["自杀", "想死", "不想活了", "结束生命", "离开世界", "割腕", "吃药"]

    async def chat(self, user_id, user_text):
        if any(kw in user_text for kw in self.crisis_keywords):
            return {"reply": "我听到这些感到非常心疼。请你答应我，先不要伤害自己。拨打热线 12345 可以获得专业求助，我会一直陪着你。", 
                    "mood_score": -5, "crisis_level": "CRISIS"}

        history = database.get_recent_history(user_id)
        hist_str = "\n".join([f"U: {u}\nA: {r}" for u, r in reversed(history)])

        prompt = f"你叫Una，一个温暖的心理陪伴者。请以JSON格式回复。字段：reply, mood_score(-5到5), crisis_level('CRISIS'或'NORMAL')。\n历史：{hist_str}"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": prompt}, {"role": "user", "content": user_text}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except:
            return {"reply": "我一直在听，能再多说一点吗？", "mood_score": 0, "crisis_level": "NORMAL"}