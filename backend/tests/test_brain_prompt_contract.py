from pathlib import Path


def test_brain_prompt_uses_parser_compatible_control_examples():
    source = (
        Path(__file__).resolve().parents[1] / "brain_engine.py"
    ).read_text(encoding="utf-8")

    assert "EMOTION: happy | MOOD: 3" in source
    assert "ACTION: null 或 subtle" not in source
    assert "subtle 是 expression 字段" in source
