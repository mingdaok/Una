import ast
import asyncio
import copy
from pathlib import Path

from live2d_motion import is_motion_v3_candidate


def test_websocket_model_is_normalized_and_propagated_to_all_delivery_boundaries():
    source_path = Path(__file__).resolve().parents[1] / "main_server.py"
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    process_function = next(
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "process_and_push_response"
    )
    websocket_function = next(
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "websocket_endpoint"
    )

    process_args = [argument.arg for argument in process_function.args.args]
    assert process_args == ["user_text", "user_id", "live2d_model"]
    assert isinstance(process_function.args.defaults[-1], ast.Constant)
    assert process_function.args.defaults[-1].value is None

    chat_stream_call = next(
        node for node in ast.walk(process_function)
        if isinstance(node, ast.Call)
        and ast.unparse(node.func) == "brain.chat_stream"
    )
    assert any(
        keyword.arg == "live2d_model" and ast.unparse(keyword.value) == "live2d_model"
        for keyword in chat_stream_call.keywords
    )

    delivery_demux_call = next(
        node for node in ast.walk(process_function)
        if isinstance(node, ast.Call)
        and ast.unparse(node.func) == "ControlPrefixDemux"
    )
    assert any(
        keyword.arg == "live2d_model" and ast.unparse(keyword.value) == "live2d_model"
        for keyword in delivery_demux_call.keywords
    )

    motion_decide_call = next(
        node for node in ast.walk(process_function)
        if isinstance(node, ast.Call)
        and ast.unparse(node.func) == "motion_director.decide"
    )
    assert [ast.unparse(argument) for argument in motion_decide_call.args] == [
        "user_id", "plan", "live2d_model",
    ]

    normalize_calls = [
        node for node in ast.walk(websocket_function)
        if isinstance(node, ast.Call)
        and ast.unparse(node.func) == "normalize_live2d_model"
    ]
    assert any(
        ast.unparse(node.args[0]) == "data.get('live2d_model')"
        for node in normalize_calls
    )
    response_calls = [
        node for node in ast.walk(websocket_function)
        if isinstance(node, ast.Call)
        and ast.unparse(node.func) == "process_and_push_response"
    ]
    assert any(
        any(
            keyword.arg == "live2d_model"
            and ast.unparse(keyword.value) == "live2d_model"
            for keyword in node.keywords
        )
        for node in response_calls
    )


class StubDirector:
    def __init__(self, event):
        self.calls = []
        self.event = event

    def decide(self, user_id, plan, model_name=None):
        self.calls.append((user_id, plan, model_name))
        return self.event


class StubWebSocketManager:
    def __init__(self):
        self.events = []

    async def broadcast_to_user(self, user_id, event):
        self.events.append((user_id, event))


def compile_live2d_candidate_route():
    source_path = Path(__file__).resolve().parents[1] / "main_server.py"
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    response_function = next(
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "process_and_push_response"
    )
    candidate_branch = next(
        node
        for node in ast.walk(response_function)
        if isinstance(node, ast.If)
        and ast.unparse(node.test) == "item['type'] == 'live2d_action_candidate'"
    )
    route_function = ast.AsyncFunctionDef(
        name="route_live2d_candidate",
        args=ast.arguments(
            posonlyargs=[],
            args=[
                ast.arg(arg="item"),
                ast.arg(arg="user_id"),
                ast.arg(arg="action_director"),
                ast.arg(arg="motion_director"),
                ast.arg(arg="ws_manager"),
                ast.arg(arg="live2d_model"),
            ],
            kwonlyargs=[],
            kw_defaults=[],
            defaults=[ast.Constant(value=None)],
        ),
        body=copy.deepcopy(candidate_branch.body),
        decorator_list=[],
    )
    module = ast.fix_missing_locations(ast.Module(
        body=[route_function],
        type_ignores=[],
    ))
    namespace = {"is_motion_v3_candidate": is_motion_v3_candidate}
    exec(compile(module, str(source_path), "exec"), namespace)
    return namespace["route_live2d_candidate"]


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


def test_tracks_candidate_routes_only_to_v3_motion_director():
    route_live2d_candidate = compile_live2d_candidate_route()
    motion_plan = {
        "duration_ms": 1200,
        "tracks": [{"channel": "head_pitch"}],
    }
    action_director = StubDirector({"type": "live2d_action_v2"})
    motion_director = StubDirector({"type": "live2d_motion_v3"})
    ws_manager = StubWebSocketManager()

    asyncio.run(route_live2d_candidate(
        {"type": "live2d_action_candidate", "plan": motion_plan},
        "test-user",
        action_director,
        motion_director,
        ws_manager,
    ))

    assert action_director.calls == []
    assert motion_director.calls == [("test-user", motion_plan, None)]
    assert ws_manager.events == [
        ("test-user", {"type": "live2d_motion_v3"}),
    ]


def test_runtime_model_profile_reaches_v3_director_for_each_supported_model():
    route_live2d_candidate = compile_live2d_candidate_route()
    motion_plan = {
        "duration_ms": 1200,
        "tracks": [{"channel": "head_pitch"}],
    }

    for model_name in ("hiyori", "panda_cake"):
        action_director = StubDirector({"type": "live2d_action_v2"})
        motion_director = StubDirector({"type": "live2d_motion_v3"})
        ws_manager = StubWebSocketManager()

        asyncio.run(route_live2d_candidate(
            {"type": "live2d_action_candidate", "plan": motion_plan},
            "test-user",
            action_director,
            motion_director,
            ws_manager,
            model_name,
        ))

        assert action_director.calls == []
        assert motion_director.calls == [
            ("test-user", motion_plan, model_name),
        ]
