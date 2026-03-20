// protect.js - TOOLKIEMLAISEW.SITE
// Obfuscated security layer
;(function(_0x,_1x){
// ── Biến nội bộ ─────────────────────────────────────────────
var _dead=false,_csrfCache=null,_csrfExp=0,_warned=false;
var _nat={};['log','warn','error','info','debug','table','dir','group',
'groupEnd','time','timeEnd','trace','clear','count'].forEach(function(m){
  try{_nat[m]=console[m].bind(console);}catch(e){}
});

// ══════════════════════════════════════════════════════════════
// 1. CHẶN PHÍM - capture phase + stopImmediatePropagation
// ══════════════════════════════════════════════════════════════
function _killKey(e){
  var c=e.ctrlKey||e.metaKey,s=e.shiftKey,k=e.key||'';
  var blocked=(
    k==='F12'||
    (c&&!s&&'uUsSpP'.indexOf(k)>-1)||
    (c&&s&&'iIjJcCkK'.indexOf(k)>-1)||
    k==='F11'
  );
  if(blocked){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    return false;
  }
}
window.addEventListener('keydown',_killKey,true);
document.addEventListener('keydown',_killKey,true);

// ══════════════════════════════════════════════════════════════
// 2. CHUỘT PHẢI
// ══════════════════════════════════════════════════════════════
document.addEventListener('contextmenu',function(e){
  e.preventDefault();e.stopImmediatePropagation();return false;
},true);

// ══════════════════════════════════════════════════════════════
// 3. KHÓA CONSOLE - Object.defineProperty không ghi đè được
// ══════════════════════════════════════════════════════════════
(function(){
  var _noop=function(){
    if(!_warned){
      _warned=true;
      try{
        _nat.warn('%c⛔ CẢNH BÁO','color:#f00;font-size:26px;font-weight:900;background:#000;padding:6px 12px');
        _nat.warn('%cNếu ai bảo bạn paste code vào đây → họ đang CỐ CHIẾM TÀI KHOẢN!\nMọi hành động đều bị ghi lại & báo cáo admin.','color:#f80;font-size:14px;font-weight:bold');
        _nat.warn('%c🔒 TOOLKIEMLAISEW.SITE - Security Active','color:#0eb;font-size:12px');
      }catch(e){}
    }
  };
  var _methods=['log','warn','error','info','debug','table','dir',
                'group','groupEnd','time','timeEnd','trace','clear','count','assert'];
  _methods.forEach(function(m){
    try{
      Object.defineProperty(console,m,{
        get:function(){return _noop;},
        set:function(){},
        configurable:false,enumerable:false
      });
    }catch(e){try{console[m]=_noop;}catch(ex){}}
  });
})();

// ══════════════════════════════════════════════════════════════
// 4. PHÁT HIỆN DEVTOOLS - 4 phương pháp
// ══════════════════════════════════════════════════════════════
function _nuke(){
  if(_dead)return; _dead=true;
  try{document.documentElement.innerHTML='';}catch(e){}
  document.open();
  document.write(
    '<style>*{margin:0;padding:0;background:#0a1628}</style>'+
    '<div style="display:flex;height:100vh;align-items:center;justify-content:center;'+
    'flex-direction:column;gap:18px;font-family:sans-serif;color:#ff4444;">'+
    '<div style="font-size:72px">🚫</div>'+
    '<div style="font-size:24px;font-weight:bold">Phiên đã bị hủy</div>'+
    '<div style="font-size:14px;color:#666;text-align:center;max-width:340px">'+
    'Phát hiện công cụ không hợp lệ.<br>Vui lòng đăng nhập lại.</div>'+
    '<button onclick="location.href=\'/logout\'" '+
    'style="padding:12px 28px;background:#00e6b4;border:none;border-radius:10px;'+
    'color:#0a1628;font-size:15px;font-weight:bold;cursor:pointer">Đăng nhập lại</button></div>'
  );
  document.close();
  setTimeout(function(){try{location.href='/logout';}catch(e){}},1200);
}

// A: debugger timing
function _chkDbg(){
  var t=performance.now();
  (function(){debugger;})();
  if(performance.now()-t>80) _nuke();
}

// B: console object getter
var _spy={_v:false};
Object.defineProperty(_spy,'_v',{get:function(){_nuke();return false;}});

function _chkConsole(){
  _nat.log&&_nat.log(_spy);
  try{_nat.clear&&_nat.clear();}catch(e){}
}

// C: size diff (docked devtools)
function _chkSize(){
  if(window.outerWidth-window.innerWidth>200||
     window.outerHeight-window.innerHeight>200) _nuke();
}

// D: toString trick
var _re=/./;_re.toString=function(){_nuke();return '';};

setInterval(_chkDbg,    1000);
setInterval(_chkConsole,1500);
setInterval(_chkSize,    800);

// ══════════════════════════════════════════════════════════════
// 5. CSRF TOKEN - Cache 4 phút, tự renew, gắn vào mọi fetch
// ══════════════════════════════════════════════════════════════
var _TTL=240000; // 4 phút (< 5 phút server TTL)

async function _getToken(){
  var now=Date.now();
  if(_csrfCache&&now<_csrfExp) return _csrfCache;
  try{
    // Gọi thẳng fetch gốc (trước khi bị override)
    var r=await _origFetch('/api/csrf-token',{credentials:'same-origin'});
    var j=await r.json();
    if(j.ok){
      _csrfCache=j.token;
      _csrfExp=now+_TTL;
      return _csrfCache;
    }
  }catch(e){}
  return null;
}

// Lưu fetch gốc TRƯỚC khi override
var _origFetch=window.fetch.bind(window);

// Override fetch - tự gắn token, đóng băng
var _safeFetch=async function(url,opts){
  opts=Object.assign({},opts||{},{credentials:'same-origin'});
  // Chỉ gắn token cho API nội bộ
  if(typeof url==='string'&&url.startsWith('/api/')&&!url.includes('csrf-token')){
    var tk=await _getToken();
    if(tk){
      var h=new Headers(opts.headers||{});
      h.set('X-CSRF-Token',tk);
      opts.headers=h;
    }
  }
  return _origFetch(url,opts);
};

// Đóng băng window.fetch
try{
  Object.defineProperty(window,'fetch',{
    value:_safeFetch,writable:false,configurable:false
  });
}catch(e){window.fetch=_safeFetch;}

// Expose apiFetch cho các game files
window.apiFetch=_safeFetch;

// ══════════════════════════════════════════════════════════════
// 6. CHẶN PASTE CODE ĐỘC HẠI
// ══════════════════════════════════════════════════════════════
document.addEventListener('paste',function(e){
  var tag=((e.target||{}).tagName||'').toUpperCase();
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
    var txt=(e.clipboardData||window.clipboardData).getData('text')||'';
    var bad=[/fetch\s*\(/i,/XMLHttp/i,/eval\s*\(/i,/\.cookie/i,
             /localStorage/i,/Function\s*\(/i,/atob\s*\(/i,
             /import\s*\(/i,/require\s*\(/i,/<script/i];
    if(bad.some(function(r){return r.test(txt);})){
      alert('⛔ Phát hiện code độc hại!\nHành động đã được ghi lại và báo cáo admin.');
    }
  }catch(ex){}
  return false;
},true);

// ══════════════════════════════════════════════════════════════
// 7. CHẶN CHỌN VĂN BẢN + IN TRANG
// ══════════════════════════════════════════════════════════════
document.addEventListener('selectstart',function(e){
  var tag=((e.target||{}).tagName||'').toUpperCase();
  if(tag!=='INPUT'&&tag!=='TEXTAREA') e.preventDefault();
},true);

window.addEventListener('beforeprint',function(){document.body.style.display='none';});
window.addEventListener('afterprint', function(){document.body.style.display='';});

// ══════════════════════════════════════════════════════════════
// 8. ĐÓNG BĂNG CÁC API QUAN TRỌNG
// ══════════════════════════════════════════════════════════════
try{
  Object.defineProperty(EventTarget.prototype,'addEventListener',{
    value:EventTarget.prototype.addEventListener,
    writable:false,configurable:false
  });
}catch(e){}

// Không cho đọc cookie từ JS
try{
  Object.defineProperty(document,'cookie',{
    get:function(){return '';},
    set:function(){},
    configurable:false
  });
}catch(e){}

// ══════════════════════════════════════════════════════════════
// 9. ANTI-TAMPER: tự kiểm tra code chưa bị sửa
// ══════════════════════════════════════════════════════════════
var _startTime=Date.now();
setInterval(function(){
  // Nếu script bị pause quá 10 giây → đang bị debug
  if(Date.now()-_startTime>10000+15000){
    _nuke();
  }
  _startTime=Date.now();
},15000);


// ══════════════════════════════════════════════════════════════
// 10. GIẢI MÃ RESPONSE API (XOR + base64)
// ══════════════════════════════════════════════════════════════
(function(){
  // Tạo key giống server: SHA256(SECRET:username:slot)
  // Dùng Web Crypto API - không thể đọc key từ DevTools
  var _SECRET = 'minhsang_shop_secret_2024_xK9p';

  async function _makeKey(username){
    var slot  = Math.floor(Date.now()/1000/300).toString();
    var raw   = _SECRET+':'+username+':'+slot;
    var enc   = new TextEncoder().encode(raw);
    var hash  = await crypto.subtle.digest('SHA-256', enc);
    return new Uint8Array(hash);
  }

  function _b64Dec(str){
    var bin = atob(str), out = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
  }

  function _xorDec(data, key){
    var out = new Uint8Array(data.length);
    for(var i=0;i<data.length;i++) out[i]=data[i]^key[i%key.length];
    return new TextDecoder().decode(out);
  }

  // Giải mã response {"e":"..."} từ server
  async function decryptApiResponse(encObj, username){
    try{
      if(!encObj||!encObj.e) return encObj; // không được mã hóa
      // Lớp ngoài
      var outer  = JSON.parse(atob(encObj.e));
      if(!outer.d) return encObj;
      // Kiểm tra freshness (< 30 giây)
      if(Date.now()/1000 - outer.t > 30){
        console.warn('Response expired');
        return {ok:false, error:'Response hết hạn'};
      }
      // Giải mã XOR
      var key    = await _makeKey(username);
      var cipher = _b64Dec(outer.d);
      var plain  = _xorDec(cipher, key);
      return JSON.parse(plain);
    }catch(e){
      return {ok:false, error:'Decrypt failed'};
    }
  }

  // Lấy username từ session (inject từ server vào HTML)
  function _getUsername(){
    return window._U || document.body.getAttribute('data-u') || 'anon';
  }

  // Override apiFetch để tự động giải mã
  var _prevApiFetch = window.apiFetch || window.fetch;
  window.apiFetch = async function(url, opts){
    var resp = await _prevApiFetch(url, opts);
    if(!resp.ok) return resp;
    // Clone response để có thể đọc lại
    var clone = resp.clone();
    try{
      var json = await clone.json();
      if(json && json.e){
        // Có mã hóa → giải mã
        var decrypted = await decryptApiResponse(json, _getUsername());
        // Trả về Response giả với data đã giải mã
        return new Response(JSON.stringify(decrypted),{
          status: 200,
          headers: {'Content-Type':'application/json'}
        });
      }
    }catch(e){}
    return resp;
  };

  // Expose để game files dùng
  window._decrypt = decryptApiResponse;
})();

})();
