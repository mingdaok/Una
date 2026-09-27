"""Validated media DNS, with HTTPS fallback for TUN/Fake-IP networks."""

import asyncio
import ipaddress
import json
import socket
import time

import aiohttp


class MediaError(ValueError):
    pass


class MediaDNSUnavailable(MediaError):
    pass


FAKE_IPV4 = ipaddress.ip_network("198.18.0.0/15")
FAKE_IPV6 = ipaddress.ip_network("fdfe:dcba:9876::/48")
# Fixed bootstrap addresses avoid asking the intercepted system DNS about DoH.
# HTTPS still verifies the original hostname and uses it for SNI.
DOH_ENDPOINTS = (
    ("dns.alidns.com", "223.5.5.5", "/resolve"),
    ("dns.alidns.com", "223.6.6.6", "/resolve"),
    ("cloudflare-dns.com", "1.1.1.1", "/dns-query"),
)


def record(host, address, port):
    ip = ipaddress.ip_address(address)
    return dict(
        hostname=host,
        host=str(ip),
        port=port,
        family=socket.AF_INET6 if ip.version == 6 else socket.AF_INET,
        proto=socket.IPPROTO_TCP,
        flags=socket.AI_NUMERICHOST,
    )


def public(address):
    ip = ipaddress.ip_address(address)
    # IPv4-mapped addresses need the same checks on their embedded address.
    ip = getattr(ip, "ipv4_mapped", None) or ip
    return ip.is_global and not ip.is_multicast


class BootstrapResolver(aiohttp.abc.AbstractResolver):
    def __init__(self, host, address):
        self.host, self.address = host, address

    async def resolve(self, host, port=0, family=0):
        if host != self.host:
            raise MediaError("DNS 服务地址不在允许范围")
        return [record(host, self.address, port)]

    async def close(self):
        pass


def parse_answer(payload, host, qtype):
    """Only accept answers belonging to the requested name or its CNAME chain."""
    if not isinstance(payload, dict) or payload.get("Status") != 0:
        raise ValueError("DNS response failed")
    questions = payload.get("Question", [])
    # AliDNS returns one object; Cloudflare returns a one-element array.
    if isinstance(questions, dict):
        questions = [questions]
    if (
        len(questions) != 1
        or questions[0].get("type") != qtype
        or str(questions[0].get("name", "")).rstrip(".").lower() != host.lower()
    ):
        raise ValueError("DNS question mismatch")
    answers = payload.get("Answer", [])
    if not isinstance(answers, list) or len(answers) > 64:
        raise ValueError("DNS answer limit")
    names = {host.lower().rstrip(".")}
    ttl = 30
    for _ in range(16):
        previous = len(names)
        for answer in answers:
            owner = str(answer.get("name", "")).rstrip(".").lower()
            if owner in names and answer.get("type") == 5:
                names.add(str(answer["data"]).rstrip(".").lower())
                ttl = min(ttl, max(0, int(answer.get("TTL", 0))))
        if len(names) == previous:
            break
    addresses = []
    for answer in answers:
        if (
            str(answer.get("name", "")).rstrip(".").lower() not in names
            or answer.get("type") != qtype
        ):
            continue
        ip = ipaddress.ip_address(answer["data"])
        if ip.version != (4 if qtype == 1 else 6) or not public(str(ip)):
            raise MediaError("媒体 DNS 返回了非公网地址")
        addresses.append(str(ip))
        ttl = min(ttl, max(0, int(answer.get("TTL", 0))))
    return addresses, ttl


class PublicResolver(aiohttp.abc.AbstractResolver):
    def __init__(self, allowed_hosts=(), *, fallback=True, force_doh=False, cache=None):
        self.resolver = aiohttp.resolver.ThreadedResolver()
        self.allowed_hosts = frozenset(allowed_hosts)
        self.fallback, self.force_doh = fallback, force_doh
        self.cache = cache if cache is not None else {}
        self.pending = set()

    async def resolve(self, host, port=0, family=0):
        task = asyncio.current_task()
        self.pending.add(task)
        try:
            return await self._resolve(host, port, family)
        finally:
            self.pending.discard(task)

    async def _resolve(self, host, port, family):
        if self.allowed_hosts and host not in self.allowed_hosts:
            raise MediaError("媒体下载地址不在允许范围")
        records = []
        if not self.force_doh:
            try:
                records = await asyncio.wait_for(
                    self.resolver.resolve(host, port, family), 3
                )
            except (OSError, asyncio.TimeoutError):
                pass
            fake = False
            for entry in records:
                ip = ipaddress.ip_address(entry["host"])
                if (ip.version == 4 and ip in FAKE_IPV4) or (
                    ip.version == 6 and ip in FAKE_IPV6
                ):
                    fake = True
                elif not public(str(ip)):
                    # Loopback/private/link-local results are never a fallback trigger.
                    raise MediaError("媒体地址不可访问：非公网地址")
            if records and not fake:
                return records
        if not self.fallback or host not in self.allowed_hosts:
            raise MediaDNSUnavailable("媒体 DNS 解析失败")
        key = (host, family)
        cached = self.cache.get(key)
        if cached and cached[0] > time.monotonic():
            addresses = cached[1]
        else:
            addresses, ttl = await self.resolve_doh(host, family)
            self.cache[key] = (time.monotonic() + ttl, addresses)
        return [record(host, address, port) for address in addresses]

    async def query(self, endpoint, host, qtype):
        name, address, path = endpoint
        bootstrap = BootstrapResolver(name, address)
        async with aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(resolver=bootstrap, use_dns_cache=False, ssl=True),
            timeout=aiohttp.ClientTimeout(total=3),
            trust_env=False,
        ) as session:
            async with session.get(
                "https://" + name + path,
                params={"name": host, "type": str(qtype)},
                headers={"Accept": "application/dns-json"},
                allow_redirects=False,
            ) as response:
                if response.status != 200:
                    raise ValueError("DNS HTTP failure")
                body = bytearray()
                async for chunk in response.content.iter_chunked(4096):
                    body.extend(chunk)
                    if len(body) > 32768:
                        raise ValueError("DNS response limit")
                return parse_answer(json.loads(body), host, qtype)

    async def resolve_doh(self, host, family):
        types = (
            (28,)
            if family == socket.AF_INET6
            else (1,)
            if family == socket.AF_INET
            else (1, 28)
        )
        for endpoint in DOH_ENDPOINTS:
            tasks = [
                asyncio.create_task(self.query(endpoint, host, kind)) for kind in types
            ]
            try:
                results = await asyncio.gather(*tasks, return_exceptions=True)
            finally:
                for task in tasks:
                    if not task.done():
                        task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
            addresses, ttl = [], 30
            for result in results:
                if isinstance(result, MediaError):
                    raise result
                if isinstance(result, BaseException):
                    continue
                values, lifetime = result
                addresses.extend(values)
                ttl = min(ttl, lifetime)
            if addresses:
                return list(dict.fromkeys(addresses)), ttl
        raise MediaDNSUnavailable("媒体 DNS 解析失败，请检查网络后重试")

    async def close(self):
        # Older aiohttp versions shield resolver tasks from request cancellation.
        pending = [task for task in self.pending if task is not asyncio.current_task()]
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        await self.resolver.close()
