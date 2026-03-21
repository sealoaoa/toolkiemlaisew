# -*- coding: utf-8 -*-
# ================== intrusion_detector.py ==================
# Phát hiện crack API - KHÔNG tự ban IP
# Chỉ log + gửi Telegram để admin tự /banip

import os, json, time, re
from collections import defaultdict
from flask import request, session

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "intrusion_log.json")

# IP bị ban thủ công bởi admin (load từ DB khi khởi động)
_banned_ips = {}   # ip → ban_until timestamp

# ── Throttle cảnh báo: tránh spam Telegram ─────────────────────────────────
_last_alert = {}   # ip → timestamp lần cuối gửi

def get_real_ip():
    for h in ["CF-Connecting-IP","X-Forwarded-For","X-Real-IP"]:
        v = request.headers.get(h,"")
        if v: return v.split(",")[0].strip()
    return request.remote_addr or "unknown"

def is_banned(ip: str) -> bool:
    """Kiểm tra IP có bị admin ban không"""
    # Load từ DB mỗi lần kiểm tra (để nhận /banip realtime)
    try:
        from config import load_db
        db = load_db()
        ban_info = db.get("banned_ips", {}).get(ip)
        if ban_info and time.time() < ban_info.get("ban_until", 0):
            return True
    except Exception:
        pass
    # Kiểm tra memory cache
    if ip in _banned_ips:
        if time.time() < _banned_ips[ip]:
            return True
        del _banned_ips[ip]
    return False

def save_log(ip, username, path, ua, reason):
    try:
        logs = []
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE,"r",encoding="utf-8") as f:
                logs = json.load(f)
    except Exception:
        logs = []
    logs.insert(0,{
        "time": time.strftime("%H:%M:%S %d/%m/%Y"),
        "ip": ip, "username": username,
        "path": path, "ua": ua[:100], "reason": reason
    })
    logs = logs[:300]
    try:
        with open(LOG_FILE,"w",encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
    except Exception: pass

def send_alert(ip, username, path, ua):
    """Gửi cảnh báo Telegram - throttle 60s/IP"""
    now = time.time()
    if now - _last_alert.get(ip, 0) < 60:
        return
    _last_alert[ip] = now
    try:
        from config import BOT_TOKEN, ADMIN_ID
        import requests as req
        t = time.strftime("%H:%M:%S %d/%m/%Y")
        msg = (
            f"🚨 PHÁT HIỆN CRACK API\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👤 Tài khoản: {username or '(chưa đăng nhập)'}\n"
            f"🔗 Route: {path}\n"
            f"📡 IP: {ip}\n"
            f"💻 UA: {ua[:80]}\n"
            f"🕐 {t}\n\n"
            f"👉 Ban web: /band {username}\n"
            f"👉 Ban IP:  /banip {ip}"
        )
        req.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": ADMIN_ID, "text": msg},
            timeout=4
        )
    except Exception as e:
        print(f"[ALERT ERROR] {e}")

def detect_and_block():
    from flask import jsonify, redirect, url_for

    # Bỏ qua static files
    if request.path.startswith("/static/"):
        return None

    ip = get_real_ip()

    # ── IP bị admin ban → chặn TOÀN BỘ trang ──────────────────────────────
    if is_banned(ip):
        # Nếu là request API → trả JSON
        if request.path.startswith("/api/"):
            return jsonify({
                "ok": False,
                "error": "có trình đéo mà lấy 🖕 IP bị chặn. Mua key: t.me/sewdangcap",
                "code": 403
            }), 403
        # Nếu là trang web → hiện trang chặn
        from flask import make_response
        html = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Blocked</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a1628;display:flex;align-items:center;justify-content:center;
     height:100vh;font-family:Arial,sans-serif;color:#fff;text-align:center}
.box{padding:40px;max-width:420px}
.icon{font-size:72px;margin-bottom:20px}
h1{color:#ff4444;font-size:26px;margin-bottom:12px}
p{color:#aaa;font-size:15px;line-height:1.6;margin-bottom:8px}
a{color:#00e6b4;text-decoration:none;font-weight:bold}
</style></head>
<body><div class="box">
<div class="icon">🚫</div>
<h1>IP của bạn đã bị chặn</h1>
<p>Bạn đã vi phạm điều khoản sử dụng của <strong>TOOLKIEMLAISEW.SITE</strong></p>
<p>Để được hỗ trợ hoặc khiếu nại, liên hệ admin:</p>
<p><a href="https://t.me/sewdangcap">📩 t.me/sewdangcap</a></p>
</div></body></html>"""
        resp = make_response(html, 403)
        return resp

    # ── Chỉ kiểm tra crack khi gọi /api/predict/* ──────────────────────────
    if not request.path.startswith("/api/predict"):
        return None

    username = session.get("username")
    ua       = request.headers.get("User-Agent","N/A")
    path     = request.path

    # Không có CSRF token → gọi từ ngoài → log + cảnh báo
    csrf = request.headers.get("X-CSRF-Token","").strip()
    if not csrf:
        reason = "Gọi API không có CSRF token"
        save_log(ip, username, path, ua, reason)
        send_alert(ip, username, path, ua)
        print(f"[CRACK] {ip} | {username} | {reason}")
        return jsonify({
            "ok": False,
            "error": "có trình đéo mà lấy 🖕 Mua key: t.me/sewdangcap",
            "code": 403
        }), 403

    return None

def register_intrusion_detector(app):
    @app.before_request
    def intrusion_check():
        return detect_and_block()
    print("[SECURITY] Intrusion Detector (no auto-ban) ✅")
