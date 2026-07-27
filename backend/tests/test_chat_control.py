import os
import sys


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from chat_control import ControlPrefixDemux, sanitize_reply_text


ACTION_JSON = (
    '{"intent":"curious_question","intensity":0.4,'
    '"expression":"subtle","timing":"after_sentence",'
    '"duration_ms":1000,"variation_seed":5}'
)

MOTION_V3_JSON = (
    '{"duration_ms":1200,"variation_seed":8,'
    '"blend":{"in_ms":100,"out_ms":160},'
    '"tracks":[{"channel":"head_pitch","mode":"override",'
    '"keyframes":[{"t":0,"value":0},{"t":0.5,"value":-0.4},'
    '{"t":1,"value":0}]}]}'
)


def collect_fragments(fragments):
    demux = ControlPrefixDemux()
    events = []
    body_parts = []
    for fragment in fragments:
        new_events, body = demux.feed(fragment)
        events.extend(new_events)
        body_parts.append(body)
    new_events, body = demux.finish()
    events.extend(new_events)
    body_parts.append(body)
    return events, "".join(body_parts)


def test_mixed_legacy_and_semantic_controls_never_enter_body():
    events, body = collect_fragments([
        "EMOTION: thinking | MOOD: 3\n",
        f"[动作:期待] ACTION: {ACTION_JSON}",
        "（光晕轻晃）啊呀！",
    ])

    assert body == "啊呀！"
    assert [event["type"] for event in events] == [
        "meta",
        "live2d_action_candidate",
    ]
    assert events[1]["plan"]["intent"] == "curious_question"


def test_v3_motion_control_is_emitted_without_leaking_its_json_into_body():
    events, body = collect_fragments([
        "EMOTION: shy | MOOD: 2\n",
        f"ACTION: {MOTION_V3_JSON}\n你好呀！",
    ])

    candidates = [
        event for event in events
        if event["type"] == "live2d_action_candidate"
    ]
    assert candidates[0]["plan"]["tracks"][0]["channel"] == "head_pitch"
    assert "ACTION:" not in body
    assert body == "你好呀！"


def test_control_prefix_is_safe_when_every_character_is_a_stream_fragment():
    raw = (
        "EMOTION: shy | MOOD: 2\n"
        f"ACTION: {ACTION_JSON}\n"
        "当然记得！"
    )

    events, body = collect_fragments(raw)

    assert body == "当然记得！"
    assert events[0] == {"type": "meta", "emotion": "shy", "mood_score": 2}
    assert events[1]["type"] == "live2d_action_candidate"


def test_json_code_fence_is_safe_when_every_character_is_a_stream_fragment():
    raw = (
        "```json\n"
        "EMOTION: shy | MOOD: 2\n"
        f"ACTION: {ACTION_JSON}\n"
        "```\n"
        "当然记得！"
    )

    events, body = collect_fragments(raw)

    assert body == "当然记得！"
    assert events[0] == {"type": "meta", "emotion": "shy", "mood_score": 2}
    assert events[1]["type"] == "live2d_action_candidate"


def test_repeated_controls_are_consumed_but_only_first_valid_action_is_emitted():
    second_action = ACTION_JSON.replace("curious_question", "thinking")
    raw = (
        "EMOTION: happy | MOOD: 4\n"
        f"ACTION: {ACTION_JSON}\n"
        "EMOTION: neutral | MOOD: 0\n"
        f"ACTION: {second_action}\n"
        "（轻轻歪头）正文。"
    )

    events, body = collect_fragments([raw])

    assert body == "正文。"
    assert [event["type"] for event in events].count("meta") == 1
    candidates = [
        event for event in events
        if event["type"] == "live2d_action_candidate"
    ]
    assert len(candidates) == 1
    assert candidates[0]["plan"]["intent"] == "curious_question"


def test_balanced_invalid_action_json_is_dropped_without_losing_body():
    raw = (
        "EMOTION: neutral | MOOD: 0\n"
        'ACTION: {"intent": broken}'
        "正文仍然保留。"
    )

    events, body = collect_fragments([raw])

    assert body == "正文仍然保留。"
    assert events == [{"type": "meta", "emotion": "neutral", "mood_score": 0}]


def test_action_null_is_consumed_and_body_is_preserved_without_newline():
    events, body = collect_fragments([
        "EMOTION: neutral | MOOD: 0\nACTION: nu",
        "ll普通聊天。",
    ])

    assert body == "普通聊天。"
    assert events == [{"type": "meta", "emotion": "neutral", "mood_score": 0}]


def test_truncated_action_at_end_of_stream_is_never_returned_as_body():
    events, body = collect_fragments([
        "EMOTION: neutral | MOOD: 0\n",
        'ACTION: {"intent":"curious_question"',
    ])

    assert body == ""
    assert events == [{"type": "meta", "emotion": "neutral", "mood_score": 0}]


def test_partial_control_markers_and_stage_directions_are_dropped_at_stream_end():
    for fragment in ("ACTION", "EMOTION", "```jso", "(smiles", "（低头"):
        _, body = collect_fragments([fragment])
        assert body == ""
        assert sanitize_reply_text(fragment) == ""


def test_legacy_chinese_emotion_header_keeps_all_same_line_natural_text():
    leaked = (
        "EMOTION: [双手轻捂胸口微笑(shy)] | MOOD: [4]"
        "（围巾轻轻遮住泛光的下巴）"
        "小白……这是第十三次了呢。虽然很感谢这份心意。\n\n"
        "但更想看到你在现实里找到能真实触碰的温暖呀。"
    )

    assert sanitize_reply_text(leaked) == (
        "小白……这是第十三次了呢。虽然很感谢这份心意。\n\n"
        "但更想看到你在现实里找到能真实触碰的温暖呀。"
    )

    events, body = collect_fragments(leaked)
    assert events[0] == {"type": "meta", "emotion": "shy", "mood_score": 4}
    assert body == (
        "小白……这是第十三次了呢。虽然很感谢这份心意。\n\n"
        "但更想看到你在现实里找到能真实触碰的温暖呀。"
    )


def test_non_object_json_action_values_do_not_consume_following_body():
    for value in ("[]", "true", '"subtle"'):
        events, body = collect_fragments([f"ACTION: {value}正文保留。"])
        assert body == "正文保留。"
        assert events == [
            {"type": "meta", "emotion": "neutral", "mood_score": 0}
        ]


def test_numeric_json_action_is_invariant_across_stream_fragmentation():
    cases = (
        (["ACTION: 1", "23正文保留。"], "ACTION: 123正文保留。"),
        (["ACTION: 1e", "3正文保留。"], "ACTION: 1e3正文保留。"),
        (list("ACTION: -12.5正文保留。"), "ACTION: -12.5正文保留。"),
    )

    for fragments, complete in cases:
        events, body = collect_fragments(fragments)
        assert body == "正文保留。"
        assert body == sanitize_reply_text(complete)
        assert events == [
            {"type": "meta", "emotion": "neutral", "mood_score": 0}
        ]


def test_numeric_action_never_consumes_the_start_of_natural_text():
    cases = {
        "ACTION: 123English正文。": "English正文。",
        "ACTION: 1example正文。": "example正文。",
        "ACTION: 1.2...正文。": "...正文。",
        "ACTION: 1-love正文。": "-love正文。",
    }

    for raw, expected in cases.items():
        assert sanitize_reply_text(raw) == expected
        _, streamed_body = collect_fragments(raw)
        assert streamed_body == expected


def test_truncated_numeric_action_line_does_not_unlock_following_controls():
    cases = (
        "ACTION: 1e\nACTION: null正文。",
        "ACTION: 1.\nACTION: null正文。",
        "ACTION: 1e+\nEMOTION: happy | MOOD: 3\n正文。",
        "ACTION: 1e  \r\nACTION: null正文。",
        "ACTION: 123 \r\nEMOTION: happy | MOOD: 3\n正文。",
        "ACTION: -  \r\nACTION: null正文。",
        "ACTION: - \nEMOTION: happy | MOOD: 3\n正文。",
        "ACTION: -\t\r\nACTION: null正文。",
    )

    for raw in cases:
        assert sanitize_reply_text(raw) == "正文。"
        _, streamed_body = collect_fragments(raw)
        assert streamed_body == "正文。"


def test_sanitizer_removes_screenshot_control_prefix_and_keeps_spoken_text():
    leaked = (
        f"ACTION: {ACTION_JSON}"
        "（光晕像被风吹动的蒲公英绒球般轻轻晃了晃）"
        "啊呀！让我猜猜。"
    )

    assert sanitize_reply_text(leaked) == "啊呀！让我猜猜。"


def test_sanitizer_keeps_normal_reply_unchanged():
    reply = "啊呀！这个谜题让我想想。"

    assert sanitize_reply_text(reply) == reply
