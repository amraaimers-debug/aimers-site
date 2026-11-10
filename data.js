// ============================================================
// AIMERS — কেন্দ্রীয় ডেটা ফাইল
// এখন থেকে সব ক্লাস/চ্যাপ্টার/ভিডিও ডেটা আসে Google Sheet থেকে।
// নতুন কিছু যোগ করতে হলে কোড টাচ করা লাগবে না —
// শুধু Sheet-এ নতুন সারি যোগ করলেই হবে।
//
// Sheet-এর ট্যাব দুইটা হতে হবে ঠিক এই নামে: "Classes" এবং "Chapters"
// Classes ট্যাবের কলাম: id, num, roll, ready, subjects
// Chapters ট্যাবের কলাম: classId, subject, chapter, topic, youtube
//   chapter = অধ্যায়ের নাম (যেমন: ১ম অধ্যায়)
//   topic   = টপিকের নাম (যেমন: গুণ)
// ============================================================

const SHEET_ID = '1mZAuNS3Qfz6OmihoDQaTSiYT6iNuroqK12seZ6zVqpw';

function sheetUrl(tabName){
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

// Sheet থেকে আসা যেকোনো টেক্সট HTML-এ বসানোর আগে এটা দিয়ে পাস করাতে হবে —
// এতে কেউ Sheet-এ <script> বা HTML ট্যাগ ঢুকিয়ে দিলেও সেটা কোড হিসেবে চলবে না, শুধু প্লেইন টেক্সট হিসেবে দেখাবে
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// সাবজেক্টের ভিজ্যুয়াল তথ্য (নাম, আইকন-অক্ষর, রঙ) — এটা ডিজাইনের অংশ, তাই কোডেই থাকে
const SUBJECTS = {
  bangla:      { name: 'বাংলা',        icon: 'অ', accent: '#2F7FE0' },
  english:     { name: 'ইংলিশ',        icon: 'A', accent: '#E8622C' },
  math:        { name: 'গণিত',         icon: '∑', accent: '#7C6FE0' },
  science:     { name: 'বিজ্ঞান',      icon: '⚛', accent: '#20A464' },
  ict:         { name: 'আইসিটি',       icon: '{ }', accent: '#2F7FE0' },
  higher_math: { name: 'উচ্চতর গণিত',  icon: '∞', accent: '#E8622C' },
  bwp:         { name: 'বাংলাদেশ ও বিশ্ব পরিচয়', icon: 'ব', accent: '#20A464' },
};
// Sheet-এ নতুন subject key ব্যবহার করলে (উপরে তালিকায় নেই এমন) এই ডিফল্ট ব্যবহার হবে
function getSubject(key){
  return SUBJECTS[key] || { name: key, icon: '?', accent: '#2F7FE0' };
}

let CLASSES = [];
let CHAPTERS = {};
let ALL_CHAPTERS = []; // Sheet-এ যে ক্রমে সারি আছে, সেই ক্রমে — শেষেরগুলোই সাম্প্রতিক যোগ করা ধরা হয়
let DATA_LOADED = false;

// ছোট CSV পার্সার — কমা/কোটেশন/লাইনব্রেক সামলাতে পারে
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ','){ row.push(field); field = ''; }
      else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
      else if(c === '\r'){ /* skip */ }
      else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  if(!rows.length) return [];
  const headers = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.some(v => v.trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (r[idx] || '').trim());
      return obj;
    });
}

// পুরো ইউটিউব লিংক (যেকোনো ফরম্যাট) থেকে শুধু ভিডিও আইডি বের করে আনে
function extractYoutubeId(input){
  if(!input) return '';
  const s = input.trim();
  if(!s.includes('http') && /^[a-zA-Z0-9_-]{6,15}$/.test(s)) return s; // আগে থেকেই বেয়ার আইডি হলে
  try{
    const url = new URL(s);
    if(url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    if(url.searchParams.get('v')) return url.searchParams.get('v');
    const m = url.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]+)/);
    if(m) return m[2];
  }catch(e){ /* URL না হলে যা আছে তাই ফেরত */ }
  return s;
}

// Sheet-এর একটা ট্যাব CSV হিসেবে আনে।
// সফল হলে সবশেষ কপি ব্রাউজারে সেভ রাখে; নেট না থাকলে/ব্যর্থ হলে ওই সেভ করা কপি দিয়ে চালায়,
// ফলে ইউজার আগে একবার সাইট খুলে থাকলে অফলাইনেও ক্লাসের তালিকা দেখতে পায়।
const SHEET_CACHE_PREFIX = 'aimers_sheet_';
let DATA_FROM_CACHE = false;

async function fetchSheetCsv(tabName, errorMessage){
  try{
    const res = await fetch(sheetUrl(tabName));
    if(!res.ok){
      const e = new Error(errorMessage);
      e.isNetwork = false;
      throw e;
    }
    const text = await res.text();
    try{ localStorage.setItem(SHEET_CACHE_PREFIX + tabName, text); }catch(e){ /* জায়গা না থাকলে স্কিপ */ }
    return text;
  }catch(err){
    if(err.isNetwork === undefined) err.isNetwork = true; // fetch নিজেই ব্যর্থ = নেটওয়ার্ক সমস্যা
    let cached = null;
    try{ cached = localStorage.getItem(SHEET_CACHE_PREFIX + tabName); }catch(e){}
    if(cached){ DATA_FROM_CACHE = true; return cached; }
    throw err;
  }
}

// ডেটা লোড ব্যর্থ হলে ইউজারকে যা দেখানো হবে — সব পেইজ এটাই ব্যবহার করে।
// Sheet/টেকনিক্যাল তথ্য ইউজারকে না দেখিয়ে ডেভেলপারের জন্য কনসোলে লেখা হয়।
function renderLoadError(el, err){
  console.error('[Aimers] ডেটা লোড ব্যর্থ:', err);
  const offline = !navigator.onLine || (err && err.isNetwork);
  const icon = offline
    ? '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-9.4-3.7M5 12.9a10 10 0 0 1 5.2-2.6M19 12.9a10 10 0 0 0-2.8-2M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/></svg>'
    : '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>';
  const title = offline ? 'ইন্টারনেট সংযোগ নেই' : 'কিছু একটা সমস্যা হয়েছে';
  const msg = offline
    ? 'ক্লাসের তালিকা আনতে ইন্টারনেট লাগে। সংযোগ চালু আছে কিনা দেখে আবার চেষ্টা করো — সংযোগ ফিরলে নিজে থেকেই পেইজ রিলোড হবে।'
    : 'এই মুহূর্তে ক্লাসের তালিকা আনা যাচ্ছে না। একটু পরে আবার চেষ্টা করো। সমস্যা থাকলে amraaimers@gmail.com-এ জানাতে পারো।';
  el.className = 'state-screen error';
  el.innerHTML =
    '<div class="state-icon">' + icon + '</div>' +
    '<h2 class="state-title">' + title + '</h2>' +
    '<p>' + msg + '</p>' +
    '<button class="cta-btn retry-btn" type="button">আবার চেষ্টা করো</button>';
  el.querySelector('.retry-btn').addEventListener('click', function(){ location.reload(); });
  if(offline) window.addEventListener('online', function(){ location.reload(); }, { once: true });
}

// Google Sheet থেকে Classes ও Chapters — দুটোই fetch করে গ্লোবাল ভ্যারিয়েবলে বসায়
async function loadData(){
  const [classesCsv, chaptersCsv] = await Promise.all([
    fetchSheetCsv('Classes', 'Classes ট্যাব পড়া যায়নি'),
    fetchSheetCsv('Chapters', 'Chapters ট্যাব পড়া যায়নি'),
  ]);

  CLASSES = parseCSV(classesCsv).map(r => ({
    id: r.id,
    num: r.num,
    roll: r.roll,
    ready: String(r.ready).trim().toUpperCase() === 'TRUE',
    subjects: r.subjects ? r.subjects.split(';').map(s => s.trim()).filter(Boolean) : [],
  }));

  CHAPTERS = {};
  ALL_CHAPTERS = [];
  parseCSV(chaptersCsv).forEach(r => {
    if(!r.classId || !r.subject) return;
    const key = `${r.classId}_${r.subject}`;
    if(!CHAPTERS[key]) CHAPTERS[key] = [];
    const entry = {
      chapter: r.chapter || 'অধ্যায়',
      title: r.topic || r.title || 'শিরোনাম নেই', // r.title রাখা হয়েছে পুরনো Sheet ফরম্যাটের সাথে সামঞ্জস্যের জন্য
      youtubeId: extractYoutubeId(r.youtube),
    };
    CHAPTERS[key].push(entry);
    if(entry.youtubeId){
      ALL_CHAPTERS.push({ classId: r.classId, subjectKey: r.subject, chapter: entry.chapter, title: entry.title, youtubeId: entry.youtubeId });
    }
  });

  DATA_LOADED = true;
}

// ============================================================
// মানসিক স্বাস্থ্য (মনোলগ ভিডিও) — ক্লাস/সাবজেক্ট কাঠামোর বাইরে, আলাদা সিরিজ
// Sheet-এ আলাদা ট্যাব লাগবে ঠিক এই নামে: "MentalHealth"
// কলাম: episode, title, youtube
// ============================================================
async function loadMentalHealth(){
  const csv = await fetchSheetCsv('MentalHealth', 'MentalHealth ট্যাব পড়া যায়নি');
  return parseCSV(csv)
    .map(r => ({
      episode: r.episode || '',
      title: r.title || 'শিরোনাম নেই',
      youtubeId: extractYoutubeId(r.youtube),
    }))
    .filter(e => e.title && e.title !== 'শিরোনাম নেই');
}

// এই সাবজেক্টের সব অধ্যায়ের নাম, Sheet-এ যে ক্রমে প্রথম দেখা গেছে সেই ক্রমে (ডুপ্লিকেট বাদে)
function getChapterNames(classId, subjectKey){
  const key = `${classId}_${subjectKey}`;
  const items = CHAPTERS[key] || [];
  const seen = [];
  items.forEach(it => { if(!seen.includes(it.chapter)) seen.push(it.chapter); });
  return seen;
}

// একটা নির্দিষ্ট অধ্যায়ের ভিতরের সব টপিক
function getTopics(classId, subjectKey, chapterName){
  const key = `${classId}_${subjectKey}`;
  return (CHAPTERS[key] || []).filter(it => it.chapter === chapterName);
}

// শেষ N টা real ভিডিও (youtubeId বসানো আছে এমন) — সবচেয়ে সাম্প্রতিক আগে
function getRecentVideos(n = 4){
  return ALL_CHAPTERS.slice(-n).reverse();
}

function getClass(id){
  return CLASSES.find(c => c.id === id);
}

// আসল ভিডিও কাউন্ট — Sheet-এ যা আছে ঠিক তাই, কোনো এলোমেলো সংখ্যা বানানো হয় না
function videoCount(classId, subjectKey){
  const key = `${classId}_${subjectKey}`;
  return (CHAPTERS[key] || []).length;
}

// ============================================================
// প্রগ্রেস ট্র্যাকিং — ব্রাউজারের localStorage-এ সেভ থাকে
// (ডিভাইস/ব্রাউজার বদলালে রিসেট হয়ে যাবে, কোনো সার্ভারে যায় না)
// ============================================================
const PROGRESS_KEY = 'aimers_watched_topics';

function topicKey(classId, subjectKey, chapterName, topicTitle){
  return `${classId}|${subjectKey}|${chapterName}|${topicTitle}`;
}

function getWatchedSet(){
  try{
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]'));
  }catch(e){
    return new Set();
  }
}

function isWatched(classId, subjectKey, chapterName, topicTitle){
  return getWatchedSet().has(topicKey(classId, subjectKey, chapterName, topicTitle));
}

function markWatched(classId, subjectKey, chapterName, topicTitle){
  try{
    const set = getWatchedSet();
    set.add(topicKey(classId, subjectKey, chapterName, topicTitle));
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...set]));
  }catch(e){ /* localStorage না থাকলে চুপচাপ স্কিপ করা হবে */ }
}

// একটা সাবজেক্টের মোট কতগুলো (real) টপিকের মধ্যে কতগুলো দেখা হয়েছে
function getSubjectProgress(classId, subjectKey){
  const key = `${classId}_${subjectKey}`;
  const items = (CHAPTERS[key] || []).filter(it => it.youtubeId);
  const watched = getWatchedSet();
  const watchedCount = items.filter(it => watched.has(topicKey(classId, subjectKey, it.chapter, it.title))).length;
  return { watched: watchedCount, total: items.length };
}

// "যেখানে ছিলে সেখান থেকে চালিয়ে যাও" — সবচেয়ে শেষে যে টপিক খোলা হয়েছিল সেটা মনে রাখে
const LAST_WATCHED_KEY = 'aimers_last_watched';

function setLastWatched(classId, subjectKey, chapterName, topicTitle){
  try{
    localStorage.setItem(LAST_WATCHED_KEY, JSON.stringify({ classId, subjectKey, chapterName, topicTitle, ts: Date.now() }));
  }catch(e){ /* skip */ }
}

function getLastWatched(){
  try{
    return JSON.parse(localStorage.getItem(LAST_WATCHED_KEY) || 'null');
  }catch(e){
    return null;
  }
}

// অটো-প্লে চালু/বন্ধ পছন্দ — ডিফল্ট চালু থাকে
const AUTOPLAY_KEY = 'aimers_autoplay';

function getAutoplayPref(){
  try{ return localStorage.getItem(AUTOPLAY_KEY) !== 'off'; }catch(e){ return true; }
}

function setAutoplayPref(on){
  try{ localStorage.setItem(AUTOPLAY_KEY, on ? 'on' : 'off'); }catch(e){ /* skip */ }
}
