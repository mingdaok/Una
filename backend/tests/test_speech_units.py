from speech_units import SpeechUnitAggregator


def test_first_readable_chunk_is_emitted_immediately():
    aggregator = SpeechUnitAggregator()

    units = aggregator.add("你好呀！", "happy", now_ms=1000)

    assert [(unit.index, unit.text) for unit in units] == [(0, "你好呀！")]
    assert units[0].emotion == "happy"
    assert units[0].created_at_ms == 1000
    assert units[0].aggregate_wait_ms == 0


def test_first_chunk_seals_at_the_first_readable_sentence_boundary():
    aggregator = SpeechUnitAggregator()
    source = "第一句。第二句。"

    first_units = aggregator.add(source, "neutral", now_ms=0)
    tail_units = aggregator.close(now_ms=1)

    assert [(unit.index, unit.text) for unit in first_units] == [(0, "第一句。")]
    assert [(unit.index, unit.text) for unit in tail_units] == [(1, "第二句。")]
    assert "".join(unit.text for unit in first_units + tail_units) == source


def test_later_chunks_merge_until_debounce_expires():
    aggregator = SpeechUnitAggregator()
    aggregator.add("首句。", "neutral", now_ms=0)

    assert aggregator.add("第二句。", "neutral", now_ms=50) == []
    assert aggregator.add("第三句。", "neutral", now_ms=120) == []
    assert aggregator.flush_due(now_ms=319) == []

    units = aggregator.flush_due(now_ms=320)

    assert [unit.text for unit in units] == ["第二句。第三句。"]
    assert [(unit.created_at_ms, unit.aggregate_wait_ms) for unit in units] == [(320, 270)]


def test_hard_limit_splits_without_losing_or_reordering_text():
    aggregator = SpeechUnitAggregator(hard_max_chars=80)
    aggregator.add("首句。", "neutral", now_ms=0)
    source = "甲" * 50 + "乙" * 50

    units = aggregator.add(source, "neutral", now_ms=1)
    units += aggregator.close(now_ms=2)

    assert "".join(unit.text for unit in units) == source
    assert all(len(unit.text) <= 80 for unit in units)
    assert [unit.index for unit in units] == [1, 2]


def test_blank_and_single_line_control_text_do_not_emit_units():
    aggregator = SpeechUnitAggregator()

    assert aggregator.add(" \t\n ", "neutral", now_ms=0) == []
    assert aggregator.add(' ACTION:{"intent":"nod"} ', "neutral", now_ms=1) == []
    assert aggregator.add('EMOTION:{"name":"happy"}', "neutral", now_ms=2) == []
    assert aggregator.close(now_ms=3) == []


def test_mixed_control_header_and_natural_body_is_preserved_verbatim():
    aggregator = SpeechUnitAggregator()
    text = 'ACTION:{"intent":"nod"}\n自然正文。'

    units = aggregator.add(text, "neutral", now_ms=0)

    assert [unit.text for unit in units] == [text]


def test_target_sized_later_chunk_is_emitted_without_waiting_for_debounce():
    aggregator = SpeechUnitAggregator(target_min_chars=40, target_max_chars=60)
    aggregator.add("首句。", "neutral", now_ms=0)

    units = aggregator.add("甲" * 40, "neutral", now_ms=10)

    assert [unit.text for unit in units] == ["甲" * 40]
    assert [(unit.index, unit.created_at_ms, unit.aggregate_wait_ms) for unit in units] == [
        (1, 10, 0)
    ]


def test_close_emits_a_short_pending_tail():
    aggregator = SpeechUnitAggregator()
    aggregator.add("首句。", "neutral", now_ms=0)
    assert aggregator.add("尾段", "neutral", now_ms=10) == []

    units = aggregator.close(now_ms=25)

    assert [(unit.index, unit.text, unit.aggregate_wait_ms) for unit in units] == [
        (1, "尾段", 15)
    ]


def test_different_emotions_are_not_merged_into_one_unit():
    aggregator = SpeechUnitAggregator()
    aggregator.add("首句。", "neutral", now_ms=0)
    assert aggregator.add("低落", "sad", now_ms=10) == []

    units = aggregator.add("开心", "happy", now_ms=30)
    units += aggregator.close(now_ms=40)

    assert [(unit.text, unit.emotion) for unit in units] == [
        ("低落", "sad"),
        ("开心", "happy"),
    ]
