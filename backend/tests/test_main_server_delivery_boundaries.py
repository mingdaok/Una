import asyncio
import importlib
import json
import os
import sys
import types
from types import SimpleNamespace

import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from speech_metrics import SpeechTrace


def module_with(name, **attributes):
    module = types.ModuleType(name)
    for key, value in attributes.items():
        setattr(module, key, value)
    return module


class EmptyService:
    def __init__(self, *args, **kwargs):
        pass


@pytest.fixture
def main_server(monkeypatch):
    class FakeBrain:
        def __init__(self, *args, **kwargs):
            pass

        async def update_profile_task(self, *args):
            pass

    async def fake_generate_audio(*args, **kwargs):
        return None, []

    class FakeScheduler:
        def __init__(self, *args, **kwargs):
            pass

        def add_job(self, *args, **kwargs):
            pass

        def start(self):
            pass

        def shutdown(self):
            pass

    memory_package = module_with("memory")
    memory_package.__path__ = []
    apscheduler_package = module_with("apscheduler")
    apscheduler_package.__path__ = []
    schedulers_package = module_with("apscheduler.schedulers")
    schedulers_package.__path__ = []
    triggers_package = module_with("apscheduler.triggers")
    triggers_package.__path__ = []
    fake_modules = {
        "apscheduler": apscheduler_package,
        "apscheduler.schedulers": schedulers_package,
        "apscheduler.schedulers.asyncio": module_with(
            "apscheduler.schedulers.asyncio", AsyncIOScheduler=FakeScheduler
        ),
        "apscheduler.triggers": triggers_package,
        "apscheduler.triggers.cron": module_with(
            "apscheduler.triggers.cron", CronTrigger=EmptyService
        ),
        "memory": memory_package,
        "memory.service": module_with("memory.service", MemoryService=EmptyService),
        "database": module_with(
            "database", get_recent_mood_scores=lambda *args: [],
            add_message=lambda *args: None,
        ),
        "social_db": module_with("social_db"),
        "diary_service": module_with("diary_service", DiaryService=EmptyService),
        "vision_service": module_with("vision_service", VisionService=EmptyService),
        "social_api": module_with("social_api", router=APIRouter()),
        "auth_api": module_with(
            "auth_api", auth_service=SimpleNamespace(), get_current_user=lambda: None,
            router=APIRouter(),
        ),
        "media_service": module_with(
            "media_service", register_media=lambda *args: {"id": "media"},
            media_url=lambda media_id, user_id: f"/api/media/{media_id}",
            sign_history_audio_urls=lambda history, user_id: history, router=APIRouter(),
        ),
        "settings": module_with("settings", settings=SimpleNamespace(cors_origins=())),
        "brain_engine": module_with("brain_engine", UnaBrain=FakeBrain),
        "asr_engine": module_with("asr_engine", SenseVoiceASR=EmptyService),
        "tts_service": module_with(
            "tts_service",
            generate_audio_gsv=fake_generate_audio,
            GSV_URL="http://127.0.0.1:9880/tts",
            build_gsv_payload=lambda *args, **kwargs: {},
        ),
    }
    for name, fake_module in fake_modules.items():
        monkeypatch.setitem(sys.modules, name, fake_module)

    import_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(import_loop)
    sys.modules.pop("main_server", None)
    imported = importlib.import_module("main_server")
    yield imported
    imported.executor.shutdown(wait=False, cancel_futures=True)
    sys.modules.pop("main_server", None)
    asyncio.set_event_loop(None)
    import_loop.close()


def run_scenario(coroutine):
    asyncio.run(asyncio.wait_for(coroutine, timeout=2.0))


def test_voice_call_router_is_separate_and_lifespan_closes_runtime(main_server, monkeypatch):
    route_paths = [getattr(route, "path", None) for route in main_server.app.routes]
    assert "/ws/voice-call" in route_paths

    closed = []

    async def close_voice_call_service():
        closed.append(True)

    monkeypatch.setattr(main_server.voice_call_service, "close", close_voice_call_service)

    async def scenario():
        async with main_server.lifespan(main_server.app):
            assert closed == []
        assert closed == [True]

    run_scenario(scenario())


def test_voice_call_worklet_and_vad_assets_are_mounted_at_frontend_urls(main_server):
    mounts = {
        getattr(route, "path", None): route
        for route in main_server.app.routes
    }

    assert "/voice" in mounts
    assert "/vad" in mounts
    assert os.path.isfile(os.path.join(main_server.VOICE_DIR, "pcm-capture.worklet.js"))
    assert os.path.isfile(os.path.join(main_server.VAD_DIR, "silero_vad_v5.onnx"))
    assert os.path.isfile(os.path.join(main_server.VAD_DIR, "vad.worklet.bundle.min.js"))

    client = TestClient(main_server.app)
    worklet = client.get("/voice/pcm-capture.worklet.js")
    vad_model = client.get("/vad/silero_vad_v5.onnx")
    vad_worklet = client.get("/vad/vad.worklet.bundle.min.js")
    ort_module = client.get("/vad/ort-wasm-simd-threaded.mjs")
    ort_wasm = client.get("/vad/ort-wasm-simd-threaded.wasm")

    assert worklet.status_code == 200
    assert vad_model.status_code == 200
    assert vad_worklet.status_code == 200
    assert ort_module.status_code == 200
    assert ort_wasm.status_code == 200
    assert ort_module.headers["content-type"].startswith("text/javascript")
    assert vad_model.headers["content-type"] == "application/octet-stream"
    assert ort_wasm.headers["content-type"] == "application/wasm"


def test_send_ai_reply_chunk_forwards_trace_and_returns_true(main_server, monkeypatch):
    broadcasts = []
    received_traces = []

    async def scenario():
        async def generate(text, emotion, *, trace=None):
            received_traces.append(trace)
            return "/static/voice/test.wav", [{"start": 0.0, "end": 0.1}]

        async def broadcast(user_id, event):
            broadcasts.append((user_id, event))

        monkeypatch.setattr(main_server, "generate_audio_file", generate)
        monkeypatch.setattr(main_server, "protect_generated_audio", lambda user_id, path: path)
        manager = main_server.ConnectionManager()
        manager.broadcast_to_user = broadcast
        session = await main_server.speech_stream_coordinator.begin(
            "user-1", "reply-1", lambda unit, trace: asyncio.sleep(0, result=True)
        )
        trace = SpeechTrace(reply_id="reply-1", chunk_index=3)

        rendered = await manager.send_ai_reply_chunk(
            "可播放。", "happy", "user-1", 3, reply_id="reply-1", trace=trace
        )

        assert rendered is True
        await session.cancel()

    run_scenario(scenario())
    assert received_traces == [SpeechTrace(reply_id="reply-1", chunk_index=3)]
    assert broadcasts[0][1]["reply_id"] == "reply-1"
    assert broadcasts[0][1]["chunk_index"] == 3


def test_send_ai_reply_chunk_returns_false_when_generation_fails(main_server, monkeypatch):
    broadcasts = []

    async def scenario():
        async def generate(text, emotion, *, trace=None):
            return None, []

        monkeypatch.setattr(main_server, "generate_audio_file", generate)
        manager = main_server.ConnectionManager()
        manager.broadcast_to_user = lambda user_id, event: broadcasts.append(event)
        session = await main_server.speech_stream_coordinator.begin(
            "user-1", "reply-1", lambda unit, trace: asyncio.sleep(0, result=True)
        )
        rendered = await manager.send_ai_reply_chunk(
            "失败。", "neutral", "user-1", 0,
            reply_id="reply-1", trace=SpeechTrace("reply-1", 0),
        )
        assert rendered is False
        await session.cancel()

    run_scenario(scenario())
    assert broadcasts == []


def test_send_ai_reply_chunk_returns_false_when_generation_raises(main_server, monkeypatch):
    async def scenario():
        async def generate(text, emotion, *, trace=None):
            raise RuntimeError("controlled synthesis failure")

        monkeypatch.setattr(main_server, "generate_audio_file", generate)
        manager = main_server.ConnectionManager()
        session = await main_server.speech_stream_coordinator.begin(
            "user-1", "reply-1", lambda unit, trace: asyncio.sleep(0, result=True)
        )
        rendered = await manager.send_ai_reply_chunk(
            "异常。", "neutral", "user-1", 0,
            reply_id="reply-1", trace=SpeechTrace("reply-1", 0),
        )
        assert rendered is False
        await session.cancel()

    run_scenario(scenario())


def test_send_ai_reply_chunk_drops_result_if_reply_is_cancelled_during_generation(
    main_server, monkeypatch
):
    broadcasts = []

    async def scenario():
        generation_started = asyncio.Event()
        release_generation = asyncio.Event()

        async def generate(text, emotion, *, trace=None):
            generation_started.set()
            await release_generation.wait()
            return "/static/voice/stale.wav", []

        async def broadcast(user_id, event):
            broadcasts.append(event)

        monkeypatch.setattr(main_server, "generate_audio_file", generate)
        monkeypatch.setattr(main_server, "protect_generated_audio", lambda user_id, path: path)
        manager = main_server.ConnectionManager()
        manager.broadcast_to_user = broadcast
        session = await main_server.speech_stream_coordinator.begin(
            "user-1", "reply-1", lambda unit, trace: asyncio.sleep(0, result=True)
        )
        render_task = asyncio.create_task(manager.send_ai_reply_chunk(
            "旧回复。", "neutral", "user-1", 0,
            reply_id="reply-1", trace=SpeechTrace("reply-1", 0),
        ))
        await generation_started.wait()
        await session.cancel()
        release_generation.set()

        assert await render_task is False

    run_scenario(scenario())
    assert broadcasts == []


def test_chat_reply_waits_for_speech_delivery_before_end(main_server, monkeypatch):
    events = []

    async def scenario():
        render_started = asyncio.Event()
        release_render = asyncio.Event()

        class Brain:
            async def update_profile_task(self, *args):
                pass

            async def chat_stream(self, *args, **kwargs):
                yield {"type": "sentence", "text": "聊天回复。"}

        async def broadcast(user_id, event):
            events.append(event)

        async def send_chunk(text, emotion, user_id, chunk_index, **kwargs):
            render_started.set()
            await release_render.wait()
            events.append({
                "type": "audio_stream_chunk", "reply_id": kwargs["reply_id"],
                "chunk_index": chunk_index,
            })
            return True

        monkeypatch.setattr(main_server, "brain", Brain())
        monkeypatch.setattr(main_server.memory_service, "recall", lambda *args: "", raising=False)
        monkeypatch.setattr(main_server.memory_service, "remember", lambda *args: None, raising=False)
        monkeypatch.setattr(main_server.database, "get_recent_mood_scores", lambda *args: [])
        monkeypatch.setattr(main_server.database, "add_message", lambda *args: None)
        monkeypatch.setattr(main_server.ws_manager, "broadcast_to_user", broadcast)
        monkeypatch.setattr(main_server.ws_manager, "send_ai_reply_chunk", send_chunk)

        response_task = asyncio.create_task(
            main_server.process_and_push_response("你好", "user-chat")
        )
        await render_started.wait()
        await asyncio.sleep(0)
        assert "audio_stream_end" not in [event["type"] for event in events]
        release_render.set()
        await response_task

    run_scenario(scenario())
    text_event = next(event for event in events if event["type"] == "text_stream_chunk")
    start_event = next(event for event in events if event["type"] == "audio_stream_start")
    audio_event = next(event for event in events if event["type"] == "audio_stream_chunk")
    end_event = next(event for event in events if event["type"] == "audio_stream_end")
    assert text_event["reply_id"] == start_event["reply_id"]
    assert text_event["reply_id"] == audio_event["reply_id"]
    assert text_event["reply_id"] == end_event["reply_id"]
    assert [event["type"] for event in events].index("audio_stream_chunk") < [
        event["type"] for event in events
    ].index("audio_stream_end")


def test_vision_reply_uses_ordered_delivery_and_sanitizes_text(main_server, monkeypatch):
    events = []

    async def scenario():
        render_started = asyncio.Event()
        release_render = asyncio.Event()

        class Vision:
            def see_and_reply(self, image, text):
                return "EMOTION: happy\nACTION: null\n看见你啦。"

        async def broadcast(user_id, event):
            events.append(event)

        async def send_chunk(text, emotion, user_id, chunk_index, **kwargs):
            render_started.set()
            await release_render.wait()
            events.append({
                "type": "audio_stream_chunk", "reply_id": kwargs["reply_id"],
                "chunk_index": chunk_index, "text": text,
            })
            return True

        monkeypatch.setattr(main_server, "vision_service", Vision())
        monkeypatch.setattr(main_server.ws_manager, "broadcast_to_user", broadcast)
        monkeypatch.setattr(main_server.ws_manager, "send_ai_reply_chunk", send_chunk)
        monkeypatch.setattr(main_server.database, "add_message", lambda *args: None)

        result = await main_server.vision_chat_api(
            main_server.PhotoRequest(image="data"), {"id": "user-vision"}
        )
        assert result == {"status": "accepted"}
        await render_started.wait()
        await asyncio.sleep(0)
        assert "audio_stream_end" not in [event["type"] for event in events]
        release_render.set()
        while "audio_stream_end" not in [event["type"] for event in events]:
            await asyncio.sleep(0)

    run_scenario(scenario())
    text_event = next(event for event in events if event["type"] == "text_stream_chunk")
    start_event = next(event for event in events if event["type"] == "audio_stream_start")
    audio_event = next(event for event in events if event["type"] == "audio_stream_chunk")
    end_event = next(event for event in events if event["type"] == "audio_stream_end")
    assert text_event["text"] == "看见你啦。"
    assert text_event["reply_id"] == start_event["reply_id"]
    assert text_event["reply_id"] == audio_event["reply_id"]
    assert text_event["reply_id"] == end_event["reply_id"]
    assert events[-1]["type"] == "audio_stream_end"


def test_interrupt_cancels_the_current_speech_session(main_server):
    async def scenario():
        render_started = asyncio.Event()
        render_cancelled = asyncio.Event()
        main_server.global_manager.lock = asyncio.Lock()

        async def render(unit, trace):
            render_started.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                render_cancelled.set()
                raise

        session = await main_server.speech_stream_coordinator.begin(
            "user-1", "reply-1", render
        )
        await session.add_text("等待中断。", "neutral")
        await render_started.wait()

        await main_server.global_manager.lock.acquire()
        interrupt_task = asyncio.create_task(
            main_server.global_manager.interrupt("user-1")
        )
        try:
            await asyncio.wait_for(render_cancelled.wait(), timeout=0.5)
        finally:
            main_server.global_manager.lock.release()
        await interrupt_task
        summary = await session.close()

        assert render_cancelled.is_set()
        assert summary.cancelled

    run_scenario(scenario())


def test_superseding_reply_stops_old_end_before_later_websocket(
    main_server,
):
    second_connection_events = []

    async def scenario():
        old_end_started = asyncio.Event()
        coordinator = main_server.SpeechStreamCoordinator()
        manager = main_server.ConnectionManager()

        class BlockingConnection:
            async def send_json(self, event):
                if (
                    event["type"] == "audio_stream_end"
                    and event["reply_id"] == "reply-old"
                ):
                    old_end_started.set()
                    await asyncio.Event().wait()

        class RecordingConnection:
            async def send_json(self, event):
                second_connection_events.append(event)

        manager.active_connections["user-1"] = [
            BlockingConnection(), RecordingConnection()
        ]

        async def render(unit, trace):
            return True

        old = main_server.SpeechReplyDelivery(
            coordinator=coordinator, user_id="user-1", reply_id="reply-old",
            broadcast=manager.broadcast_to_user, render_unit=render,
        )
        new = main_server.SpeechReplyDelivery(
            coordinator=coordinator, user_id="user-1", reply_id="reply-new",
            broadcast=manager.broadcast_to_user, render_unit=render,
        )
        await old.start()
        await old.add_text("旧回复。", "neutral")
        old_finish = asyncio.create_task(old.finish(full_text="旧回复。"))
        await old_end_started.wait()

        await new.start()
        await old_finish
        await new.cancel()

    run_scenario(scenario())
    assert not any(
        event["type"] == "audio_stream_end"
        and event["reply_id"] == "reply-old"
        for event in second_connection_events
    )


@pytest.mark.parametrize(
    ("model_name", "channel"),
    (("hiyori", "head_pitch"), ("panda_cake", "panda_hug")),
)
def test_live2d_candidate_routes_to_v3_director_with_runtime_model(
    main_server, monkeypatch, model_name, channel
):
    class Brain:
        async def update_profile_task(self, *args):
            pass

        async def chat_stream(self, *args, **kwargs):
            assert kwargs["live2d_model"] == model_name
            yield {
                "type": "live2d_action_candidate",
                "plan": {"duration_ms": 900, "tracks": [{"channel": channel}]},
            }

    class MotionDirector:
        def __init__(self):
            self.calls = []

        def decide(self, user_id, plan, model_name=None):
            self.calls.append((user_id, plan, model_name))
            return {"type": "live2d_motion_v3"}

    async def scenario():
        events = []
        director = MotionDirector()
        monkeypatch.setattr(main_server, "brain", Brain())
        monkeypatch.setattr(main_server, "motion_director", director)
        monkeypatch.setattr(main_server, "is_motion_v3_candidate", lambda plan: True)
        monkeypatch.setattr(main_server.memory_service, "recall", lambda *args: "", raising=False)
        monkeypatch.setattr(main_server.memory_service, "remember", lambda *args: None, raising=False)
        monkeypatch.setattr(main_server.database, "get_recent_mood_scores", lambda *args: [])
        monkeypatch.setattr(main_server.database, "add_message", lambda *args: None)
        monkeypatch.setattr(
            main_server.ws_manager, "broadcast_to_user",
            lambda user_id, event: asyncio.sleep(0, result=events.append(event)),
        )
        await main_server.process_and_push_response(
            "动作", "user-1", live2d_model=model_name
        )
        assert director.calls[0][0] == "user-1"
        assert director.calls[0][2] == model_name
        assert {"type": "live2d_motion_v3"} in events

    run_scenario(scenario())


@pytest.mark.parametrize(
    ("received_model", "expected_model"),
    (("panda_cake", "panda_cake"), ("PANDA_CAKE", None)),
)
def test_websocket_normalizes_and_forwards_live2d_model(
    main_server, monkeypatch, tmp_path, received_model, expected_model
):
    process_calls = []

    async def scenario():
        processed = asyncio.Event()

        class WebSocketManager:
            async def connect(self, websocket, user_id):
                await websocket.accept()

            async def broadcast_to_user(self, user_id, event):
                pass

            def disconnect(self, websocket, user_id):
                pass

        class ControlledWebSocket:
            def __init__(self):
                self.receive_count = 0

            async def accept(self):
                pass

            async def receive(self):
                self.receive_count += 1
                if self.receive_count == 1:
                    return {"text": json.dumps({
                        "type": "text",
                        "content": "测试模型传递",
                        "live2d_model": received_model,
                    })}
                await processed.wait()
                raise main_server.WebSocketDisconnect()

        async def process_response(
            user_text, user_id, live2d_model=None
        ):
            process_calls.append((user_text, user_id, live2d_model))
            processed.set()

        monkeypatch.setattr(main_server, "CURRENT_DIR", str(tmp_path))
        monkeypatch.setattr(
            main_server.auth_service,
            "consume_ws_ticket",
            lambda ticket: "user-1",
            raising=False,
        )
        monkeypatch.setattr(main_server, "ws_manager", WebSocketManager())
        monkeypatch.setattr(
            main_server, "process_and_push_response", process_response
        )

        await main_server.websocket_endpoint(
            ControlledWebSocket(), ticket="valid-ticket"
        )

    run_scenario(scenario())
    assert process_calls == [
        ("测试模型传递", "user-1", expected_model),
    ]
