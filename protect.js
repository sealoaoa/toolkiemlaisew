;(function(){
'use strict';

// ── Lưu native methods trước khi bị override ──────────────────────────────
var _nat={};
['log','warn','error','info','debug','clear'].forEach(function(m){
  try{_nat[m]=console[m].bind(console);}catch(e){}
});
var _dead=false;
var _warned=false;
var _origFetch=window.fetch?window.fetch.bind(window):null;
var _origST=window.setTimeout;
var _origSI=window.setInterval;

// ══════════════════════════════════════════════════════════════
// 1. CHUOT PHAI + PHIM TAT
// ══════════════════════════════════════════════════════════════
document.addEventListener('contextmenu',function(e){
  e.preventDefault();e.stopImmediatePropagation();return false;
},true);

function _killKey(e){
  var c=e.ctrlKey||e.metaKey,s=e.shiftKey,k=e.key||'';
  if(k==='F12'||(c&&!s&&'uUsSpP'.indexOf(k)>-1)||(c&&s&&'iIjJcCkK'.indexOf(k)>-1)){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    return false;
  }
}
window.addEventListener('keydown',_killKey,true);
document.addEventListener('keydown',_killKey,true);

// ══════════════════════════════════════════════════════════════
// 2. KHOA CONSOLE + CHAN CHAY CODE
// ══════════════════════════════════════════════════════════════
(function lockConsole(){
  // Hien canh bao 1 lan bang native
  try{
    _nat.warn('%c CO TRINH DEO MA LAY','color:#ff0000;font-size:28px;font-weight:900;background:#000;padding:8px 16px;border-radius:4px');
    _nat.warn('%c Mua key tai: t.me/sewdangcap','color:#ff8800;font-size:16px;font-weight:bold');
    _nat.warn('%c MOI CODE PASTE VAO DAY DEU BI CHAN & GHI LAI','color:#ff4444;font-size:13px');
    _nat.warn('%c TOOLKIEMLAISEW.SITE - Anti-Crack Active','color:#00e6b4;font-size:12px');
  }catch(e){}

  var _noop=function(){return undefined;};

  // Khoa tat ca console methods
  var ms=['log','warn','error','info','debug','table','dir','dirxml',
          'group','groupCollapsed','groupEnd','time','timeEnd','timeLog',
          'trace','clear','count','countReset','assert','profile','profileEnd'];
  ms.forEach(function(m){
    try{
      Object.defineProperty(console,m,{
        get:function(){return _noop;},
        set:function(){},
        configurable:false,enumerable:false
      });
    }catch(e){try{console[m]=_noop;}catch(x){}}
  });

  // Chan eval
  try{
    Object.defineProperty(window,'eval',{
      get:function(){return function(){throw new Error('blocked');};},
      set:function(){},configurable:false
    });
  }catch(e){}

  // Chan Function() constructor
  try{
    var _OF=Function;
    Object.defineProperty(window,'Function',{
      get:function(){
        return function(){throw new Error('blocked');};
      },
      set:function(){},configurable:false
    });
  }catch(e){}

  // Chan setTimeout/setInterval voi string
  try{
    window.setTimeout=function(fn,d){
      if(typeof fn==='string') return 0;
      return _origST.apply(window,[fn,d].concat(Array.prototype.slice.call(arguments,2)));
    };
    window.setInterval=function(fn,d){
      if(typeof fn==='string') return 0;
      return _origSI.apply(window,[fn,d].concat(Array.prototype.slice.call(arguments,2)));
    };
  }catch(e){}

})();

// ══════════════════════════════════════════════════════════════
// 3. PHAT HIEN DEVTOOLS → DUNG TOOL NGAY
// ══════════════════════════════════════════════════════════════
function _nuke(){
  if(_dead)return; _dead=true;

  // Xoa tat ca interval/timeout → dung poll API
  try{
    var hid=_origST(function(){},0);
    for(var i=0;i<=hid;i++){try{clearInterval(i);clearTimeout(i);}catch(e){}}
  }catch(e){}

  // Override fetch → khong goi duoc API
  try{
    var _blk=function(){return Promise.reject(new Error('blocked'));};
    Object.defineProperty(window,'fetch',{value:_blk,writable:false,configurable:false});
    window.apiFetch=_blk;
  }catch(e){try{window.fetch=function(){return Promise.reject(new Error('x'));}}catch(x){}}

  // Override XMLHttpRequest
  try{
    window.XMLHttpRequest=function(){
      this.open=this.send=this.setRequestHeader=function(){};
      this.readyState=4;this.status=403;
    };
  }catch(e){}

  // Hien thong bao
  try{document.documentElement.innerHTML='';}catch(e){}
  document.open();
  document.write('<style>*{margin:0;padding:0;background:#0a1628;box-sizing:border-box}</style>'+
    '<div style="display:flex;height:100vh;align-items:center;justify-content:center;'+
    'flex-direction:column;gap:16px;font-family:Arial,sans-serif;color:#ff4444;text-align:center;padding:20px">'+
    '<div style="font-size:64px">🛑</div>'+
    '<div style="font-size:22px;font-weight:bold">Tool da bi dung</div>'+
    '<div style="font-size:14px;color:#aaa;max-width:320px">'+
    'Phat hien DevTools dang mo.<br>Dong DevTools va tai lai trang.</div>'+
    '<button onclick="location.reload()" '+
    'style="margin-top:12px;padding:12px 32px;background:#00e6b4;border:none;'+
    'border-radius:10px;color:#0a1628;font-size:15px;font-weight:bold;cursor:pointer">'+
    'Tai lai trang</button></div>');
  document.close();
}

// A: debugger timing
function _chkDbg(){
  var t=performance.now();
  (function(){debugger;})();
  if(performance.now()-t>80) _nuke();
}

// B: console object getter trick
var _spy={_v:false};
Object.defineProperty(_spy,'_v',{get:function(){_nuke();return false;}});
function _chkConsole(){
  try{_nat.log&&_nat.log(_spy);_nat.clear&&_nat.clear();}catch(e){}
}

// C: size diff
function _chkSize(){
  if(window.outerWidth-window.innerWidth>200||
     window.outerHeight-window.innerHeight>200) _nuke();
}

_origSI(_chkDbg,    1000);
_origSI(_chkConsole,1500);
_origSI(_chkSize,    800);

// ══════════════════════════════════════════════════════════════
// 4. CSRF TOKEN TU DONG (FETCH HOOK)
// ══════════════════════════════════════════════════════════════
var _csrfCache=null,_csrfExp=0,_TTL=240000;

async function _getToken(){
  var now=Date.now();
  if(_csrfCache&&now<_csrfExp) return _csrfCache;
  try{
    var r=await _origFetch('/api/csrf-token',{credentials:'same-origin'});
    var j=await r.json();
    if(j.ok){_csrfCache=j.token;_csrfExp=now+_TTL;return _csrfCache;}
  }catch(e){}
  return null;
}

var _safeFetch=async function(url,opts){
  opts=Object.assign({},opts||{},{credentials:'same-origin'});
  if(typeof url==='string'&&url.startsWith('/api/')&&url.indexOf('csrf-token')<0){
    var tk=await _getToken();
    if(tk){var h=new Headers(opts.headers||{});h.set('X-CSRF-Token',tk);opts.headers=h;}
  }
  return _origFetch(url,opts);
};

try{
  Object.defineProperty(window,'fetch',{value:_safeFetch,writable:false,configurable:false});
}catch(e){window.fetch=_safeFetch;}
window.apiFetch=_safeFetch;

// ══════════════════════════════════════════════════════════════
// 5. CHAN PASTE CODE
// ══════════════════════════════════════════════════════════════
document.addEventListener('paste',function(e){
  var tag=((e.target||{}).tagName||'').toUpperCase();
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
    var txt=(e.clipboardData||window.clipboardData).getData('text')||'';
    var bad=[/fetch\s*\(/i,/XMLHttp/i,/eval\s*\(/i,/\.cookie/i,
             /localStorage/i,/Function\s*\(/i,/atob\s*\(/i,/import\s*\(/i,/<script/i];
    if(bad.some(function(r){return r.test(txt);})){
      alert('Co trinh deo ma lay!\nHanh dong da bi ghi lai.');
    }
  }catch(x){}
  return false;
},true);

// ══════════════════════════════════════════════════════════════
// 6. CHAN CHON VAN BAN + IN TRANG
// ══════════════════════════════════════════════════════════════
document.addEventListener('selectstart',function(e){
  var tag=((e.target||{}).tagName||'').toUpperCase();
  if(tag!=='INPUT'&&tag!=='TEXTAREA') e.preventDefault();
},true);

window.addEventListener('beforeprint',function(){document.body.style.display='none';});
window.addEventListener('afterprint', function(){document.body.style.display='';});

// ══════════════════════════════════════════════════════════════
// 7. DONG BANG document.cookie
// ══════════════════════════════════════════════════════════════
try{
  Object.defineProperty(document,'cookie',{
    get:function(){return '';},
    set:function(){},
    configurable:false
  });
}catch(e){}

})();
