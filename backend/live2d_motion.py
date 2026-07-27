"""Validation for AI-generated Live2D motion v3 plans."""

import math
import time
import uuid


ALLOWED_CHANNELS = frozenset({
    "head_yaw", "head_pitch", "head_roll",
    "body_yaw", "body_pitch", "body_roll",
    "gaze_x", "gaze_y", "eye_open", "eye_smile",
    "brow_y", "brow_form", "cheek",
})
ALLOWED_MODES = frozenset({"override", "additive"})
ALLOWED_EASINGS = frozenset({"linear", "ease_in", "ease_out", "ease_in_out"})
MAX_TRACKS = 8
MAX_KEYFRAMES = 12


def _finite_number(value):
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("non-finite")
    return number


def _clamped_milliseconds(value, minimum, maximum):
    return min(maximum, max(minimum, int(_finite_number(value))))


def _parse_track(track):
    if not isinstance(track, dict):
        return None

    channel = track.get("channel")
    mode = track.get("mode")
    keyframes = track.get("keyframes")
    if (
        channel not in ALLOWED_CHANNELS
        or mode not in ALLOWED_MODES
        or not isinstance(keyframes, list)
        or not 2 <= len(keyframes) <= MAX_KEYFRAMES
    ):
        return None

    normalized_frames = []
    previous_t = None
    for keyframe in keyframes:
        if not isinstance(keyframe, dict):
            return None
        try:
            t = _finite_number(keyframe.get("t"))
            value = _finite_number(keyframe.get("value"))
        except (TypeError, ValueError, OverflowError):
            return None

        easing = keyframe.get("easing", "linear")
        if easing not in ALLOWED_EASINGS or (previous_t is not None and t <= previous_t):
            return None

        normalized_frames.append({"t": t, "value": value, "easing": easing})
        previous_t = t

    return {"channel": channel, "mode": mode, "keyframes": normalized_frames}


def is_motion_v3_candidate(payload):
    """Return whether a control payload declares the v3 tracks contract."""
    return isinstance(payload, dict) and "tracks" in payload


def parse_motion_plan(payload):
    """Normalize an untrusted motion plan into safe semantic tracks."""
    if not isinstance(payload, dict) or not isinstance(payload.get("tracks"), list) or not payload["tracks"]:
        return None

    try:
        duration_ms = _clamped_milliseconds(payload.get("duration_ms", 800), 400, 3000)
        blend = payload.get("blend", {})
        if not isinstance(blend, dict):
            return None
        blend_in_ms = _clamped_milliseconds(blend.get("in_ms", 0), 0, 500)
        blend_out_ms = _clamped_milliseconds(blend.get("out_ms", 0), 0, 500)
    except (TypeError, ValueError, OverflowError):
        return None

    variation_seed = payload.get("variation_seed", 0)
    if not isinstance(variation_seed, int) or isinstance(variation_seed, bool) or variation_seed < 0:
        return None

    tracks = []
    for track in payload["tracks"]:
        normalized_track = _parse_track(track)
        if normalized_track is not None:
            tracks.append(normalized_track)
            if len(tracks) == MAX_TRACKS:
                break

    if not tracks:
        return None

    return {
        "duration_ms": duration_ms,
        "variation_seed": variation_seed,
        "blend": {"in_ms": blend_in_ms, "out_ms": blend_out_ms},
        "tracks": tracks,
    }


class MotionDirectorV3:
    """Creates authoritative Live2D motion events at a safe reply cadence."""

    def __init__(self, clock=time.time, id_factory=lambda: str(uuid.uuid4())):
        self.clock = clock
        self.id_factory = id_factory
        self._last_motion_at = {}

    def decide(self, user_id, payload):
        plan = parse_motion_plan(payload)
        if plan is None:
            return None

        now = self.clock()
        last_motion_at = self._last_motion_at.get(user_id, float("-inf"))
        if now - last_motion_at < 3.0:
            return None
        self._last_motion_at[user_id] = now

        created_at_ms = int(now * 1000)
        return {
            "type": "live2d_motion_v3",
            "motion_id": self.id_factory(),
            "source": "ai_reply",
            "created_at_ms": created_at_ms,
            "expires_at_ms": created_at_ms + 10000,
            **plan,
        }
