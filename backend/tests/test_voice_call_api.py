import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from voice_call_api import create_voice_call_router
from voice_call_protocol import ProtocolError


class FakeAuth:
    def __init__(self, tickets=None):
        self.tickets = dict(tickets or {})

    def consume_ws_ticket(self, ticket):
        return self.tickets.pop(ticket, None)


class FakeVoiceCallService:
    def __init__(self):
        self.sessions = []
        self.audio = []
        self.starts = []
        self.ends = []
        self.interrupts = []
        self.closed = []
        self.close_event = threading.Event()

    async def open_session(self, user_id, sender):
        session = SimpleNamespace(
            user_id=user_id,
            session_id=f"server-session-{len(self.sessions) + 1}",
            sender=sender,
        )
        self.sessions.append(session)
        return session

    async def handle_speech_start(self, session, turn_id):
        self.starts.append((session.session_id, turn_id))

    async def handle_audio(self, session, header, pcm):
        if len(pcm) != header.byte_length:
            raise ProtocolError("PCM payload 长度与 byte_length 不一致")
        self.audio.append((header, bytes(pcm)))

    async def handle_speech_end(self, session, turn_id):
        self.ends.append((session.session_id, turn_id))

    async def interrupt(self, session, turn_id):
        self.interrupts.append((session.session_id, turn_id))

    async def close_session(self, session):
        self.closed.append(session.session_id)
        self.close_event.set()


def make_client(tickets=None):
    app = FastAPI()
    runtime = FakeVoiceCallService()
    app.include_router(create_voice_call_router(FakeAuth(tickets), runtime))
    return TestClient(app), runtime


def audio_header(session_id, *, turn_id=1, sequence=0, byte_length=4):
    return {
        "type": "input_audio_chunk",
        "session_id": session_id,
        "turn_id": turn_id,
        "direction": "input",
        "sequence": sequence,
        "byte_length": byte_length,
    }


def test_ticket_is_consumed_once_and_pcm_pair_is_forwarded():
    client, runtime = make_client({"once": "u1"})
    with client:
        with client.websocket_connect("/ws/voice-call?ticket=once") as websocket:
            websocket.send_json({"type": "call_start"})
            ready = websocket.receive_json()
            assert ready == {
                "type": "call_ready",
                "session_id": "server-session-1",
            }
            websocket.send_json({
                "type": "user_speech_start",
                "session_id": ready["session_id"],
                "turn_id": 1,
            })
            websocket.send_json(audio_header(ready["session_id"]))
            websocket.send_bytes(b"\x00\x00\x00\x00")
            websocket.send_json({
                "type": "user_speech_end",
                "session_id": ready["session_id"],
                "turn_id": 1,
            })
            websocket.send_json({
                "type": "call_end",
                "session_id": ready["session_id"],
            })
            assert websocket.receive_json() == {
                "type": "call_ended",
                "session_id": ready["session_id"],
            }

        assert runtime.starts == [(ready["session_id"], 1)]
        assert runtime.ends == [(ready["session_id"], 1)]
        assert runtime.audio[0][1] == b"\x00\x00\x00\x00"
        assert runtime.closed == [ready["session_id"]]

        with pytest.raises(WebSocketDisconnect) as error:
            with client.websocket_connect("/ws/voice-call?ticket=once"):
                pass
        assert error.value.code == 1008


@pytest.mark.parametrize("bad_message", ["bytes_without_header", "header_without_bytes", "wrong_length"])
def test_binary_pair_protocol_errors_close_with_1003_and_release_session(bad_message):
    client, runtime = make_client({"once": "u1"})
    with client:
        with pytest.raises(WebSocketDisconnect) as error:
            with client.websocket_connect("/ws/voice-call?ticket=once") as websocket:
                websocket.send_json({"type": "call_start"})
                ready = websocket.receive_json()
                if bad_message == "bytes_without_header":
                    websocket.send_bytes(b"\x00\x00")
                elif bad_message == "header_without_bytes":
                    websocket.send_json(audio_header(ready["session_id"]))
                    websocket.send_json({"type": "pong"})
                else:
                    websocket.send_json(audio_header(ready["session_id"], byte_length=4))
                    websocket.send_bytes(b"\x00\x00")
                if bad_message != "bytes_without_header":
                    protocol_error = websocket.receive_json()
                    assert protocol_error["type"] == "call_error"
                    assert protocol_error["code"] == "PROTOCOL_ERROR"
                websocket.receive_json()
        assert error.value.code == 1003
        assert runtime.closed == ["server-session-1"]


def test_disconnect_releases_session_without_using_chat_manager():
    client, runtime = make_client({"once": "u1"})
    with client:
        with client.websocket_connect("/ws/voice-call?ticket=once") as websocket:
            websocket.send_json({"type": "call_start"})
            assert websocket.receive_json()["type"] == "call_ready"
        assert runtime.close_event.wait(timeout=1)
        assert runtime.closed == ["server-session-1"]
