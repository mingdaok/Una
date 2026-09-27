"""Protocol identity is distinct from untrusted display names and message text."""
import json


def group_record(group_id, sender, content, *, name="", role="user", message_id=None,
                 mentions=(), reply=None):
    return {
        "group_id": str(group_id),
        "message_id": message_id,
        "speaker": {"id": f"qq:group:{group_id}:member:{sender}",
                    "display_name": name or ("UNA" if role == "assistant" else "未提供昵称"),
                    "role": "assistant" if role == "assistant" else "member"},
        "mentions": ["all" if str(m) == "all" else f"qq:group:{group_id}:member:{m}" for m in mentions],
        "reply_to": reply,
        "content": content,
    }


def serialize(record):
    return json.dumps(record, ensure_ascii=False)
