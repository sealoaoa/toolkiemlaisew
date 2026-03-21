# -*- coding: utf-8 -*-
# ================== intrusion_detector.py ==================
# Phát hiện tấn công - ĐÃ SỬA lỗi chặn nhầm user bình thường

import os, json, time, re
from collections import defaultdict
from flask import request

# ================== CẤU HÌNH ==================
RATE_LIMIT   = 120       # request / phút (tăng từ 30 → 120, game poll 1s/lần cần ~60/phút)
TIME_WINDOW  = 60        # giây
BAN_DURATION = 1800      # 30 phút (giảm từ 1 tiếng, tránh chặn nhầm quá lâu)
LOG_FILE     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "intrusion_log.json")

# Chỉ chặn tool tấn công thực sự - BỎ postman/insomnia/okhttp (tool dev bình thường)
BOT_UA_PATTERNS = [
    r"python-requests",
    r"curl/",
    r"wget/",
    r"scrapy",
    r"nikto",
    r"sqlmap",
    r"nmap",
    r"masscan",
    r"zgrab",
    r"dirbuster",
    r"gobuster",
    r"wfuzz",
    r"hydra",
]

# Route KHÔNG kiểm tra rate limit (game poll liên tục)
SKIP_RATE_LIMIT_PATHS = [
    "/api/predict/",
    "/api/csrf-token",
    "/ping",
    "/api/sepay-webhook",
    "/api/balance",
]

# ================== BỘ NHỚ ==================
_request_log  = defaultdict(list)
_banned_ips   = {}
_attack_count = defaultdict(int)

# ================== HÀM TIỆN ÍCH ==================
def get_real_ip():
    for header in ["CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"]:
        val = request.headers.get(header, "")
        if val:
            return val.split(",")[0].strip()
    return request.remote_addr or "unknown"

def get_device_info():
    ua = request.headers.get("User-Agent", "N/A")
    return {
        "ip":          get_real_ip(),
        "user_agent":  ua,
        "accept_lang": request.headers.get("Accept-Language", "N/A"),
        "referer":     request.headers.get("Referer", "N/A"),
        "origin":      request.headers.get("Origin", "N/A"),
        "method":      request.method,
        "path":        request.path,
        "query":       request.query_string.decode("utf-8", errors="replace"),
        "host":        request.headers.get("Host", "N/A"),
        "time":        time.strftime("%d/%m/%Y %H:%M:%S"),
        "timestamp":   time.time(),
    }

def is_bot_ua(ua: str) -> bool:
    ua_lower = ua.lower()
    for pattern in BOT_UA_PATTERNS:
        if re.search(pattern, ua_lower, re.IGNORECASE):
            return True
    return False

def should_skip_rate_limit() -> bool:
    """Bỏ qua rate limit cho các route game poll liên tục"""
    path = request.path
    for skip in SKIP_RATE_LIMIT_PATHS:
        if path.startswith(skip):
            return True
    return False

def check_rate_limit(ip: str) -> bool:
    """True = vượt rate limit"""
    if should_skip_rate_limit():
        return False
    now = time.time()
    _request_log[ip] = [t for t in _request_log[ip] if now - t < TIME_WINDOW]
    _request_log[ip].append(now)
    return len(_request_log[ip]) > RATE_LIMIT

def is_banned(ip: str) -> bool:
    if ip in _banned_ips:
        if time.time() < _banned_ips[ip]:
            return True
        del _banned_ips[ip]
    return False

def ban_ip(ip: str):
    _banned_ips[ip] = time.time() + BAN_DURATION
    _attack_count[ip] += 1

# ================== LOG & CẢNH BÁO ==================
def save_intrusion_log(info: dict, reason: str):
    try:
        logs = []
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
    except Exception:
        logs = []
    logs.insert(0, {**info, "reason": reason, "attack_count": _attack_count[info["ip"]]})
    logs = logs[:500]
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[LOG ERROR] {e}")

_last_alert = {}  # throttle cảnh báo

def send_telegram_alert(info: dict, reason: str):
    # Throttle: cùng IP chỉ báo 1 lần / 5 phút
    ip = info["ip"]
    now = time.time()
    if now - _last_alert.get(ip, 0) < 300:
        return
    _last_alert[ip] = now
    try:
        from config import BOT_TOKEN, ADMIN_ID
        import requests as req
        msg = (
            f"🚨 TẤN CÔNG PHÁT HIỆN\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"⚠️ Lý do: {reason}\n"
            f"📡 IP: {ip}\n"
            f"🔗 Route: {info['method']} {info['path']}\n"
            f"💻 UA: {info['user_agent'][:80]}\n"
            f"🕐 {info['time']}\n"
            f"🔢 Lần #{_attack_count[ip]}"
        )
        req.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": ADMIN_ID, "text": msg},
            timeout=4
        )
    except Exception:
        pass

# ================== PHÁT HIỆN CHÍNH ==================
def detect_and_block():
    from flask import jsonify, session

    # Bỏ qua hoàn toàn - không kiểm tra các route này
    skip = ["/ping", "/api/sepay-webhook", "/static/",
            "/login", "/register", "/logout",
            "/api/csrf-token", "/api/balance",
            "/api/confirm-deposit", "/api/cancel-deposit"]
    for s in skip:
        if request.path.startswith(s):
            return None

    ip = get_real_ip()

    # ── CHỈ KIỂM TRA KHI GỌI THẲNG API DỰ ĐOÁN ──────────────────────────
    # Nếu không phải route /api/predict → bỏ qua hoàn toàn
    if not request.path.startswith("/api/predict"):
        return None

    # Từ đây chỉ xử lý /api/predict/*
    info   = get_device_info()
    ua     = info["user_agent"]
    reason = None

    # 1. IP đang bị ban → chặn ngay
    if is_banned(ip):
        save_intrusion_log(info, "IP bị ban - gọi API trực tiếp")
        return jsonify({"ok": False, "error": "IP đã bị chặn.", "code": 403}), 403

    # 2. Gọi API mà KHÔNG có CSRF token → đang dùng curl/script bên ngoài → ban
    csrf_token = request.headers.get("X-CSRF-Token", "").strip()
    if not csrf_token:
        reason = f"Gọi API trực tiếp không có CSRF token - UA: {ua[:60]}"

    # 3. Gọi API mà KHÔNG đăng nhập → ban
    if not reason and "username" not in session:
        reason = "Gọi API không đăng nhập"

    if reason:
        ban_ip(ip)
        save_intrusion_log(info, reason)
        send_telegram_alert(info, reason)
        print(f"[BANNED] {ip} | {reason}")
        return jsonify({
            "ok": False,
            "error": "có trình đéo mà lấy 🖕\nMuốn dùng tool? Mua key: t.me/sewdangcap",
            "code": 403
        }), 403

    return None

# ================== ĐĂNG KÝ ==================
def register_intrusion_detector(app):
    @app.before_request
    def intrusion_check():
        return detect_and_block()
    print("[SECURITY] Intrusion Detector ✅")
