"""QQ configuration. Disabled by default; secrets never serialized to clients."""

from dataclasses import dataclass, field
import os
from pathlib import Path


@dataclass(frozen=True)
class QQConfig:
    enabled: bool = False
    token: str = field(default="", repr=False)
    bot_id: str = ""
    users: tuple[str, ...] = ()
    groups: tuple[str, ...] = ()
    admins: tuple[str, ...] = ()
    concurrency: int = 2
    queue_limit: int = 100
    llm_timeout: float = 45
    send_timeout: float = 10
    media_dir: str = ""
    test_reply_percent: int = 0
    media_dns_fallback: bool = True
    media_hosts: tuple[str, ...] = (
        "multimedia.nt.qq.com",
        "multimedia.nt.qq.com.cn",
        "gchat.qpic.cn",
        "c2cpicdw.qpic.cn",
    )

    @property
    def error(self):
        if self.enabled and (len(self.token) < 32 or not self.bot_id.isdigit()):
            return "QQ 配置错误：需要至少 32 字符的专用令牌及数字机器人 QQ 号"
        return None

    @classmethod
    def load(cls):
        def items(name):
            return tuple(x.strip() for x in os.getenv(name, "").split(",") if x.strip())

        return cls(
            enabled=os.getenv("UNA_QQ_ENABLED", "false").lower() == "true",
            media_dns_fallback=os.getenv("UNA_QQ_MEDIA_DNS_FALLBACK", "true").lower() == "true",
            test_reply_percent=max(0, min(100, int(os.getenv("UNA_QQ_TEST_REPLY_PERCENT", "0")))),
            token=os.getenv("UNA_QQ_ONEBOT_TOKEN", ""),
            bot_id=os.getenv("UNA_QQ_BOT_ID", ""),
            users=items("UNA_QQ_ALLOWED_USERS"),
            groups=items("UNA_QQ_ALLOWED_GROUPS"),
            admins=items("UNA_QQ_ADMIN_IDS"),
            concurrency=max(1, min(8, int(os.getenv("UNA_QQ_MAX_CONCURRENCY", "2")))),
            queue_limit=max(1, int(os.getenv("UNA_QQ_QUEUE_LIMIT", "100"))),
            llm_timeout=max(
                1, min(180, float(os.getenv("UNA_QQ_LLM_TIMEOUT_SECONDS", "45")))
            ),
            send_timeout=max(
                1, min(60, float(os.getenv("UNA_QQ_SEND_TIMEOUT_SECONDS", "10")))
            ),
            media_dir=os.getenv(
                "UNA_QQ_MEDIA_DIR",
                str(Path(__file__).resolve().parents[1] / "data" / "qq-media"),
            ),
            media_hosts=items("UNA_QQ_MEDIA_HOSTS") or cls.media_hosts,
        )
