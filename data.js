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

// সাবজেক্টের ভিজ্যুয়াল তথ্য (নাম, আইকন-অক্ষর, রঙ) — এটা ডিজাইনের অংশ, তাই কোডেই থাকে
const SUBJECTS = {
  bangla:      { name: 'বাংলা',        icon: 'অ', accent: '#00f0ff' },
  english:     { name: 'ইংলিশ',        icon: 'A', accent: '#ff2e9a' },
  math:        { name: 'গণিত',         icon: '∑', accent: '#9d4dff' },
  science:     { name: 'বিজ্ঞান',      icon: '⚛', accent: '#ffd23f' },
  ict:         { name: 'আইসিটি',       icon: '{ }', accent: '#00f0ff' },
  higher_math: { name: 'উচ্চতর গণিত',  icon: '∞', accent: '#ff2e9a' },
  bwp:         { name: 'বাংলাদেশ ও বিশ্ব পরিচয়', icon: 'ব', accent: '#39ff88' },
};
// Sheet-এ নতুন subject key ব্যবহার করলে (উপরে তালিকায় নেই এমন) এই ডিফল্ট ব্যবহার হবে
function getSubject(key){
  return SUBJECTS[key] || { name: key, icon: '?', accent: '#00f0ff' };
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

// Google Sheet থেকে Classes ও Chapters — দুটোই fetch করে গ্লোবাল ভ্যারিয়েবলে বসায়
async function loadData(){
  const [classesCsv, chaptersCsv] = await Promise.all([
    fetch(sheetUrl('Classes')).then(r => { if(!r.ok) throw new Error('Classes ট্যাব পড়া যায়নি'); return r.text(); }),
    fetch(sheetUrl('Chapters')).then(r => { if(!r.ok) throw new Error('Chapters ট্যাব পড়া যায়নি'); return r.text(); }),
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
  const csv = await fetch(sheetUrl('MentalHealth')).then(r => {
    if(!r.ok) throw new Error('MentalHealth ট্যাব পড়া যায়নি');
    return r.text();
  });
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