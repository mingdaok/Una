import json

import pytest

from voice_call_protocol import (
    INPUT_SAMPLE_RATE,
    MAX_INPUT_BYTES,
    MAX_PCM_CHUNK_BYTES,
    MAX_SEQUENCE,
    MAX_TURN_ID,
    BinaryFrameHeader,
    PcmFormat,
    ProtocolError,
    parse_client_event,
)


def test_pcm_format_accepts_the_fixed_16khz_mono_pcm16_contract():
    assert PcmFormat(sample_rate=INPUT_SAMPLE_RATE, channels=1, sample_width=2) == PcmFormat(16000, 1, 2)


@pytest.mark.parametrize(
    ("field", "value"),
    [("sample_rate", 8000), ("channels", 2), ("sample_width", 1)],
)
def test_pcm_format_rejects_values_outside_the_fixed_contract(field, value):
    values = {"sample_rate": INPUT_SAMPLE_RATE, "channels": 1, "sample_width": 2}
    values[field] = value

    with pytest.raises(ProtocolError, match=field):
        PcmFormat(**values)


@pytest.mark.parametrize("value", [True, 16000.0])
def test_pcm_format_rejects_non_integer_sample_rate_before_fixed_value_check(value):
    with pytest.raises(ProtocolError, match="sample_rate.*整数"):
        PcmFormat(sample_rate=value, channels=1, sample_width=2)


def test_binary_header_accepts_the_largest_valid_pcm16_chunk():
    header = BinaryFrameHeader(
        session_id="s1",
        direction="input",
        turn_id=1,
        sequence=MAX_SEQUENCE,
        byte_length=MAX_PCM_CHUNK_BYTES,
    )

    assert header.byte_length == MAX_PCM_CHUNK_BYTES


def test_binary_header_rejects_odd_or_oversized_pcm():
    with pytest.raises(ProtocolError, match="偶数字节"):
        BinaryFrameHeader(session_id="s1", direction="input", turn_id=1, sequence=0, byte_length=3)
    with pytest.raises(ProtocolError, match="65536"):
        BinaryFrameHeader(session_id="s1", direction="input", turn_id=1, sequence=0, byte_length=65538)


@pytest.mark.parametrize(
    ("field", "value"),
    [("session_id", " "), ("direction", "sideways"), ("turn_id", 0), ("sequence", MAX_SEQUENCE + 1)],
)
def test_binary_header_rejects_invalid_identity_and_sequence_values(field, value):
    values = {"session_id": "s1", "direction": "output", "turn_id": 1, "sequence": 0, "byte_length": 320}
    values[field] = value

    with pytest.raises(ProtocolError, match=field):
        BinaryFrameHeader(**values)


def test_client_events_accept_only_documented_fields_and_value_domains():
    assert parse_client_event('{"type":"call_start"}') == {"type": "call_start"}
    assert parse_client_event('{"type":"pong"}') == {"type": "pong"}
    assert parse_client_event('{"type":"user_speech_end","session_id":"s1","turn_id":7}') == {
        "type": "user_speech_end", "session_id": "s1", "turn_id": 7,
    }
    assert parse_client_event(
        '{"type":"input_audio_chunk","session_id":"s1","turn_id":7,"sequence":0,"byte_length":320}'
    ) == {"type": "input_audio_chunk", "session_id": "s1", "turn_id": 7, "sequence": 0, "byte_length": 320}

    with pytest.raises(ProtocolError, match="未知字段"):
        parse_client_event('{"type":"call_start","debug":true}')
    with pytest.raises(ProtocolError, match="未知事件"):
        parse_client_event('{"type":"not_a_call_event"}')
    with pytest.raises(ProtocolError, match="turn_id"):
        parse_client_event('{"type":"user_speech_start","session_id":"s1","turn_id":0}')
    with pytest.raises(ProtocolError, match="sequence"):
        parse_client_event(
            '{"type":"input_audio_chunk","session_id":"s1","turn_id":1,"sequence":4096,"byte_length":320}'
        )
    with pytest.raises(ProtocolError, match="65536"):
        parse_client_event(
            '{"type":"input_audio_chunk","session_id":"s1","turn_id":1,"sequence":0,"byte_length":65538}'
        )


def test_speech_start_requires_positive_monotonic_turn_id():
    event = parse_client_event('{"type":"user_speech_start","session_id":"s1","turn_id":7}')
    assert event == {"type": "user_speech_start", "session_id": "s1", "turn_id": 7}
    with pytest.raises(ProtocolError, match="turn_id"):
        parse_client_event('{"type":"user_speech_start","session_id":"s1","turn_id":0}')


def test_speech_start_requires_a_positive_safe_integer_turn_id():
    event = parse_client_event(
        f'{{"type":"user_speech_start","session_id":"s1","turn_id":{MAX_TURN_ID}}}'
    )

    assert event["turn_id"] == MAX_TURN_ID
    with pytest.raises(ProtocolError, match="turn_id"):
        parse_client_event(
            f'{{"type":"user_speech_start","session_id":"s1","turn_id":{MAX_TURN_ID + 1}}}'
        )


def test_client_control_messages_are_limited_to_8kib():
    raw = json.dumps({"type": "call_start", "padding": "x" * 8192})

    with pytest.raises(ProtocolError, match="8192"):
        parse_client_event(raw)


def test_total_input_cap_is_a_protocol_constant():
    assert MAX_INPUT_BYTES == 960000
