"""Stable location identifiers and user-facing Chinese names."""

from __future__ import annotations


LOCATION_NAMES = {
    "city": "城里", "gallery": "画廊", "hardware_market": "五金市场",
    "home": "家中", "library_cafe": "图书馆咖啡区", "neighborhood": "街区",
    "neighborhood_cafe": "街区咖啡馆", "neighborhood_shop": "街区小店",
    "old_bookstore": "旧书店", "old_street_market": "老街市集",
    "old_town": "老城区", "online": "线上", "personal_space": "自己的空间",
    "riverside": "河边", "riverside_route": "沿河路线", "south_bridge": "南桥",
    "studio": "工作室", "workshop": "手作工坊",
}


def location_name(location_id: str | None) -> str:
    if not location_id:
        return "未知地点"
    return LOCATION_NAMES.get(location_id, location_id.replace("_", " "))


__all__ = ["LOCATION_NAMES", "location_name"]
