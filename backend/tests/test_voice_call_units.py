import os
import sys


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from voice_call_units import VoiceSpeechUnitPlanner


def texts(units):
    return [(unit.index, unit.text) for unit in units]


def test_short_first_sentence_waits_for_more_text_or_120_ms():
    planner = VoiceSpeechUnitPlanner(first_min_chars=8, first_wait_ms=120)
    assert planner.add_sentence("哎呀！", "happy", now_ms=0) == []
    assert planner.flush_due(now_ms=119) == []
    assert texts(planner.flush_due(now_ms=120)) == [(0, "哎呀！")]


def test_next_sentence_completes_short_first_unit_without_waiting():
    planner = VoiceSpeechUnitPlanner(first_min_chars=8, first_wait_ms=120)
    planner.add_sentence("嗯。", "gentle", now_ms=0)
    units = planner.add_sentence("我在这里陪你。", "gentle", now_ms=20)
    assert texts(units) == [(0, "嗯。我在这里陪你。")]


def test_first_unit_waits_for_strong_boundary_until_hard_limit():
    planner = VoiceSpeechUnitPlanner(first_min_chars=8, first_hard_limit=40)

    assert planner.add_sentence("甲" * 12, "neutral", now_ms=0) == []
    assert texts(planner.add_sentence("乙。", "neutral", now_ms=20)) == [
        (0, "甲" * 12 + "乙。"),
    ]


def test_first_and_later_hard_limits_keep_indices_contiguous():
    planner = VoiceSpeechUnitPlanner()
    first = planner.add_sentence("甲" * 45, "neutral", now_ms=0)
    later = planner.add_sentence("乙" * 81, "neutral", now_ms=1)
    tail = planner.close(now_ms=2)

    all_units = first + later + tail
    assert [unit.index for unit in all_units] == list(range(len(all_units)))
    assert len(all_units[0].text) == 40
    assert all(len(unit.text) <= 80 for unit in all_units[1:])
    assert "".join(unit.text for unit in all_units) == "甲" * 45 + "乙" * 81


def test_later_unit_prefers_safe_boundary_between_target_and_soft_limit():
    planner = VoiceSpeechUnitPlanner()
    planner.add_sentence("第一句话足够长。", "gentle", now_ms=0)
    prefix = "甲" * 39 + "。"
    suffix = "乙" * 10 + "。"
    units = planner.add_sentence(prefix + suffix, "gentle", now_ms=1)

    assert texts(units) == [(1, prefix + suffix)]


def test_close_never_drops_unpunctuated_tail():
    planner = VoiceSpeechUnitPlanner()
    planner.add_sentence("短句", "neutral", now_ms=0)
    assert texts(planner.close(now_ms=1)) == [(0, "短句")]
