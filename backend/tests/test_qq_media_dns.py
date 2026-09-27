import asyncio
import json
import socket
from types import SimpleNamespace
from unittest.mock import AsyncMock

import aiohttp
import pytest
import pytest_asyncio

from channels.config import QQConfig
from channels.media import QQMedia
from channels.media_dns import (
    BootstrapResolver,
    DOH_ENDPOINTS,
    MediaDNSUnavailable,
    MediaError,
    PublicResolver,
    parse_answer,
    record,
)

HOST = "gchat.qpic.cn"
URL = "https://gchat.qpic.cn/image?private-token=secret"


def answer(address="8.8.8.8", *, ttl=20, host=HOST, kind=1):
    return {
        "Status": 0,
        "Question": [{"name": host + ".", "type": kind}],
        "Answer": [{"name": host + ".", "type": kind, "TTL": ttl, "data": address}],
    }


@pytest.fixture
def media(tmp_path):
    return QQMedia(QQConfig(media_dir=str(tmp_path / "media")), None, None, None, None)


@pytest_asyncio.fixture
async def resolver():
    result = PublicResolver((HOST,))
    result.resolver = SimpleNamespace(resolve=AsyncMock(), close=AsyncMock())
    result.resolve_doh = AsyncMock(return_value=(["8.8.8.8"], 20))
    return result


@pytest.mark.asyncio
async def test_public_system_dns_does_not_use_doh(resolver):
    records = [record(HOST, "8.8.4.4", 443)]
    resolver.resolver.resolve.return_value = records
    assert await resolver.resolve(HOST, 443) == records
    resolver.resolve_doh.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "records",
    [
        [],
        [record(HOST, "198.18.0.160", 443)],
        [record(HOST, "fdfe:dcba:9876::1", 443)],
        [record(HOST, "8.8.4.4", 443), record(HOST, "198.19.1.2", 443)],
    ],
)
async def test_fake_or_empty_system_dns_uses_public_fallback(resolver, records):
    resolver.resolver.resolve.return_value = records
    result = await resolver.resolve(HOST, 443)
    assert [r["host"] for r in result] == ["8.8.8.8"]
    assert result[0]["hostname"] == HOST and result[0]["port"] == 443


@pytest.mark.asyncio
async def test_failed_system_dns_uses_fallback(resolver):
    resolver.resolver.resolve.side_effect = socket.gaierror()
    assert (await resolver.resolve(HOST, 443))[0]["host"] == "8.8.8.8"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "::1",
        "fe80::1",
        "::ffff:127.0.0.1",
        "224.0.0.1",
    ],
)
async def test_private_addresses_are_not_a_fallback_trigger(resolver, address):
    resolver.resolver.resolve.return_value = [
        record(HOST, "198.18.0.2", 443),
        record(HOST, address, 443),
    ]
    with pytest.raises(MediaError):
        await resolver.resolve(HOST, 443)
    resolver.resolve_doh.assert_not_awaited()


@pytest.mark.asyncio
async def test_fallback_cannot_query_unapproved_hosts(resolver):
    with pytest.raises(MediaError):
        await resolver.resolve("gchat.qpic.cn.evil.example", 443)
    resolver.resolver.resolve.assert_not_awaited()
    resolver.resolve_doh.assert_not_awaited()


@pytest.mark.asyncio
async def test_expiring_cache_reuses_addresses_but_not_request_ports(resolver):
    resolver.resolver.resolve.return_value = [record(HOST, "198.18.0.2", 443)]
    await resolver.resolve(HOST, 443)
    assert (await resolver.resolve(HOST, 8443))[0]["port"] == 8443
    assert resolver.resolve_doh.await_count == 1
    resolver.cache[(HOST, 0)] = (0, ["8.8.4.4"])
    await resolver.resolve(HOST, 443)
    assert resolver.resolve_doh.await_count == 2
    resolver.resolver.resolve.return_value = [record(HOST, "8.8.4.4", 443)]
    assert (await resolver.resolve(HOST, 443))[0]["host"] == "8.8.4.4"


@pytest.mark.asyncio
async def test_disabled_fallback_and_cancellation(resolver):
    resolver.fallback = False
    resolver.resolver.resolve.return_value = [record(HOST, "198.18.0.2", 443)]
    with pytest.raises(MediaDNSUnavailable):
        await resolver.resolve(HOST, 443)
    resolver.resolve_doh.assert_not_awaited()
    resolver.resolver.resolve.side_effect = asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError):
        await resolver.resolve(HOST, 443)


def test_cname_chain_ttl_and_unrelated_answers():
    data = answer(ttl=90)
    data["Answer"][0].update(name="cdn.example.")
    data["Answer"] += [
        {"name": HOST, "type": 5, "TTL": 7, "data": "cdn.example."},
        {"name": "unrelated.example", "type": 1, "TTL": 1, "data": "127.0.0.1"},
    ]
    assert parse_answer(data, HOST, 1) == (["8.8.8.8"], 7)
    assert parse_answer(answer(ttl=600), HOST, 1)[1] == 30
    assert parse_answer(answer(ttl=0), HOST, 1)[1] == 0


@pytest.mark.parametrize(
    "address", ["127.0.0.1", "198.18.0.1", "10.0.0.1", "224.0.0.1"]
)
def test_doh_cannot_return_unsafe_addresses(address):
    with pytest.raises(MediaError):
        parse_answer(answer(address), HOST, 1)


def test_doh_mismatch_and_ipv6():
    data = answer()
    data["Question"] = data["Question"][0]
    assert parse_answer(data, HOST, 1)[0] == ["8.8.8.8"]
    with pytest.raises(ValueError):
        parse_answer(answer(host="other.example"), HOST, 1)
    with pytest.raises(ValueError):
        parse_answer({"Status": 2}, HOST, 1)
    assert parse_answer(answer("2606:4700:4700::1111", kind=28), HOST, 28)[0] == [
        "2606:4700:4700::1111"
    ]


@pytest.mark.asyncio
async def test_provider_failover_and_address_family():
    resolver = PublicResolver((HOST,))

    async def query(endpoint, host, kind):
        if endpoint == DOH_ENDPOINTS[0]:
            raise asyncio.TimeoutError()
        return (["8.8.8.8"] if kind == 1 else ["2606:4700:4700::1111"], 10)

    resolver.query = AsyncMock(side_effect=query)
    try:
        addresses, ttl = await resolver.resolve_doh(HOST, socket.AF_UNSPEC)
        assert addresses == ["8.8.8.8", "2606:4700:4700::1111"] and ttl == 10
        resolver.query = AsyncMock(side_effect=ValueError("bad response"))
        with pytest.raises(MediaDNSUnavailable):
            await resolver.resolve_doh(HOST, socket.AF_INET)
        assert resolver.query.await_count == len(DOH_ENDPOINTS)
        assert all(call.args[2] == 1 for call in resolver.query.await_args_list)
    finally:
        await resolver.close()


@pytest.mark.asyncio
async def test_doh_unsafe_answer_does_not_fall_through_to_another_provider():
    resolver = PublicResolver((HOST,))
    resolver.query = AsyncMock(side_effect=MediaError("unsafe"))
    try:
        with pytest.raises(MediaError):
            await resolver.resolve_doh(HOST, socket.AF_INET)
        assert resolver.query.await_count == 1
    finally:
        await resolver.close()


class Response:
    def __init__(self, body=b"image", status=200, headers=None):
        self.body, self.status, self.headers = body, status, headers or {}
        self.content_length = None
        self.content = self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def iter_chunked(self, size):
        for start in range(0, len(self.body), size):
            yield self.body[start : start + size]


def fake_session(monkeypatch, responses, calls, *, check=None):
    class Session:
        def __init__(self, **kwargs):
            self.connector = kwargs["connector"]
            if check:
                check(kwargs)

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            await self.connector.close()

        def get(self, url, **kwargs):
            calls.append((url, kwargs))
            return responses.pop(0)

    monkeypatch.setattr(aiohttp, "ClientSession", Session)


@pytest.mark.asyncio
async def test_doh_bootstrap_pins_ip_preserves_tls_hostname(monkeypatch):
    calls = []

    def check(kwargs):
        connector = kwargs["connector"]
        assert connector._ssl is True
        assert isinstance(connector._resolver, BootstrapResolver)
        assert connector._resolver.host == "dns.alidns.com"
        assert connector._resolver.address == "223.5.5.5"
        assert kwargs["trust_env"] is False

    fake_session(
        monkeypatch, [Response(json.dumps(answer()).encode())], calls, check=check
    )
    resolver = PublicResolver((HOST,))
    try:
        assert await resolver.query(DOH_ENDPOINTS[0], HOST, 1) == (["8.8.8.8"], 20)
        assert calls[0][0] == "https://dns.alidns.com/resolve"
        assert calls[0][1]["allow_redirects"] is False
        assert calls[0][1]["params"] == {"name": HOST, "type": "1"}
        bootstrap = BootstrapResolver("dns.alidns.com", "223.5.5.5")
        assert (await bootstrap.resolve("dns.alidns.com", 443))[0][
            "host"
        ] == "223.5.5.5"
        with pytest.raises(MediaError):
            await bootstrap.resolve("evil.example", 443)
    finally:
        await resolver.close()


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [Response(status=302), Response(b"x" * 32769)])
async def test_doh_redirects_and_large_responses_rejected(monkeypatch, response):
    calls = []
    fake_session(monkeypatch, [response], calls)
    resolver = PublicResolver((HOST,))
    try:
        with pytest.raises(ValueError):
            await resolver.query(DOH_ENDPOINTS[0], HOST, 1)
    finally:
        await resolver.close()


@pytest.mark.asyncio
async def test_connection_failure_refreshes_dns_without_duplicate_success(media):
    media.dns_cache["old"] = (999999, ["8.8.8.8"])
    media._download_once = AsyncMock(
        side_effect=[aiohttp.ClientConnectionError(), b"image"]
    )
    assert await media.download(URL, 100) == b"image"
    assert not media.dns_cache
    assert [c.kwargs["force_doh"] for c in media._download_once.await_args_list] == [
        False,
        True,
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "error",
    [
        MediaError("HTTP 403"),
        MediaError("oversize"),
        aiohttp.ClientSSLError(None, OSError()),
    ],
)
async def test_policy_http_and_tls_failures_do_not_retry(media, error):
    media._download_once = AsyncMock(side_effect=error)
    with pytest.raises(MediaError):
        await media.download(URL, 100)
    assert media._download_once.await_count == 1


@pytest.mark.asyncio
async def test_retry_is_bounded_and_errors_hide_signed_url(media):
    media._download_once = AsyncMock(side_effect=aiohttp.ClientConnectionError(URL))
    with pytest.raises(MediaError) as caught:
        await media.download(URL, 100)
    assert "secret" not in str(caught.value) and "https" not in str(caught.value)
    assert media._download_once.await_count == 2


@pytest.mark.asyncio
async def test_media_redirect_and_stream_limit_remain_enforced(monkeypatch, media):
    calls = []
    fake_session(
        monkeypatch,
        [Response(status=302, headers={"Location": "https://127.0.0.1/private"})],
        calls,
    )
    with pytest.raises(MediaError):
        await media.download(URL, 100)
    assert len(calls) == 1
    fake_session(monkeypatch, [Response(b"x" * 101)], calls)
    with pytest.raises(MediaError, match="过大"):
        await media.download(URL, 100)


@pytest.mark.asyncio
async def test_total_timeout_and_cancellation_cleanup(monkeypatch, media):
    import channels.media as module

    original = asyncio.wait_for
    budgets = []

    async def short_wait(awaitable, timeout):
        budgets.append(timeout)
        return await original(awaitable, 0.01)

    cleaned = []

    async def slow(*args):
        try:
            await asyncio.sleep(60)
        finally:
            cleaned.append(True)

    media._download_retry = slow
    monkeypatch.setattr(module.asyncio, "wait_for", short_wait)
    with pytest.raises(MediaError, match="超时"):
        await media.download(URL, 100)
    assert budgets == [30] and cleaned == [True]


@pytest.mark.asyncio
async def test_doh_cancellation_closes_all_inflight_queries():
    resolver = PublicResolver((HOST,))
    started, stopped = [], []
    ready = asyncio.Event()

    async def query(endpoint, host, kind):
        started.append(kind)
        if len(started) == 2:
            ready.set()
        try:
            await asyncio.sleep(60)
        finally:
            stopped.append(kind)

    resolver.query = query
    task = asyncio.create_task(resolver.resolve_doh(HOST, socket.AF_UNSPEC))
    try:
        await asyncio.wait_for(ready.wait(), 1)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert sorted(stopped) == [1, 28]
    finally:
        await resolver.close()


def test_fallback_config_is_enabled_by_default(monkeypatch):
    monkeypatch.delenv("UNA_QQ_MEDIA_DNS_FALLBACK", raising=False)
    assert QQConfig.load().media_dns_fallback
    monkeypatch.setenv("UNA_QQ_MEDIA_DNS_FALLBACK", "false")
    assert not QQConfig.load().media_dns_fallback


@pytest.mark.asyncio
async def test_resolver_close_cancels_connector_shielded_dns_work(resolver):
    ready = asyncio.Event()

    async def slow(*args):
        ready.set()
        await asyncio.sleep(60)

    resolver.force_doh = True
    resolver.resolve_doh = slow
    task = asyncio.create_task(resolver.resolve(HOST, 443))
    await asyncio.wait_for(ready.wait(), 1)
    await resolver.close()
    assert task.cancelled() and not resolver.pending
