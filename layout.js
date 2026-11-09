// ============================================================
// AIMERS — শেয়ার্ড লেআউট (হেডার, মোবাইল মেনু, অফলাইন ব্যানার, ফুটার, উপরে-যাও বাটন)
// আগে এগুলো ৭টা পেইজে কপি-পেস্ট করা ছিল। এখন একটাই জায়গা — এখানে বদলালে সব পেইজে বদলাবে।
//
// ব্যবহার: পেইজে দুই জায়গায় দুটো ট্যাগ বসে
//   script ট্যাগ (src="layout.js" data-part="header")   — <body> এর শুরুতে
//   script ট্যাগ (src="layout.js" data-part="footer")   — পেইজ কনটেন্টের শেষে, body বন্ধ হওয়ার আগে
// স্ক্রিপ্টটা সিঙ্ক্রোনাস, তাই হেডার/ফুটার ঠিক ওই জায়গাতেই বসে — লেআউট শিফট হয় না।
// ============================================================
(function(){
  var script = document.currentScript;
  if(!script) return;
  var part = script.getAttribute('data-part');

  // হোম পেইজে "ক্লাসসমূহ" লিংক শুধু #classes (রিলোড ছাড়াই স্ক্রল), অন্য পেইজে index.html#classes
  var isHome = /(^\/$|\/index(\.html)?$)/.test(location.pathname);
  var classesHref = isHome ? '#classes' : 'index.html#classes';

  function headerHtml(){
    return ''
    + '<header>'
    + '  <a href="index.html" class="logo tech"><span class="dot"></span>AIM<span>ERS</span></a>'
    + '  <nav>'
    + '    <a href="' + classesHref + '">ক্লাসসমূহ</a>'
    + '    <a href="mental-health.html">মানসিক স্বাস্থ্য</a>'
    + '    <a href="about.html">সম্পর্কে</a>'
    + '    <a href="contact.html">যোগাযোগ</a>'
    + '    <a class="cta-btn" href="' + classesHref + '">শুরু করো</a>'
    + '  </nav>'
    + '  <div class="header-actions">'
    + '    <button class="theme-toggle" id="themeToggle" aria-label="থিম বদলাও">🌙</button>'
    + '    <button class="menu-toggle" id="menuToggle" aria-label="মেনু">☰</button>'
    + '  </div>'
    + '</header>'
    + '<div class="mobile-nav" id="mobileNav">'
    + '  <a href="' + classesHref + '">ক্লাসসমূহ</a>'
    + '  <a href="mental-health.html">মানসিক স্বাস্থ্য</a>'
    + '  <a href="about.html">সম্পর্কে</a>'
    + '  <a href="contact.html">যোগাযোগ</a>'
    + '  <a class="mobile-cta" href="' + classesHref + '">শুরু করো</a>'
    + '</div>'
    + '<div class="offline-banner" id="offlineBanner" role="status">তুমি এখন অফলাইনে আছো — কিছু কনটেন্ট লোড নাও হতে পারে</div>';
  }

  function footerHtml(){
    // হোম পেইজে এই তালিকা index.html এর স্ক্রিপ্ট Sheet থেকে ভরে (#footerClassLinks)
    var classLinks = isHome
      ? '<ul id="footerClassLinks"></ul>'
      : '<ul><li><a href="index.html#classes">সব ক্লাস দেখো →</a></li></ul>';
    return ''
    + '<footer class="site-footer">'
    + '  <div class="f-brand">'
    + '    <a href="index.html" class="logo tech"><span class="dot"></span>AIM<span>ERS</span></a>'
    + '    <p>ক্লাস ৫ থেকে ১২ এর জন্য চ্যাপ্টার-ভিত্তিক ফ্রি ভিডিও ক্লাস — বাংলা, ইংলিশ, গণিত, বিজ্ঞান, আইসিটি।</p>'
    + '    <div class="f-social">'
    + '      <a href="https://www.youtube.com/@AIMERS-24h" target="_blank" rel="noopener" title="YouTube">▶</a>'
    + '      <a href="https://www.facebook.com/aimer24h" target="_blank" rel="noopener" title="Facebook">f</a>'
    + '      <a href="mailto:amraaimers@gmail.com" title="Email">✉</a>'
    + '    </div>'
    + '  </div>'
    + '  <div><h5 class="tech">ক্লাসসমূহ</h5>' + classLinks + '</div>'
    + '  <div>'
    + '    <h5 class="tech">পেইজ</h5>'
    + '    <ul>'
    + '      <li><a href="index.html">হোম</a></li>'
    + '      <li><a href="mental-health.html">মানসিক স্বাস্থ্য</a></li>'
    + '      <li><a href="about.html">সম্পর্কে</a></li>'
    + '      <li><a href="contact.html">যোগাযোগ</a></li>'
    + '    </ul>'
    + '  </div>'
    + '  <div>'
    + '    <h5 class="tech">যোগাযোগ</h5>'
    + '    <ul>'
    + '      <li><a href="mailto:amraaimers@gmail.com">amraaimers@gmail.com</a></li>'
    + '      <li><a href="https://www.youtube.com/@AIMERS-24h" target="_blank" rel="noopener">@AIMERS-24h</a></li>'
    + '      <li><a href="https://www.facebook.com/aimer24h" target="_blank" rel="noopener">facebook.com/aimer24h</a></li>'
    + '    </ul>'
    + '  </div>'
    + '</footer>'
    + '<div class="footer-bottom">'
    + '  <div>© ২০২৬ Aimers</div>'
    + '  <div class="tech">MADE IN BANGLADESH</div>'
    + '</div>'
    + '<button class="back-to-top" id="backToTop" aria-label="উপরে যাও">↑</button>';
  }

  // ---------- হেডার সংক্রান্ত আচরণ ----------
  function initMenu(){
    var t = document.getElementById('menuToggle');
    var m = document.getElementById('mobileNav');
    if(!t || !m) return;

    function closeMenu(){ m.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); }
    function openMenu(){ m.classList.add('open'); t.setAttribute('aria-expanded', 'true'); }

    t.setAttribute('aria-expanded', 'false');
    t.setAttribute('aria-controls', 'mobileNav');

    t.addEventListener('click', function(e){
      e.stopPropagation();
      m.classList.contains('open') ? closeMenu() : openMenu();
    });
    m.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeMenu); });
    document.addEventListener('click', function(e){
      if(m.classList.contains('open') && !m.contains(e.target) && e.target !== t) closeMenu();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && m.classList.contains('open')) closeMenu();
    });
  }

  function initTheme(){
    var themeToggle = document.getElementById('themeToggle');
    if(!themeToggle) return;
    function isDark(){ return document.documentElement.getAttribute('data-theme') === 'dark'; }
    function updateIcon(){ themeToggle.textContent = isDark() ? '☀️' : '🌙'; }
    updateIcon();
    themeToggle.addEventListener('click', function(){
      var next = isDark() ? 'light' : 'dark';
      if(next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      try{ localStorage.setItem('aimers_theme', next); }catch(e){}
      updateIcon();
    });
  }

  function initOffline(){
    var banner = document.getElementById('offlineBanner');
    if(!banner) return;
    function update(){ banner.style.display = navigator.onLine ? 'none' : 'flex'; }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // ---------- ফুটার সংক্রান্ত আচরণ ----------
  function initBackToTop(){
    var btn = document.getElementById('backToTop');
    if(!btn) return;
    window.addEventListener('scroll', function(){
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', function(){
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  // PWA: সার্ভিস ওয়ার্কার রেজিস্টার (শুধু https বা localhost-এ চলে; ব্যর্থ হলে সাইটে কোনো প্রভাব নেই)
  function registerSW(){
    if(!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    });
  }

  if(part === 'header'){
    registerSW();
    script.insertAdjacentHTML('beforebegin', headerHtml());
    initMenu(); initTheme(); initOffline();
  } else if(part === 'footer'){
    script.insertAdjacentHTML('beforebegin', footerHtml());
    initBackToTop();
  }
})();
