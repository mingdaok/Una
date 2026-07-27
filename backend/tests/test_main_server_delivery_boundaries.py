import ast
from pathlib import Path


def test_vision_reply_is_sanitized_before_any_async_delivery():
    source_path = Path(__file__).resolve().parents[1] / "main_server.py"
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    vision_function = next(
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "vision_chat_api"
    )

    reply_assignment = next(
        node
        for node in vision_function.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "reply_text"
            for target in node.targets
        )
    )

    assert isinstance(reply_assignment.value, ast.Call)
    assert isinstance(reply_assignment.value.func, ast.Name)
    assert reply_assignment.value.func.id == "sanitize_reply_text"
