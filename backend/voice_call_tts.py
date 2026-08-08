"""Cancelable GPT-SoVITS raw PCM streaming for realtime calls."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Callable
from typing import Any

import aiohttp

from tts_service import GSV_URL, build_gsv_payload


class GptSovitsUnavailable(RuntimeError):
    """GPT-SoVITS did not accept or complete a realtime request."""


class PcmStreamFormatError(RuntimeError):
    """GPT-SoVITS returned bytes that are not complete PCM16 samples."""


_GPU_INFERENCE_LIMIT = asyncio.Semaphore(1)


class GptSovitsPcmClient:
    def __init__(
        self,
        session_factory: Callable[..., Any] = aiohttp.ClientSession,
        *,
        sample_rate: int = 32000,
        semaphore: asyncio.Semaphore | None = None,
        url: str = GSV_URL,
    ) -> None:
        if (
            not isinstance(sample_rate, int)
            or isinstance(sample_rate, bool)
            or not 8000 <= sample_rate <= 96000
        ):
            raise ValueError("output sample_rate 必须为 8000..96000 的整数")
        self.sample_rate = sample_rate
        self.channels = 1
        self.sample_width = 2
        self._session_factory = session_factory
        self._semaphore = semaphore or _GPU_INFERENCE_LIMIT
        self._url = url
        self._session: Any | None = None
        self._closed = False

    async def stream(
        self,
        text: str,
        emotion: str,
        cancel_event: asyncio.Event,
        *,
        streaming_mode: int = 2,
    ) -> AsyncIterator[bytes]:
        if self._closed:
            raise GptSovitsUnavailable("GPT-SoVITS PCM 客户端已关闭")
        if not text or not text.strip():
            return
        if cancel_event.is_set():
            raise asyncio.CancelledError
        if streaming_mode not in (0, 2) or isinstance(streaming_mode, bool):
            raise ValueError("streaming_mode 必须为 0 或 2")

        await self._acquire_or_cancel(cancel_event)
        try:
            if cancel_event.is_set():
                raise asyncio.CancelledError
            session = self._get_session()
            payload = build_gsv_payload(
                text.strip(),
                emotion,
                media_type="raw",
                streaming_mode=streaming_mode,
            )
            try:
                async with session.post(self._url, json=payload) as response:
                    if response.status != 200:
                        detail = await response.text()
                        raise GptSovitsUnavailable(
                            f"GPT-SoVITS HTTP {response.status}: {detail[:200]}"
                        )
                    async for chunk in self._iter_even_pcm(response, cancel_event):
                        yield chunk
            except asyncio.CancelledError:
                raise
            except GptSovitsUnavailable:
                raise
            except (aiohttp.ClientError, asyncio.TimeoutError) as error:
                raise GptSovitsUnavailable("无法连接 GPT-SoVITS 实时语音服务") from error
        finally:
            self._semaphore.release()

    async def close(self) -> None:
        self._closed = True
        session, self._session = self._session, None
        if session is not None and not getattr(session, "closed", False):
            await session.close()

    def _get_session(self) -> Any:
        if self._session is None or getattr(self._session, "closed", False):
            timeout = aiohttp.ClientTimeout(total=120, connect=3)
            self._session = self._session_factory(timeout=timeout)
        return self._session

    async def _acquire_or_cancel(self, cancel_event: asyncio.Event) -> None:
        acquire_task = asyncio.create_task(self._semaphore.acquire())
        cancel_task = asyncio.create_task(cancel_event.wait())
        try:
            done, _ = await asyncio.wait(
                {acquire_task, cancel_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if acquire_task in done:
                await acquire_task
                return
            if cancel_task in done and cancel_task.result():
                acquire_task.cancel()
                result = await asyncio.gather(acquire_task, return_exceptions=True)
                if result and result[0] is True:
                    self._semaphore.release()
                raise asyncio.CancelledError
        finally:
            cancel_task.cancel()
            await asyncio.gather(cancel_task, return_exceptions=True)

    async def _iter_even_pcm(
        self,
        response: Any,
        cancel_event: asyncio.Event,
    ) -> AsyncIterator[bytes]:
        carry = b""
        iterator = response.content.iter_chunked(16384).__aiter__()
        while True:
            next_chunk = asyncio.create_task(iterator.__anext__())
            cancelled = asyncio.create_task(cancel_event.wait())
            try:
                done, _ = await asyncio.wait(
                    {next_chunk, cancelled},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                if cancelled in done and cancelled.result():
                    next_chunk.cancel()
                    await asyncio.gather(next_chunk, return_exceptions=True)
                    response.close()
                    raise asyncio.CancelledError
                cancelled.cancel()
                await asyncio.gather(cancelled, return_exceptions=True)
                try:
                    incoming = next_chunk.result()
                except StopAsyncIteration:
                    break
            finally:
                for task in (next_chunk, cancelled):
                    if not task.done():
                        task.cancel()
                await asyncio.gather(next_chunk, cancelled, return_exceptions=True)

            if not incoming:
                continue
            combined = carry + bytes(incoming)
            even_length = len(combined) - (len(combined) % 2)
            if even_length:
                yield combined[:even_length]
            carry = combined[even_length:]

        if carry:
            raise PcmStreamFormatError("GPT-SoVITS 返回了不完整 PCM16 采样")
