# -*- coding: utf-8 -*-
# ================== geo_lookup.py ==================
# Tra cứu vị trí địa lý từ IP - gọi từ server Render

import json, time
from collections import defaultdict

_cache = {}           # ip → {data, ts}
_CACHE_TTL = 3600     # cache 1 giờ

def get_ip_info(ip: str) -> dict:
    """Tra cứu thông tin địa lý + ISP của IP"""
    # Bỏ qua IP nội bộ
    if ip in ("127.0.0.1","::1","unknown") or ip.startswith("10.") or ip.startswith("192.168."):
        return {"city":"Nội bộ","region":"","country":"","isp":"","lat":0,"lon":0,"map_url":""}

    # Kiểm tra cache
    now = time.time()
    if ip in _cache and now - _cache[ip]["ts"] < _CACHE_TTL:
        return _cache[ip]["data"]

    data = {"city":"Không xác định","region":"","country":"","isp":"","lat":0,"lon":0,"map_url":""}

    # Thử ip-api.com (miễn phí, 45 req/phút)
    try:
        import urllib.request
        url = f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city,isp,org,lat,lon&lang=vi"
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
        r   = urllib.request.urlopen(req, timeout=5)
        j   = json.loads(r.read().decode())
        if j.get("status") == "success":
            data = {
                "city":    j.get("city",""),
                "region":  j.get("regionName",""),
                "country": j.get("country",""),
                "isp":     j.get("isp","") or j.get("org",""),
                "lat":     j.get("lat",0),
                "lon":     j.get("lon",0),
                "map_url": f"https://www.google.com/maps?q={j.get('lat',0)},{j.get('lon',0)}&z=12"
            }
    except Exception:
        # Fallback: ipwho.is
        try:
            import urllib.request
            url = f"https://ipwho.is/{ip}"
            req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
            r   = urllib.request.urlopen(req, timeout=5)
            j   = json.loads(r.read().decode())
            if j.get("success"):
                lat = j.get("latitude",0)
                lon = j.get("longitude",0)
                data = {
                    "city":    j.get("city",""),
                    "region":  j.get("region",""),
                    "country": j.get("country",""),
                    "isp":     j.get("connection",{}).get("isp",""),
                    "lat":     lat,
                    "lon":     lon,
                    "map_url": f"https://www.google.com/maps?q={lat},{lon}&z=12"
                }
        except Exception:
            pass

    _cache[ip] = {"data": data, "ts": now}
    return data


def format_location(info: dict) -> str:
    """Format địa chỉ đẹp"""
    parts = [p for p in [info.get("city"), info.get("region"), info.get("country")] if p]
    return ", ".join(parts) if parts else "Không xác định"
