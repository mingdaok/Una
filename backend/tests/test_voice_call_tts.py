import asyncio
import os
import sys

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from voice_call_tts import (
    GptSovitsPcmClient,
    GptSovitsUnavailable,
    PcmStreamFormatError,
)


class FakeContent:
    def __init__(self, response):
        self.response = response

    def iter_chunked(self, size):
        self.response.chunk_size = size

        async def chunks():
            for item in self.response.chunks:
                if isinstance(item, asyncio.Event):
                    await item.wait()
                    continue
                yield item

        return chunks()


class FakeResponse:
    def __init__(self, chunks=(), status=200, detail="error"):
        self.chunks = list(chunks)
        self.status = status
        self.detail = detail
        self.content = FakeContent(self)
        self.closed = False
        self.chunk_size = None

    async def text(self):
        return self.detail

    def close(self):
        self.closed = True

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        self.close()
        return False


class FakeSession:
    def __init__(self, response, timeout):
        self.response = response
        self.timeout = timeout
        self.payloads = []
        self.closed = False

    def post(self, url, *, json):
        self.url = url
        self.payloads.append(json)
        return self.response

    async def close(self):
        self.closed = True


class FakeHttp:
    def __init__(self, response):
        self.response = response
        self.sessions = []

    def factory(self, *, timeout):
        session = FakeSession(self.response, timeout)
        self.sessions.append(session)
        return session


@pytest.mark.asyncio
async def test_pcm_stream_reassembles_even_samples_and_requests_raw_mode_two():
    http = FakeHttp(FakeResponse([b"\x01", b"\x02\x03", b"\x04"]))
    client = GptSovitsPcmClient(http.factory, sample_rate=32000)

    chunks = [chunk async for chunk in client.stream("你好", "neutral", asyncio.Event())]

    assert b"".join(chunks) == b"\x01\x02\x03\x04"
    assert all(len(chunk) % 2 == 0 for chunk in chunks)
    assert http.sessions[0].payloads[0]["media_type"] == "raw"
    assert http.sessions[0].payloads[0]["streaming_mode"] == 2
    assert http.sessions[0].payloads[0]["text_split_method"] == "cut0"
    assert http.sessions[0].payloads[0]["fragment_interval"] == pytest.approx(0.05)
    assert http.sessions[0].response.chunk_size == 16384


@pytest.mark.asyncio
async def test_non_streaming_raw_mode_can_be_selected_for_a_short_later_unit():
    http = FakeHttp(FakeResponse([b"\x00\x00"]))
    client = GptSovitsPcmClient(http.factory)

    chunks = [
        chunk async for chunk in client.stream(
            "短句。", "neutral", asyncio.Event(), streaming_mode=0
        )
    ]

    assert chunks == [b"\x00\x00"]
    assert http.sessions[0].payloads[0]["media_type"] == "raw"
    assert http.sessions[0].payloads[0]["streaming_mode"] == 0


@pytest.mark.asyncio
async def test_invalid_streaming_mode_is_rejected_before_http_request():
    http = FakeHttp(FakeResponse([b"\x00\x00"]))
    client = GptSovitsPcmClient(http.factory)

    with pytest.raises(ValueError, match="streaming_mode"):
        _ = [
            chunk async for chunk in client.stream(
                "短句。", "neutral", asyncio.Event(), streaming_mode=1
            )
        ]
    assert http.sessions == []


@pytest.mark.asyncio
async def test_http_error_is_reported_without_edge_fallback_or_disk_path():
    http = FakeHttp(FakeResponse(status=503, detail="warming up"))
    client = GptSovitsPcmClient(http.factory)

    with pytest.raises(GptSovitsUnavailable, match="503"):
        _ = [chunk async for chunk in client.stream("你好", "neutral", asyncio.Event())]


@pytest.mark.asyncio
async def test_cancellation_closes_response_and_stops_yielding():
    gate = asyncio.Event()
    response = FakeResponse([b"\x00\x00", gate, b"\x01\x01"])
    http = FakeHttp(response)
    client = GptSovitsPcmClient(http.factory)
    cancel_event = asyncio.Event()
    received = []

    async def consume():
        async for chunk in client.stream("你好", "neutral", cancel_event):
            received.append(chunk)
            cancel_event.set()

    with pytest.raises(asyncio.CancelledError):
        await consume()

    assert received == [b"\x00\x00"]
    assert response.closed is True


@pytest.mark.asyncio
async def test_direct_consumer_cancellation_reaps_the_pending_http_read():
    read_started = asyncio.Event()
    read_cancelled = asyncio.Event()

    class BlockingContent:
        def iter_chunked(self, size):
            _ = size

            async def chunks():
                read_started.set()
                try:
                    await asyncio.Event().wait()
                finally:
                    read_cancelled.set()
                yield b"\x00\x00"

            return chunks()

    response = FakeResponse()
    response.content = BlockingContent()
    client = GptSovitsPcmClient(FakeHttp(response).factory)

    async def consume():
        return [chunk async for chunk in client.stream("你好", "neutral", asyncio.Event())]

    task = asyncio.create_task(consume())
    await asyncio.wait_for(read_started.wait(), timeout=1)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    await asyncio.wait_for(read_cancelled.wait(), timeout=1)
    assert response.closed is True


@pytest.mark.asyncio
async def test_odd_trailing_byte_is_a_pcm_format_error():
    client = GptSovitsPcmClient(FakeHttp(FakeResponse([b"\x01"])).factory)

    with pytest.raises(PcmStreamFormatError, match="不完整 PCM16"):
        _ = [chunk async for chunk in client.stream("你好", "neutral", asyncio.Event())]


@pytest.mark.parametrize("sample_rate", [7999, 96001, True, 32000.5])
def test_invalid_output_sample_rate_is_rejected(sample_rate):
    with pytest.raises(ValueError, match="sample_rate"):
        GptSovitsPcmClient(lambda **kwargs: None, sample_rate=sample_rate)


@pytest.mark.asyncio
async def test_session_is_reused_and_closed_explicitly():
    http = FakeHttp(FakeResponse([b"\x00\x00"]))
    client = GptSovitsPcmClient(http.factory)

    for _ in range(2):
        assert [chunk async for chunk in client.stream("你好", "neutral", asyncio.Event())]
    await client.close()

    assert len(http.sessions) == 1
    assert http.sessions[0].closed is True


@pytest.mark.asyncio
async def test_cancelled_while_waiting_for_gpu_does_not_leak_permit():
    semaphore = asyncio.Semaphore(0)
    client = GptSovitsPcmClient(
        FakeHttp(FakeResponse([b"\x00\x00"])).factory,
        semaphore=semaphore,
    )
    cancel_event = asyncio.Event()
    cancel_event.set()

    with pytest.raises(asyncio.CancelledError):
        _ = [chunk async for chunk in client.stream("你好", "neutral", cancel_event)]

    assert semaphore._value == 0
