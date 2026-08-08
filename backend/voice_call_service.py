"""End-to-end orchestration for one realtime voice-call connection."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from voice_call_protocol import (
    INPUT_SAMPLE_RATE,
    MAX_INPUT_BYTES,
    MAX_PCM_CHUNK_BYTES,
    BinaryFrameHeader,
    ProtocolError,
)
from voice_call_session import VoiceCallSession
from voice_call_tts import GptSovitsUnavailable, PcmStreamFormatError
from voice_call_units import SpeechUnit, VoiceSpeechUnitPlanner


@dataclass
class _ConnectionState:
    snapshot: Any
    turn_id: int | None = None
    next_input_sequence: int = 0
    input_pcm: bytearray = field(default_factory=bytearray)
    accepting_audio: bool = False


@dataclass
class _TurnRuntime:
    tts_started: bool = False


class _PipelineFailure(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class VoiceCallService:
    def __init__(self, asr: Any, brain: Any, memory: Any, tts: Any) -> None:
        self.asr = asr
        self.brain = brain
        self.memory = memory
        self.tts = tts
        self._states: dict[str, _ConnectionState] = {}
        self._sessions: dict[str, VoiceCallSession] = {}

    async def open_session(self, user_id: str, sender: Any) -> VoiceCallSession:
        session_id = uuid.uuid4().hex
        snapshot = await self.memory.load(user_id)
        session = VoiceCallSession(user_id, session_id, sender)
        self._sessions[session_id] = session
        self._states[session_id] = _ConnectionState(snapshot=snapshot)
        return session

    async def close_session(self, session: VoiceCallSession) -> None:
        try:
            await session.close()
        finally:
            self._states.pop(session.session_id, None)
            self._sessions.pop(session.session_id, None)

    async def close(self) -> None:
        sessions = tuple(self._sessions.values())
        if sessions:
            await asyncio.gather(
                *(self.close_session(session) for session in sessions),
                return_exceptions=True,
            )
        await self.tts.close()

    async def handle_speech_start(self, session: VoiceCallSession, turn_id: int) -> None:
        await session.start_turn(turn_id)
        state = self._state(session)
        state.turn_id = turn_id
        state.next_input_sequence = 0
        state.input_pcm.clear()
        state.accepting_audio = True

    async def handle_audio(
        self,
        session: VoiceCallSession,
        header: BinaryFrameHeader,
        pcm: bytes,
    ) -> None:
        state = self._state(session)
        if header.session_id != session.session_id:
            raise ProtocolError("session_id 不匹配")
        if header.direction != "input":
            raise ProtocolError("上行 PCM direction 必须为 input")
        if not session.is_current(header.turn_id) or state.turn_id != header.turn_id:
            raise ProtocolError("音频轮次已失效")
        if not state.accepting_audio:
            raise ProtocolError("当前轮次不再接收音频")
        if header.sequence != state.next_input_sequence:
            raise ProtocolError("输入 PCM sequence 必须连续递增")
        if len(pcm) != header.byte_length:
            raise ProtocolError("PCM payload 长度与 byte_length 不一致")
        if len(state.input_pcm) + len(pcm) > MAX_INPUT_BYTES:
            raise ProtocolError(f"输入 PCM 不能超过 {MAX_INPUT_BYTES} 字节")
        state.input_pcm.extend(pcm)
        state.next_input_sequence += 1

    async def handle_speech_end(self, session: VoiceCallSession, turn_id: int) -> None:
        state = self._state(session)
        if not session.is_current(turn_id) or state.turn_id != turn_id:
            raise ProtocolError("结束的音频轮次已失效")
        if not state.accepting_audio:
            raise ProtocolError("当前轮次已经结束录音")
        state.accepting_audio = False
        frozen_pcm = bytes(state.input_pcm)
        state.input_pcm.clear()
        task = asyncio.create_task(self._run_turn(session, turn_id, frozen_pcm))
        session.track(task)

    async def interrupt(self, session: VoiceCallSession, turn_id: int) -> None:
        cancelled = await session.cancel_turn(turn_id, "barge_in")
        if cancelled:
            await session.sender.send_json({
                "type": "turn_cancelled",
                "session_id": session.session_id,
                "turn_id": turn_id,
                "reason": "barge_in",
            })

    async def _run_turn(
        self,
        session: VoiceCallSession,
        turn_id: int,
        frozen_pcm: bytes,
    ) -> None:
        state = self._state(session)
        runtime = _TurnRuntime()
        try:
            text, detected_emotion = await asyncio.to_thread(
                self.asr.recognize_pcm16,
                frozen_pcm,
                INPUT_SAMPLE_RATE,
            )
            if not session.is_current(turn_id):
                return
            text = str(text or "").strip()
            if not text:
                await self._send_error(
                    session, turn_id, "ASR_EMPTY", "没有听清，请再说一次",
                )
                return

            await session.sender.send_json({
                "type": "transcript_final",
                "session_id": session.session_id,
                "turn_id": turn_id,
                "text": text,
            })
            snapshot = self.memory.append_user(state.snapshot, text)
            state.snapshot = snapshot
            await self._persist_user_durably(snapshot, text)
            if not session.is_current(turn_id):
                return

            queue: asyncio.Queue[SpeechUnit | None] = asyncio.Queue()
            producer = asyncio.create_task(
                self._produce_reply(session, turn_id, snapshot, queue)
            )
            consumer = asyncio.create_task(
                self._stream_speech(session, turn_id, queue, runtime)
            )
            try:
                (full_reply, emotion, mood_score), _ = await asyncio.gather(
                    producer,
                    consumer,
                )
            except BaseException:
                producer.cancel()
                consumer.cancel()
                await asyncio.gather(producer, consumer, return_exceptions=True)
                raise

            if session.is_current(turn_id) and full_reply.strip():
                await self.memory.persist_ai_completion(
                    snapshot,
                    text,
                    full_reply,
                    emotion,
                    mood_score,
                    task_tracker=session.track_finalizer,
                )
                state.snapshot = self.memory.append_ai(snapshot, full_reply)
        except asyncio.CancelledError:
            raise
        except _PipelineFailure as error:
            if session.is_current(turn_id):
                await self._send_error(session, turn_id, error.code, error.message)
                if runtime.tts_started:
                    await self._send_tts_end(session, turn_id)
        except Exception as error:
            if session.is_current(turn_id):
                await self._send_error(
                    session, turn_id, "VOICE_PIPELINE_FAILED", "语音回复暂时失败，请再试一次",
                )
                if runtime.tts_started:
                    await self._send_tts_end(session, turn_id)
            print(f"Voice call turn failed: {error}")

    async def _produce_reply(
        self,
        session: VoiceCallSession,
        turn_id: int,
        snapshot: Any,
        queue: asyncio.Queue[SpeechUnit | None],
    ) -> tuple[str, str, int]:
        planner = VoiceSpeechUnitPlanner()
        full_parts: list[str] = []
        emotion = "neutral"
        mood_score = 0
        timer: asyncio.Task[None] | None = None

        async def cancel_timer() -> None:
            nonlocal timer
            if timer is not None:
                timer.cancel()
                await asyncio.gather(timer, return_exceptions=True)
                timer = None

        async def enqueue(units: list[SpeechUnit]) -> None:
            for unit in units:
                await queue.put(unit)

        async def flush_at_deadline(deadline_ms: int) -> None:
            delay = max(0.0, (deadline_ms - self._now_ms()) / 1000)
            await asyncio.sleep(delay)
            if session.is_current(turn_id):
                await enqueue(planner.flush_due(self._now_ms()))

        try:
            async for event in self.brain.chat_voice_stream(
                session.user_id,
                self._current_user_text(snapshot),
                profile=snapshot.profile,
                recent_history=snapshot.recent_history,
                long_term_memory=snapshot.long_term_memory,
            ):
                if not session.is_current(turn_id):
                    raise asyncio.CancelledError
                if event.get("type") == "meta":
                    emotion = str(event.get("emotion") or "neutral")
                    mood_score = int(event.get("mood_score") or 0)
                    continue
                if event.get("type") != "sentence":
                    continue
                sentence = str(event.get("text") or "").strip()
                if not sentence:
                    continue
                await cancel_timer()
                full_parts.append(sentence)
                await session.sender.send_json({
                    "type": "assistant_text_delta",
                    "session_id": session.session_id,
                    "turn_id": turn_id,
                    "text": sentence,
                })
                await enqueue(planner.add_sentence(sentence, emotion, self._now_ms()))
                deadline = planner.first_deadline_ms
                if planner.waiting_for_first_deadline and deadline is not None:
                    timer = asyncio.create_task(flush_at_deadline(deadline))
        except asyncio.CancelledError:
            raise
        except Exception as error:
            raise _PipelineFailure("LLM_FAILED", "大模型回复暂时失败") from error
        finally:
            await cancel_timer()

        await enqueue(planner.close(self._now_ms()))
        await session.sender.send_json({
            "type": "assistant_text_end",
            "session_id": session.session_id,
            "turn_id": turn_id,
        })
        await queue.put(None)
        return "".join(full_parts), emotion, mood_score

    async def _stream_speech(
        self,
        session: VoiceCallSession,
        turn_id: int,
        queue: asyncio.Queue[SpeechUnit | None],
        runtime: _TurnRuntime,
    ) -> None:
        sequence = 0
        cancel_event = self._current_cancel_event(session, turn_id)
        try:
            while True:
                unit = await queue.get()
                if unit is None:
                    break
                if not session.is_current(turn_id):
                    raise asyncio.CancelledError
                if not runtime.tts_started:
                    await session.sender.send_json({
                        "type": "tts_start",
                        "session_id": session.session_id,
                        "turn_id": turn_id,
                        "sample_rate": self.tts.sample_rate,
                        "channels": self.tts.channels,
                        "sample_width": self.tts.sample_width,
                    })
                    runtime.tts_started = True
                async for chunk in self.tts.stream(unit.text, unit.emotion, cancel_event):
                    if not session.is_current(turn_id):
                        raise asyncio.CancelledError
                    for offset in range(0, len(chunk), MAX_PCM_CHUNK_BYTES):
                        piece = chunk[offset:offset + MAX_PCM_CHUNK_BYTES]
                        header = BinaryFrameHeader(
                            session_id=session.session_id,
                            direction="output",
                            turn_id=turn_id,
                            sequence=sequence,
                            byte_length=len(piece),
                        )
                        await session.sender.send_pcm(header, piece)
                        sequence += 1
            if runtime.tts_started and session.is_current(turn_id):
                await self._send_tts_end(session, turn_id)
        except asyncio.CancelledError:
            raise
        except (GptSovitsUnavailable, PcmStreamFormatError) as error:
            raise _PipelineFailure("TTS_FAILED", "克隆语音暂时不可用") from error

    @staticmethod
    def _current_user_text(snapshot: Any) -> str:
        for item in reversed(snapshot.recent_history):
            if item.get("role") == "user":
                return str(item.get("content", item.get("text", "")))
        return ""

    @staticmethod
    def _current_cancel_event(
        session: VoiceCallSession,
        turn_id: int,
    ) -> asyncio.Event:
        return session.cancel_event_for(turn_id)

    async def _persist_user_durably(self, snapshot: Any, text: str) -> None:
        persistence = asyncio.create_task(self.memory.persist_user_text(snapshot, text))
        try:
            await asyncio.shield(persistence)
        except asyncio.CancelledError:
            await asyncio.gather(persistence, return_exceptions=True)
            raise

    @staticmethod
    def _now_ms() -> int:
        return int(time.monotonic() * 1000)

    def _state(self, session: VoiceCallSession) -> _ConnectionState:
        try:
            return self._states[session.session_id]
        except KeyError as error:
            raise ProtocolError("语音会话不存在或已关闭") from error

    @staticmethod
    async def _send_error(
        session: VoiceCallSession,
        turn_id: int,
        code: str,
        message: str,
    ) -> None:
        await session.sender.send_json({
            "type": "call_error",
            "session_id": session.session_id,
            "turn_id": turn_id,
            "code": code,
            "message": message,
        })

    @staticmethod
    async def _send_tts_end(session: VoiceCallSession, turn_id: int) -> None:
        await session.sender.send_json({
            "type": "tts_end",
            "session_id": session.session_id,
            "turn_id": turn_id,
        })
