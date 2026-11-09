// AIMERS service worker
// নীতি: সাইটের নিজের ফাইল (HTML/CSS/JS/ছবি) আগে নেটওয়ার্ক থেকে আনে — তাই আপডেট দিলে ইউজার সাথে সাথে নতুনটা পায়।
// নেটওয়ার্ক না থাকলে সবশেষ সেভ করা কপি দেখায়।
// Google Sheet, YouTube, ফন্ট — এগুলো অন্য ডোমেইনের, তাই এখানে কখনো ক্যাশ হয় না (ডেটা সবসময় লাইভ থাকে)।
// ক্যাশ ভার্সন বদলাতে চাইলে CACHE নামের সংখ্যা বাড়াও।
var CACHE = 'aimers-v1';
var SHELL = [
  'index.html', 'subject.html', 'video.html', 'about.html', 'contact.html',
  'mental-health.html', '404.html', 'style.css', 'data.js', 'layout.js',
  'favicon.svg', 'favicon-192.png', 'icon-512.png', 'manifest.webmanifest'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // একটা ফাইল না পেলেও পুরো ইনস্টল যেন ফেইল না করে
      return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // Sheet/YouTube/ফন্ট — ছোঁয়া হয় না

  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(req, { ignoreSearch: true }).then(function(hit){
        if(hit) return hit;
        if(req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
