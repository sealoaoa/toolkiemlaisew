# Hướng dẫn fix lỗi "không khớp đơn" khi quét QR

## Nguyên nhân gốc

`pending_deposits` chỉ lưu trong RAM (dict Python).
Khi Render free tier restart server → mất hết → quét QR báo lỗi.

---

## Fix 1: Sửa `config.py` — thêm 2 hàm lưu/đọc pending_deposits vào DB

Thêm 2 hàm này vào cuối file `config.py`, ngay trước dòng `pending_deposits = {}`:

```python
# ================== PERSISTENT PENDING DEPOSITS ==================
def save_pending_deposits(deposits: dict):
    """Lưu pending_deposits vào database để tránh mất khi server restart"""
    db = load_db()
    db["pending_deposits"] = deposits
    save_db(db)

def load_pending_deposits() -> dict:
    """Đọc pending_deposits từ database khi server khởi động"""
    db = load_db()
    return db.get("pending_deposits", {})
```

Và **đổi dòng cuối** từ:
```python
pending_deposits = {}
```
thành:
```python
pending_deposits = load_pending_deposits()
```

---

## Fix 2: Sửa `telegram_bot.py` — sync vào DB mỗi khi thay đổi pending_deposits

### Import thêm ở đầu file (dòng 7):
```python
from config import BOT_TOKEN, ADMIN_ID, SHOP_NAME, load_db, save_db, create_key, \
    get_vip_level, VIP_LEVELS, pending_deposits, save_pending_deposits
```

### Tại hàm `cmd_nap` (sau dòng `pending_deposits[deposit_id] = {...}`):
Thêm 1 dòng sync:
```python
pending_deposits[deposit_id] = {
    "user_id": user_id,
    ...
}
save_pending_deposits(pending_deposits)  # ← THÊM DÒNG NÀY
```

### Tại hàm `callback_confirm_transfer` (sau dòng rename short_id):
```python
pending_deposits[short_id] = deposit
del pending_deposits[deposit_id]
save_pending_deposits(pending_deposits)  # ← THÊM DÒNG NÀY
```

### Tại hàm `callback_approve_deposit` (sau dòng `del pending_deposits[short_id]`):
```python
del pending_deposits[short_id]
save_pending_deposits(pending_deposits)  # ← THÊM DÒNG NÀY
```

### Tại hàm `log_all_messages` (sau dòng xóa khi user nhắn "TÔI ĐÃ CHUYỂN KHOẢN"):
```python
del pending_deposits[deposit_key_to_remove]
save_pending_deposits(pending_deposits)  # ← THÊM DÒNG NÀY
```

### Tại hàm `cmd_duyet` (sau dòng `del pending_deposits[deposit_key]`):
```python
del pending_deposits[deposit_key]
save_pending_deposits(pending_deposits)  # ← THÊM DÒNG NÀY
```

---

## Fix 3 (bonus): Thêm timeout tự động xóa đơn quá hạn

Trong hàm `load_pending_deposits`, lọc bỏ đơn quá 24 giờ:

```python
def load_pending_deposits() -> dict:
    db = load_db()
    all_deps = db.get("pending_deposits", {})
    # Xóa đơn quá 24 giờ để tránh rác
    now = time.time()
    valid = {k: v for k, v in all_deps.items() if now - v.get("time", 0) < 86400}
    return valid
```

---

## Tóm tắt thay đổi

| Vị trí | Thay đổi |
|--------|----------|
| `config.py` | Thêm `save_pending_deposits()` + `load_pending_deposits()`, khởi tạo từ DB |
| `telegram_bot.py` | Thêm `save_pending_deposits(pending_deposits)` sau mỗi lần thay đổi dict |

Sau khi sửa, đơn sẽ tồn tại qua mỗi lần server restart — quét QR vẫn khớp bình thường.
