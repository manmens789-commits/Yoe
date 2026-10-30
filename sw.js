/* Tumbuh Kaya - service worker (mode offline)
   Letakkan di folder yang sama dengan index.html (hosting https).
   - Halaman & library (Firebase, font) disimpan di HP setelah sekali dibuka online.
   - Saat offline, halaman dibuka dari simpanan; data transaksi sendiri disimpan aplikasi di IndexedDB. */
var VER = 'tk-sw-v1';
var HOSTS_OK = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VER).then(function(c){
    return c.addAll(['./']).catch(function(){});
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VER; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  /* jangan campur tangan dengan lalu lintas data Firebase (Firestore/Auth) */
  if(/firestore\.googleapis\.com|identitytoolkit|securetoken|firebaseio|googleapis\.com\/(v1|v2)/.test(url.href)) return;

  var sameOrigin = url.origin === self.location.origin;
  if(!sameOrigin && HOSTS_OK.indexOf(url.hostname) === -1) return;

  if(req.mode === 'navigate'){
    /* halaman: coba jaringan dulu supaya versi terbaru ikut, kalau gagal pakai simpanan */
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone(); caches.open(VER).then(function(c){ c.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(m){ return m || caches.match('./') || caches.match(url.pathname); });
    }));
    return;
  }

  /* library & font: pakai simpanan dulu, perbarui di belakang layar */
  e.respondWith(caches.match(req).then(function(m){
    var net = fetch(req).then(function(res){
      if(res && (res.status === 200 || res.type === 'opaque')){
        var copy = res.clone(); caches.open(VER).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){ return m; });
    return m || net;
  }));
});
