"""Bounded media input. DNS is checked on the connector actually used for download."""

import asyncio
import base64
import io
import ipaddress
import json
import os
import shutil
import re
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse, urljoin
import aiohttp
from PIL import Image, ImageOps, UnidentifiedImageError
from .media_dns import MediaError, PublicResolver


class QQMedia:
    def __init__(self, config, adapter, vision, asr, tts):
        self.config, self.adapter, self.vision, self.asr, self.tts = (
            config,
            adapter,
            vision,
            asr,
            tts,
        )
        self.root = Path(config.media_dir).resolve()
        # Do not create QQ storage while the feature is disabled.
        if config.enabled and not config.error:
            self.root.mkdir(parents=True, exist_ok=True)
        self.inference = asyncio.Semaphore(1)
        self.inference_tasks = set()
        self.decoder_pair = None
        self.decoder_lock = asyncio.Lock()
        self.dns_cache = {}

    def validate_url(self, url):
        parsed = urlparse(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in self.config.media_hosts
            or parsed.username
            or parsed.password
            or parsed.port not in (None, 443)
        ):
            raise MediaError("媒体下载地址不在允许范围")
        try:
            address = ipaddress.ip_address(parsed.hostname)
        except ValueError:
            return
        if not address.is_global:
            raise MediaError("媒体地址不可访问")

    async def download(self, url, limit):
        self.validate_url(url)
        try:
            return await asyncio.wait_for(self._download_retry(url, limit), 30)
        except asyncio.TimeoutError:
            raise MediaError("媒体下载超时，请检查网络后重试") from None

    async def _download_retry(self, url, limit):
        for attempt in range(2):
            try:
                return await self._download_once(url, limit, force_doh=bool(attempt))
            except aiohttp.ClientSSLError:
                raise MediaError("媒体 HTTPS 证书校验失败") from None
            except (aiohttp.ClientConnectionError, aiohttp.ClientPayloadError, asyncio.TimeoutError):
                self.dns_cache.clear()
                if attempt:
                    raise MediaError("媒体下载连接失败，请检查网络后重试") from None

    async def _download_once(self, url, limit, *, force_doh=False):
        resolver = PublicResolver(
            self.config.media_hosts, fallback=self.config.media_dns_fallback,
            force_doh=force_doh and self.config.media_dns_fallback, cache=self.dns_cache,
        )
        try:
            return await self._download_session(url, limit, resolver)
        finally:
            await resolver.close()

    async def _download_session(self, url, limit, resolver):
        async with aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(resolver=resolver, ttl_dns_cache=10, ssl=True),
            # download() owns the total deadline, including redirects and retry.
            timeout=aiohttp.ClientTimeout(total=None, connect=13, sock_read=8),
            trust_env=False,
        ) as session:
            for _ in range(4):
                self.validate_url(url)
                async with session.get(url, allow_redirects=False) as response:
                    if response.status in (301, 302, 303, 307, 308):
                        url = urljoin(url, response.headers.get("Location", ""))
                        continue
                    if response.status != 200:
                        raise MediaError("媒体下载失败：HTTP " + str(response.status))
                    if response.content_length and response.content_length > limit:
                        raise MediaError("媒体文件过大")
                    result = bytearray()
                    async for chunk in response.content.iter_chunked(65536):
                        result.extend(chunk)
                        if len(result) > limit:
                            raise MediaError("媒体文件过大")
                    return bytes(result)
            raise MediaError("媒体重定向过多")

    async def process(self, event):
        images = [s for s in event["segments"] if s["type"] == "image"]
        voices = [s for s in event["segments"] if s["type"] == "record"]
        if len(images) > 3:
            raise MediaError("每条消息最多分析 3 张图片")
        if len(voices) > 1:
            raise MediaError("每条消息请只发送一段语音")
        descriptions = []
        image_inputs = []
        for segment in images + voices:
            url = segment["data"].get("url")
            if not url:
                raise MediaError("协议端未提供可下载媒体地址，请检查媒体 URL 上报配置")
            image = segment["type"] == "image"
            content = await self.download(url, (10 if image else 20) * 1024 * 1024)
            if image:

                def prepare():
                    with Image.open(io.BytesIO(content)) as source:
                        if source.format not in ("PNG", "JPEG", "WEBP", "GIF"):
                            raise MediaError("不支持的图片格式")
                        if source.width * source.height > 20_000_000:
                            raise MediaError("图片像素过大")
                        source.load()
                        target = io.BytesIO()
                        prepared = ImageOps.exif_transpose(source).convert("RGB")
                        prepared.thumbnail((2048, 2048))
                        prepared.save(target, format="JPEG", quality=90)
                        return base64.b64encode(target.getvalue()).decode()

                try:
                    encoded = await asyncio.to_thread(prepare)
                except (
                    UnidentifiedImageError,
                    OSError,
                    Image.DecompressionBombError,
                ) as error:
                    raise MediaError("图片无法解码，请重新发送清晰图片") from error
                image_inputs.append("data:image/jpeg;base64," + encoded)
            else:
                demuxer = audio_demuxer(content)
                path = self.root / (uuid.uuid4().hex + ".input")
                wav = self.root / (uuid.uuid4().hex + ".wav")
                try:
                    path.write_bytes(content)
                    probe = await self.command(
                        "ffprobe",
                        "-protocol_whitelist",
                        "file",
                        "-format_whitelist",
                        demuxer,
                        "-f",
                        demuxer,
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration",
                        "-of",
                        "json",
                        str(path),
                    )
                    duration = float(json.loads(probe)["format"]["duration"])
                    if not 0 < duration <= 60:
                        raise MediaError("语音时长须在 60 秒以内")
                    await self.command(
                        "ffmpeg",
                        "-nostdin",
                        "-y",
                        "-protocol_whitelist",
                        "file",
                        "-format_whitelist",
                        demuxer,
                        "-f",
                        demuxer,
                        "-i",
                        str(path),
                        "-t",
                        "60",
                        "-ar",
                        "16000",
                        "-ac",
                        "1",
                        str(wav),
                    )
                    import wave

                    with wave.open(str(wav), "rb") as audio:
                        pcm = audio.readframes(audio.getnframes())
                    result = await self.infer(self.asr.recognize_pcm16, pcm, 16000)
                    text = result[0] if isinstance(result, tuple) else result
                    if not text:
                        raise MediaError("没有识别到语音，请再说一次")
                    descriptions.append("语音转写：" + text)
                finally:
                    path.unlink(missing_ok=True)
                    wav.unlink(missing_ok=True)
        # Image bytes stay ephemeral: they never become message text or memory entries.
        return {
            "text": event["text"]
            + ("\n" + "\n".join(descriptions) if descriptions else ""),
            "images": image_inputs,
        }

    async def infer(self, function, *args, **kwargs):
        await self.inference.acquire()
        task = asyncio.create_task(asyncio.to_thread(function, *args, **kwargs))
        self.inference_tasks.add(task)

        def done(future):
            self.inference_tasks.discard(future)
            self.inference.release()
            if not future.cancelled():
                future.exception()

        task.add_done_callback(done)
        # Cancellation does not release the slot while a blocking model is still running.
        return await asyncio.shield(task)

    async def command(self, *args):
        if args[0] in ("ffmpeg", "ffprobe"):
            executable = shutil.which((os.getenv("UNA_QQ_FFMPEG") or "ffmpeg"))
            if not executable:
                raise MediaError("未找到 FFmpeg，请配置 UNA_QQ_FFMPEG")
            extension = Path(executable).suffix
            binary = Path(executable).resolve().with_name(args[0] + extension)
            if not binary.is_file():
                raise MediaError("FFmpeg 目录缺少配套 FFprobe")
            await self.verify_decoders(Path(executable).resolve())
            args = (str(binary), *args[1:])
        if "-f" in args and args[args.index("-f") + 1] == "mov":
            index = args.index("-f")
            args = (
                *args[:index],
                "-enable_drefs",
                "0",
                "-use_absolute_path",
                "0",
                *args[index:],
            )
        process = await asyncio.create_subprocess_exec(
            *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL
        )
        try:
            output, _ = await asyncio.wait_for(process.communicate(), 30)
        except BaseException:
            if process.returncode is None:
                process.kill()
            await process.wait()
            raise
        if process.returncode:
            raise MediaError("音频格式无法处理")
        return output

    async def verify_decoders(self, ffmpeg):
        probe = ffmpeg.with_name("ffprobe" + ffmpeg.suffix)
        if not probe.is_file():
            raise MediaError("FFmpeg 目录缺少配套 FFprobe")
        key = (str(ffmpeg), ffmpeg.stat().st_mtime_ns, probe.stat().st_mtime_ns)
        if self.decoder_pair == key:
            return
        async with self.decoder_lock:
            if self.decoder_pair == key:
                return
            versions = []
            for binary in (ffmpeg, probe):
                process = await asyncio.create_subprocess_exec(
                    str(binary),
                    "-version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                try:
                    output, _ = await asyncio.wait_for(process.communicate(), 5)
                except BaseException:
                    if process.returncode is None:
                        process.kill()
                    await process.wait()
                    raise
                match = re.search(rb"version\s+(\S+)", output[:1000])
                if process.returncode or not match:
                    raise MediaError("无法确认 FFmpeg/FFprobe 版本")
                versions.append(match.group(1))
            if versions[0] != versions[1]:
                raise MediaError("FFmpeg 与 FFprobe 版本不匹配，请使用同一发行包")
            self.decoder_pair = key

    async def synthesize(self, text, emotion):
        result = await asyncio.wait_for(
            self.tts(text, emotion, lipsync=False, output_dir=str(self.root)), 150
        )
        if not result or not result[0]:
            return None
        path = Path(result[0]).resolve()
        if not path.is_relative_to(self.root) or not path.is_file():
            raise MediaError("语音输出路径无效")
        return path.as_uri()

    def cleanup(self):
        for path in self.root.iterdir():
            if (
                path.is_file()
                and not path.is_symlink()
                and path.stat().st_mtime < time.time() - 86400
            ):
                path.unlink(missing_ok=True)


def audio_demuxer(content):
    """Select self-contained audio containers before invoking native decoders."""
    if content[:4] == b"RIFF" and content[8:12] == b"WAVE":
        return "wav"
    if content.startswith(b"OggS"):
        return "ogg"
    if content.startswith(b"fLaC"):
        return "flac"
    if content.startswith(b"#!AMR"):
        return "amr"
    if content.startswith(b"ID3") or (
        len(content) > 1 and content[0] == 255 and content[1] & 0xE0 == 0xE0
    ):
        return (
            "aac"
            if not content.startswith(b"ID3") and content[1] & 0xF6 == 0xF0
            else "mp3"
        )
    # MOV/MP4 external data references are not enabled. Other reference-bearing
    # containers (HLS, concat, XML playlists) never reach FFprobe/FFmpeg.
    if len(content) > 12 and content[4:8] == b"ftyp":
        return "mov"
    raise MediaError("不支持该语音容器，请发送 WAV/MP3/AAC/OGG/FLAC/AMR/M4A")
