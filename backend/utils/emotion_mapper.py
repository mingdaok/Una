class Live2DEmotionMapper:
    """
    [Hiyori Pro Mic 专属] 情感映射器
    对应 model3.json 中定义的动作组 (Groups)
    """
    def __init__(self):
        # 核心映射表：Key = AI输出的标签(小写), Value = Live2D模型里的动作组名(区分大小写)
        self.emotion_map = {
            # --- 基础状态 ---
            "neutral": "Neutral",   # 对应 Hiyori_m01
            "idle": "Idle",         # 对应 Hiyori_m01
            
            # --- 积极情绪 (对应 Hiyori_m02) ---
            "happy": "Happy",
            "joy": "Happy",
            "excited": "Happy",
            "laugh": "Happy",
            "funny": "Happy",
            "smile": "Happy",
            
            # --- 思考/疑惑 (对应 Hiyori_m03) ---
            "thinking": "Thinking",
            "confused": "Thinking",
            "doubt": "Thinking",
            "query": "Thinking",
            
            # --- 悲伤/消极 (对应 Hiyori_m04) ---
            "sad": "Sad",
            "cry": "Sad",
            "depressed": "Sad",
            "grief": "Sad",
            "disappointed": "Sad",
            "sorry": "Sad",
            
            # --- 愤怒/反感 (对应 Hiyori_m05) ---
            "angry": "Angry",
            "mad": "Angry",
            "disgusted": "Angry",
            "hate": "Angry",
            "annoyed": "Angry",
            
            # --- 惊讶 (对应 Hiyori_m06) ---
            "surprised": "Surprised",
            "shocked": "Surprised",
            "wow": "Surprised",
            
            # --- 害羞 (对应 Hiyori_m07) ---
            "shy": "Shy",
            "blush": "Shy",
            "cute": "Shy",
            
            # --- 不安/恐惧 (对应 Hiyori_m08) ---
            # Hiyori 模型没有 "Fear" 组，用 "Uneasy" 代替
            "uneasy": "Uneasy",
            "fear": "Uneasy",
            "fearful": "Uneasy",
            "nervous": "Uneasy",
            "scared": "Uneasy",
            "worried": "Uneasy",
            
            # --- 严肃 (对应 Hiyori_m09, m10) ---
            "serious": "Serious",
            "focus": "Serious",
            "stern": "Serious",
            
            # --- 唱歌 (对应 singing.motion3.json) ---
            "singing": "Singing",
            "sing": "Singing",
            "song": "Singing"
        }

    def get_motion_file(self, emotion_tag: str) -> str:
        """
        根据情感标签返回动作组名称
        """
        if not emotion_tag:
            return "Neutral"
            
        # 1. 预处理：转小写，去空格
        tag = emotion_tag.lower().strip()
        
        # 2. 查找映射
        # 如果找不到对应的 key，默认返回 'Neutral'
        motion_group = self.emotion_map.get(tag, "Neutral")
        
        return motion_group