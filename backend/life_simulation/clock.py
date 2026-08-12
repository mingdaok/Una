"""用户时区与离线生活窗口计算。"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .models import LifeWindow


WINDOW_SPECS = (
    ("night", "夜间", time(0, 0), time(6, 0)),
    ("morning", "早晨", time(6, 0), time(9, 0)),
    ("forenoon", "上午", time(9, 0), time(12, 0)),
    ("noon", "中午", time(12, 0), time(14, 0)),
    ("afternoon", "下午", time(14, 0), time(18, 0)),
    ("evening", "晚间", time(18, 0), time(22, 0)),
    ("late_night", "深夜", time(22, 0), time(0, 0)),
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


FIXED_TIMEZONE_FALLBACKS: dict[str, tzinfo] = {
    "UTC": timezone.utc,
    "Etc/UTC": timezone.utc,
    "Asia/Shanghai": timezone(timedelta(hours=8), name="Asia/Shanghai"),
}


def get_timezone(name: str) -> tzinfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError) as error:
        fallback = FIXED_TIMEZONE_FALLBACKS.get(name)
        if fallback is not None:
            return fallback
        raise ValueError(f"无效时区: {name}") from error


def _window_for_day(day: date, key: str, label: str, start: time, end: time, tz: tzinfo) -> LifeWindow:
    start_at = datetime.combine(day, start, tzinfo=tz)
    end_day = day + timedelta(days=1) if end <= start else day
    end_at = datetime.combine(end_day, end, tzinfo=tz)
    return LifeWindow(key=key, label=label, start_at=start_at, end_at=end_at)


def completed_windows(
    after: str | datetime,
    until: str | datetime,
    timezone_name: str,
    *,
    max_windows: int = 56,
) -> tuple[list[LifeWindow], bool]:
    """返回 `(after, until]` 中已经结束的窗口及是否达到上限。"""

    if max_windows < 1:
        raise ValueError("max_windows 必须大于 0")
    tz = get_timezone(timezone_name)
    after_local = parse_datetime(after).astimezone(tz)
    until_local = parse_datetime(until).astimezone(tz)
    if until_local <= after_local:
        return [], False

    windows: list[LifeWindow] = []
    day = after_local.date()
    final_day = until_local.date()
    while day <= final_day:
        for key, label, start, end in WINDOW_SPECS:
            window = _window_for_day(day, key, label, start, end, tz)
            if window.end_at <= after_local or window.end_at > until_local:
                continue
            windows.append(window)
            if len(windows) == max_windows:
                more_exist = window.end_at < until_local
                return windows, more_exist
        day += timedelta(days=1)
    return windows, False


def calendar_windows(
    start: str | datetime,
    end: str | datetime,
    timezone_name: str,
    *,
    max_windows: int = 100,
) -> list[LifeWindow]:
    """返回与 `[start, end)` 相交的标准日程窗口，包括尚未结束的窗口。"""

    if max_windows < 1:
        raise ValueError("max_windows 必须大于 0")
    tz = get_timezone(timezone_name)
    start_local = parse_datetime(start).astimezone(tz)
    end_local = parse_datetime(end).astimezone(tz)
    if end_local <= start_local:
        return []
    windows: list[LifeWindow] = []
    day = start_local.date() - timedelta(days=1)
    final_day = end_local.date()
    while day <= final_day:
        for key, label, window_start, window_end in WINDOW_SPECS:
            window = _window_for_day(
                day, key, label, window_start, window_end, tz
            )
            if window.end_at <= start_local or window.start_at >= end_local:
                continue
            windows.append(window)
            if len(windows) >= max_windows:
                return windows
        day += timedelta(days=1)
    return windows
