"""Authenticated WebSocket transport for local realtime voice calls."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from voice_call_protocol import BinaryFrameHeader, ProtocolError, parse_client_event
from voice_call_session import VoiceCallSender


def create_voice_call_router(auth_service: Any, voice_call_service: Any) -> APIRouter:
    router = APIRouter()

    @router.websocket("/ws/voice-call")
    async def voice_call_socket(websocket: WebSocket, ticket: str) -> None:
        user_id = auth_service.consume_ws_ticket(ticket)
        if not user_id:
            await websocket.close(code=1008)
            return

        await websocket.accept()
        sender = VoiceCallSender(websocket)
        try:
            session = await voice_call_service.open_session(user_id, sender)
        except Exception:
            await _close_safely(websocket, 1011)
            return
        session_closed = False
        call_started = False
        pending_header: BinaryFrameHeader | None = None
        active_turn_id: int | None = None

        try:
            while True:
                message = await websocket.receive()
                message_type = message.get("type")
                if message_type == "websocket.disconnect":
                    raise WebSocketDisconnect(message.get("code", 1000))
                if message_type != "websocket.receive":
                    raise ProtocolError("未知 WebSocket 消息类型")

                payload = message.get("bytes")
                if payload is not None:
                    if pending_header is None:
                        raise ProtocolError("PCM 二进制数据缺少元数据")
                    header, pending_header = pending_header, None
                    await voice_call_service.handle_audio(session, header, bytes(payload))
                    continue

                raw = message.get("text")
                if raw is None:
                    raise ProtocolError("WebSocket 消息必须为文本或二进制")
                if pending_header is not None:
                    raise ProtocolError("音频元数据后必须紧跟 PCM 二进制数据")

                event = parse_client_event(raw)
                event_type = event["type"]
                if event_type == "pong":
                    continue
                if event_type == "call_start":
                    if call_started:
                        raise ProtocolError("call_start 只能发送一次")
                    call_started = True
                    await sender.send_json({
                        "type": "call_ready",
                        "session_id": session.session_id,
                    })
                    continue
                if not call_started:
                    raise ProtocolError("必须先发送 call_start")
                if event.get("session_id") != session.session_id:
                    raise ProtocolError("session_id 不匹配")
                if "turn_id" in event:
                    active_turn_id = event["turn_id"]

                if event_type == "user_speech_start":
                    await voice_call_service.handle_speech_start(
                        session, event["turn_id"],
                    )
                elif event_type == "input_audio_chunk":
                    pending_header = BinaryFrameHeader(
                        session_id=event["session_id"],
                        direction=event["direction"],
                        turn_id=event["turn_id"],
                        sequence=event["sequence"],
                        byte_length=event["byte_length"],
                    )
                elif event_type == "user_speech_end":
                    await voice_call_service.handle_speech_end(
                        session, event["turn_id"],
                    )
                elif event_type == "interrupt":
                    await voice_call_service.interrupt(session, event["turn_id"])
                elif event_type == "call_end":
                    await voice_call_service.close_session(session)
                    session_closed = True
                    await sender.send_json({
                        "type": "call_ended",
                        "session_id": session.session_id,
                    })
                    await websocket.close(code=1000)
                    return
                else:
                    raise ProtocolError("当前消息不能在此处处理")
        except WebSocketDisconnect:
            pass
        except ProtocolError as error:
            if active_turn_id is not None:
                try:
                    await sender.send_json({
                        "type": "call_error",
                        "session_id": session.session_id,
                        "turn_id": active_turn_id,
                        "code": "PROTOCOL_ERROR",
                        "message": str(error),
                    })
                except (RuntimeError, WebSocketDisconnect):
                    pass
            await _close_safely(websocket, 1003)
        finally:
            if not session_closed:
                await voice_call_service.close_session(session)

    return router


async def _close_safely(websocket: WebSocket, code: int) -> None:
    try:
        await websocket.close(code=code)
    except (RuntimeError, WebSocketDisconnect):
        pass
