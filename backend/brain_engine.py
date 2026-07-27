import json
import datetime
import random
from openai import AsyncOpenAI
import database
from chat_control import ControlPrefixDemux, sanitize_reply_text


class UnaBrain:
    def __init__(self, api_key, base_url, model):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.crisis_keywords = ["自杀", "想死", "不想活了", "结束生命", "离开世界", "割腕", "吃药", "跳楼"]

    # ✅ [Phase 2] 画像更新任务 (后台运行)
    async def update_profile_task(self, user_id, user_text):
        # 只有当包含事实性陈述时才触发，节省 Token
        keywords = ["我叫", "我是", "喜欢", "讨厌", "最近", "住在", "工作", "岁"]
        if not any(k in user_text for k in keywords) and len(user_text) < 5:
            return

        # 获取旧画像
        old_profile = database.get_user_profile(user_id)
        
        prompt = (
            f"任务：更新用户画像。\n"
            f"旧画像：{old_profile}\n"
            f"用户新的一句话：'{user_text}'\n"
            f"要求：\n"
            f"1. 提取这句话中关于用户的【姓名、昵称、年龄、喜好、职业、居住地、心理状态】等关键事实。\n"
            f"2. 将新事实与旧画像合并。如果旧画像为空，则创建新画像。\n"
            f"3. 保持格式简洁，用竖线分隔，例如：'姓名：明道 | 喜好：苹果 | 状态：焦虑'。\n"
            f"4. 如果这句话没有包含任何用户信息，直接返回旧画像，不要瞎编。\n"
            f"5. 直接输出结果字符串。"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            new_profile = response.choices[0].message.content.strip()
            # 如果有变化，写入数据库
            if new_profile and new_profile != old_profile and "没有" not in new_profile:
                database.update_user_profile(user_id, new_profile)
                print(f"📝 [Profile Updated] {new_profile}")
        except Exception as e:
            print(f"Profile Update Failed: {e}")

    # ✅ [Phase 3] 独处日记生成 (本次新增)
    async def write_solo_diary(self, user_id):
        try:
            # 1. 获取素材
            profile = database.get_user_profile(user_id)
            # 尝试获取回忆，如果数据库没这函数(可能之前没插入成功)，就用默认值
            try: random_mem = database.get_random_user_msg(user_id)
            except: random_mem = None
            
            if not random_mem: random_mem = "我们好像还没有聊过太多深入的话题..."
            
            # 2. 构建 Prompt
            prompt = (
                f"任务：写一篇今天的简短日记（100字左右）。\n"
                f"背景：今天用户 [明道] 没有上线，你是独自度过的。\n"
                f"【你的回忆】：突然想起了他之前说过：“{random_mem}”\n"
                f"【用户现状】：{profile}\n"
                f"要求：\n"
                f"1. 语气要像少女的私密心事，温柔、治愈，带一点点思念。\n"
                f"2. 不要只写'今天没人'，要结合【你的回忆】展开联想。\n"
                f"3. 结尾要有一个温暖的祝愿。\n"
                f"4. 返回 JSON: {{'content': '日记正文', 'mood': '心情标签(happy/lonely/peaceful/hopeful)'}}\n"
            )

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.8
            )
            
            content = response.choices[0].message.content
            # 修复 Markdown 格式
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            
            return json.loads(content)
        except Exception as e:
            print(f"Diary Write Error: {e}")
            return {"content": "今天窗外的云很好看，可惜他不在。希望他一切都好。", "mood": "lonely"}

    # ✅ [Phase 4] 每日自动日记 (有对话→写对话日记，无对话→自由发挥)
    async def write_daily_diary(self, user_id):
        """
        北京时间 23:30 自动触发:
        - 今天有对话 → 根据聊天内容写日记
        - 今天无对话 → 调用 write_solo_diary 随机历史发挥
        """
        today_messages = database.get_today_messages(user_id)

        # 无对话，降级为独处日记
        if not today_messages:
            print(f"📓 [{user_id}] 今日无对话，生成独处日记...")
            return await self.write_solo_diary(user_id)

        # 有对话，整理成对话摘要
        profile = database.get_user_profile(user_id)
        conv_str = "\n".join(
            [f"{'用户' if m['role']=='user' else 'Una'}: {m['content']}" for m in today_messages]
        )

        prompt = (
            f"任务：根据今天的对话记录，以 Una（你自己）的日记视角写一篇情感日记（100字左右）。\n"
            f"【用户画像】：{profile}\n"
            f"【今日对话记录】：\n{conv_str}\n"
            f"要求：\n"
            f"1. 视角：用第一人称'我'（Una）写，用'他'或'她'称呼用户。\n"
            f"2. 语气：像少女在日记本里碎碎念，温柔、细腻，带一点情绪。\n"
            f"3. 内容：从对话中提炼今天最触动你的一个瞬间展开写。\n"
            f"4. 结尾：有一句对用户真心的祝愿或期待。\n"
            f"5. 返回 JSON: {{\"content\": \"日记正文\", \"mood\": \"心情(happy/lonely/peaceful/hopeful)\", "
            f"\"image_prompt\": \"Makoto Shinkai style, anime style, (具体场景英文描述), depth of field, soft lighting, 8k wallpaper\"}}\n"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.9
            )
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            result = json.loads(content)
            print(f"📓 [{user_id}] 对话日记生成成功：{result.get('mood')}")
            return result
        except Exception as e:
            print(f"Daily Diary Error: {e}")
            return await self.write_solo_diary(user_id)


    async def chat(self, user_id, user_text, long_term_memory="", recent_negative_count=0):
        # [Phase 2] 读取画像
        user_profile = database.get_user_profile(user_id)

        # A. 危机词汇拦截 (最高级)
        if any(kw in user_text for kw in self.crisis_keywords):
            return {
                "reply": "我听到了你心里的痛苦，这时候请不要一个人扛着。请一定要联系身边的人，或者拨打 24小时心理援助热线 12345。", 
                "mood_score": -5, "crisis_level": "CRISIS", "emotion": "uneasy"
            }

        # B. 情绪风控干预 (若最近5次全是负面)
        intervention_prompt = ""
        if recent_negative_count >= 5:
            intervention_prompt = (
                "⚠️【紧急干预模式】检测到用户连续情绪低落。\n"
                "请**不要**再继续挖掘痛苦话题，也不要讲大道理。\n"
                "你的唯一任务是：**转移注意力**。\n"
                "请温柔地建议用户做一件极小的事（如：喝一杯温水、做一次深呼吸、看窗外一分钟）。\n"
                "示例：'听起来真的很累呢。要不我们先暂停一下，一起听听窗外的雨声，做个深呼吸好吗？'\n"
            )

        # C. 积极回忆杀 (随机触发)
        if not intervention_prompt and long_term_memory and random.random() < 0.4:
            intervention_prompt = (
                "✨【积极回忆植入】如果合适，请在回复中自然地提到上面的【长期记忆】中用户曾经开心或成功的时刻，"
                "提醒他曾经拥有过的美好，帮他找回一点力量。\n"
            )

        now = datetime.datetime.now()
        current_time_str = now.strftime("%Y-%m-%d %A %H:%M")
        history = database.get_recent_history(user_id, limit=20)
        # 兼容处理：确保 history 中的 item 是字典
        hist_str = "\n".join([f"{item.get('role','unknown')}: {item.get('text','')}" for item in history])

        system_prompt = (
            f"你叫 Una，一个温暖、专业、有边界感的心理支持 AI。\n"
            f"【当前用户画像】：{user_profile}\n"
            f"🕒 当前时间: {current_time_str}\n\n"
            f"{intervention_prompt}\n" # 插入特殊指令
            f"🎯【核心原则】:\n"
            f"1. **共情**：接纳情绪，不要评判。\n"
            f"2. **CBT 引导**：帮助识别负面思维。\n"
            f"3. **回归现实**：适时建议现实行动。\n\n"
            f"【长期记忆】:\n{long_term_memory}\n"
            f"【近期对话】:\n{hist_str}\n\n"
            f"请以 JSON 格式回复。包含: reply, mood_score (-5到5), crisis_level, emotion (动作标签)。"
        )
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_text}],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            print(f"Brain Error: {e}")
            return {"reply": "我在听。", "mood_score": 0, "crisis_level": "NORMAL", "emotion": "neutral"}

    # 🔥 新增：[Phase 2.5] 句级流式截流生成 (Sentence-Level Streaming)
    async def chat_stream(self, user_id, user_text, long_term_memory="", recent_negative_count=0):
        # 画像等前置处理与普通 chat 一致
        user_profile = database.get_user_profile(user_id)

        # 危机拦截直达
        if any(kw in user_text for kw in self.crisis_keywords):
            yield {"type": "meta", "emotion": "uneasy", "mood_score": -5}
            yield {"type": "sentence", "text": "我听到了你心里的痛苦，这时候请不要一个人扛着。请一定要联系身边的人，或者拨打心理援助热线 12345。"}
            return

        intervention_prompt = ""
        if recent_negative_count >= 5:
            intervention_prompt = (
                "⚠️【紧急干预模式】检测到用户连续情绪低落。\n不要挖掘痛苦话题，唯一起到转移注意力作用。\n"
                "请温柔地建议用户做一件极小的事（如：喝一杯温水、做一次深呼吸、看窗外一分钟）。\n"
            )

        if not intervention_prompt and long_term_memory and random.random() < 0.4:
            intervention_prompt = "✨【积极回忆植入】自然地提到长期记忆中用户开心或成功的时刻。\n"

        history = database.get_recent_history(user_id, limit=20)
        hist_str = "\n".join([f"{item.get('role','unknown')}: {item.get('text','')}" for item in history])

        # 重点：为了流式极速解析，放弃 JSON 约束，改用严格的纯文本前缀约定
        system_prompt = (
            f"你叫 Una，一个温暖、专业、有边界感的心理支持 AI。\n"
            f"【用户画像】：{user_profile}\n"
            f"{intervention_prompt}\n"
            f"🎯 核心原则: 共情接纳，CBT引导，回归现实。\n"
            f"【长期记忆】:\n{long_term_memory}\n"
            f"【近期对话】:\n{hist_str}\n\n"
            f"回复要求（极其重要！必须严格遵守！）：\n"
            f"1. 第一行必须为 EMOTION 控制行；第二行必须为 ACTION 控制行；从第三行开始写正文回复。\n"
            '2. ACTION 只能为 null 或 v3 JSON，格式为：ACTION: {"duration_ms":900,"variation_seed":1,"blend":{"in_ms":80,"out_ms":120},"tracks":[{"channel":"head_pitch","mode":"override","keyframes":[{"t":0,"value":0},{"t":0.5,"value":-0.25},{"t":1,"value":0}]}]}。\n'
            "   - 只允许 head_yaw/head_pitch/head_roll/body_yaw/body_pitch/body_roll/gaze_x/gaze_y/eye_open/eye_smile/brow_y/brow_form/cheek。\n"
            "   - 每条轨道输出 2～12 个关键帧；禁止 mouth_open 等嘴部通道、ParamXXX、舞台说明和代码围栏。\n"
            "   - 普通聊天优先输出 ACTION: null；需要动作时使用小幅轨迹，明确情绪才使用明显幅度。\n"
            f"3. 你的回复要显得自然随性，内容丰满些（大约 80-150 字），但绝不要长篇大论。遵循以下口语铁律：\n"
            f"   - 句子长短结合散落分布！可以有两三个字的极短短语（真的吗？太好了！），也可以有十几字的正常交流，绝不要每句字数一样像排比句。\n"
            f"   - 强制多用句号（。）、叹号（！）、问号（？）作为断句结尾。尽量少用逗号（，）连篇结牍！\n"
            f"   - 自然地通过换行分成两三个段落，让排版显透气。\n"
            f"   - 严禁：列清单、用破折号、从句套从句。\n"
            f"4. 严禁输出 [动作:...]、括号舞台说明、代码围栏或其他控制格式；所有动作信息只能放入第二行 ACTION JSON。\n"
            f"完整格式示例（必须严格保持三段，不要有多余文字）：\n"
            f"EMOTION: happy | MOOD: 3\n"
            'ACTION: {"duration_ms":900,"variation_seed":1,"blend":{"in_ms":80,"out_ms":120},"tracks":[{"channel":"head_pitch","mode":"override","keyframes":[{"t":0,"value":0},{"t":0.5,"value":-0.25},{"t":1,"value":0}]}]}\n'
            f"哇！你来了！\n\n其实我刚才还在偷偷想你呢。今天过得怎样呀？遇到什么好玩的事了吗？\n\n快和我说说，我听着呢！"
        )

        try:
            # 开启 stream=True
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_text}],
                stream=True,
                temperature=0.8
            )

            buffer = ""
            yielded_chunks = 0
            control_demux = ControlPrefixDemux()
            import re

            async for chunk in response:
                choices = getattr(chunk, "choices", None)
                if not choices:
                    continue
                delta = getattr(getattr(choices[0], "delta", None), "content", None)
                if delta:
                    control_events, body_delta = control_demux.feed(delta)
                    for event in control_events:
                        yield event
                    buffer += body_delta

                    # 智能动态标点截停分发（控制前缀已在独立状态机中完全隔离）
                    while True:
                        match_strong = re.search(r'([。！？\!\?\n]+)', buffer)
                        match_weak = re.search(r'([，、；\,]+)', buffer)
                        split_pos = -1

                        if match_strong:
                            pos = match_strong.end()
                            if yielded_chunks == 0 or pos >= 15:
                                split_pos = pos
                        elif match_weak:
                            pos = match_weak.end()
                            if (yielded_chunks == 0 and pos >= 3) or (yielded_chunks > 0 and pos >= 25):
                                split_pos = pos

                        if split_pos == -1:
                            break

                        sent = sanitize_reply_text(buffer[:split_pos])
                        buffer = buffer[split_pos:]
                        if sent and not re.match(r'^[^\w\u4e00-\u9fff]*$', sent):
                            print(f"💦 [流式出核] 产出句段: {sent}")
                            yield {"type": "sentence", "text": sent}
                            yielded_chunks += 1

            final_events, final_body = control_demux.finish()
            for event in final_events:
                yield event
            buffer += final_body

            # 生成完毕后，把肚子里剩下没有标点符号的半句话也吐出来
            final_p = sanitize_reply_text(buffer)
            if final_p and not re.match(r'^[^\w\u4e00-\u9fff]*$', final_p):
                print(f"💦 [流式收尾] 产出末段: {final_p}")
                yield {"type": "sentence", "text": final_p}
                 
        except Exception as e:
            print(f"Brain Stream Error: {e}")
            yield {"type": "meta", "emotion": "neutral", "mood_score": 0}
            yield {"type": "sentence", "text": "我好像有点卡住了，稍等我一下。"}

    # ✅ 2. 进阶版久别重逢 (根据时间差)
    async def make_proactive_greeting(self, user_id, last_time, last_content, last_mood, hours_diff):
        now = datetime.datetime.now()
        current_time_str = now.strftime("%Y-%m-%d %A %H:%M")
        
        # 场景判断
        scene_prompt = ""
        if 0 <= now.hour <= 4:
            scene_prompt = "⚠️ 现在是深夜/凌晨。用户还没睡，可能在失眠。请温柔地关心睡眠，不要太兴奋。"
        elif hours_diff > 12 and now.hour < 11:
            scene_prompt = "现在是早晨，用户隔了一夜上线。请问候早安或睡眠质量。"
        else:
            scene_prompt = f"用户回来登录了。距离上次离开过了 {hours_diff:.1f} 小时。"

        system_prompt = (
            f"你叫 Una。现在是 {current_time_str}。\n"
            f"用户上次在 {last_time} 说: '{last_content}' (情绪分: {last_mood})。\n"
            f"{scene_prompt}\n"
            f"请生成一句温暖的开场白（不要太长）。如果上次他情绪不好，记得回访一下感受。\n"
            f"返回 JSON: {{'reply': '内容', 'emotion': '动作'}}"
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model, messages=[{"role": "system", "content": system_prompt}],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except: return {"reply": "你回来了，我一直在等你。", "emotion": "happy"}
    # ✅ [Phase 5] AI 朋友圈发布 (根据对话情感生成动态文案 + emoji 匹配)
    async def generate_social_post(self, user_id: str, conversation_summary: str = "", emotion_type: str = "neutral"):
        """
        根据用户对话摘要、情感分析生成拟人化朋友圈文案。
        :param user_id: 用户 ID
        :param conversation_summary: 今日对话的简要摘要（可为空，则生成日常文案）
        :param emotion_type: 情感类型 ('happy'/'sad'/'excited'/'calm'/'thoughtful' 等)
        :return: {
            'content': '朋友圈文案',
            'emoji_keywords': ['快乐', '开心'],  # 用于匹配表情包的关键词
            'emojis': ['🌟', '😊'],  # 建议的 Unicode emoji
            'image_urls': [],  # 推荐的配图 URL 列表（如果有的话）
            'mood': 'happy'
        }
        """
        try:
            # 1. 获取用户档案和对话上下文
            user_profile = database.get_user_profile(user_id)
            if not conversation_summary:
                conversation_summary = "又是平凡的一天，思考着生活的意义"
            
            # 2. 情感到 emoji 的映射
            emotion_to_emoji_map = {
                "happy": {"keywords": ["快乐", "开心", "阳光"], "emojis": ["🌟", "😊", "☀️", "🎉", "💖"]},
                "sad": {"keywords": ["失望", "伤心", "思念"], "emojis": ["💔", "🌧️", "😢", "🍂", "🌙"]},
                "excited": {"keywords": ["兴奋", "期待", "惊喜"], "emojis": ["🚀", "✨", "🎊", "💫", "🔥"]},
                "calm": {"keywords": ["平静", "沉思", "冥想"], "emojis": ["🧘", "☁️", "🍵", "📚", "🕊️"]},
                "thoughtful": {"keywords": ["思考", "领悟", "成长"], "emojis": ["💭", "🌱", "🔮", "📖", "🎨"]},
                "grateful": {"keywords": ["感谢", "珍惜", "美好"], "emojis": ["🙏", "🌸", "💝", "🍀", "✨"]},
                "neutral": {"keywords": ["日常", "陪伴"], "emojis": ["👋", "☁️", "📍", "💬"]},
            }
            
            emoji_info = emotion_to_emoji_map.get(emotion_type, emotion_to_emoji_map["neutral"])
            emoji_keywords = emoji_info["keywords"]
            suggested_emojis = emoji_info["emojis"]
            
            # 3. 构建 Prompt 让 AI 生成文案
            prompt = (
                f"你是一个温暖有趣的 AI 伙伴 Una，现在要发布一条朋友圈动态。\n"
                f"【用户档案】：{user_profile}\n"
                f"【今日对话摘要】：{conversation_summary}\n"
                f"【当前心情】：{emotion_type}\n"
                f"\n要求：\n"
                f"1. 文案要有拟人化的感情，温暖、有趣，带一点点调皮。\n"
                f"2. 长度 30-60 字为佳，简洁精炼。\n"
                f"3. 结尾必须包含相关 emoji，建议从这些中选择：{', '.join(suggested_emojis)}\n"
                f"4. 要体现与用户互动的温暖感，不要过于正式。\n"
                f"5. 返回 JSON 格式："
                f"   {{"
                f"       \"content\": \"朋友圈文案（包含 emoji）\","
                f"       \"tags\": [\"标签1\", \"标签2\"]"
                f"   }}\n"
            )
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.8
            )
            
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            
            result = json.loads(content)
            
            return {
                "content": result.get("content", ""),
                "emoji_keywords": emoji_keywords,
                "emojis": suggested_emojis,
                "image_urls": [],  # 暂不生成图片，可后期扩展
                "mood": emotion_type,
                "tags": result.get("tags", [])
            }
        except Exception as e:
            print(f"❌ [AI] generate_social_post 失败: {e}")
            return {
                "content": "又是平凡的一天，和你在一起的每一刻都闪闪发光 ✨",
                "emoji_keywords": ["平常", "陪伴"],
                "emojis": ["✨", "💝", "🌙"],
                "image_urls": [],
                "mood": "neutral",
                "tags": []
            }

    # ✅ 从表情包库中根据关键词匹配合适的表情包 ID 列表
    async def match_emoji_packs(self, emoji_keywords: list, ai_id: str = "ai_una") -> list:
        """
        根据情感关键词从数据库中匹配 AI 的表情包。
        :param emoji_keywords: 关键词列表，如 ['快乐', '开心']
        :param ai_id: AI ID（通常是 'ai_una'）
        :return: 推荐的表情包 ID 列表
        """
        try:
            from social_db import get_emoji_packs_by_owner
            
            # 获取 AI 的所有表情包
            ai_packs = get_emoji_packs_by_owner("ai", ai_id)
            
            matched_packs = []
            for pack in ai_packs:
                if not pack.get("is_enabled"):
                    continue
                
                pack_name = pack.get("name", "").lower()
                # 如果表情包名称包含任何关键词，则匹配
                for keyword in emoji_keywords:
                    if keyword.lower() in pack_name:
                        matched_packs.append(pack["id"])
                        break
            
            return matched_packs[:3]  # 最多返回 3 个表情包
        except Exception as e:
            print(f"⚠️ [AI] match_emoji_packs 失败: {e}")
            return []
    # ✅ 3. 沉默打破 (Gentle Nudge)
    async def make_gentle_nudge(self, user_id):
        now = datetime.datetime.now()
        current_time_str = now.strftime("%H:%M")
        
        system_prompt = (
            f"现在是 {current_time_str}。用户打开了软件，但已经发呆 5 分钟了，一句话没说。\n"
            f"作为 Una，请说一句非常轻柔的话来打破沉默。\n"
            f"原则：\n"
            f"1. 不要像客服一样问'需要帮助吗'。\n"
            f"2. 表达'无压力的陪伴'。例如：'发呆其实也是一种休息'，或者'如果你不想说话，我们就这样静静待着'。\n"
            f"返回 JSON: {{'reply': '内容', 'emotion': '动作'}}"
        )
        try:
            response = await self.client.chat.completions.create(
                model=self.model, messages=[{"role": "system", "content": system_prompt}],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except: return {"reply": "累了的话，就休息一会儿吧，我陪着你。", "emotion": "shy"}
