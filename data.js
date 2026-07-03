// ============================================================
// AIMERS — কেন্দ্রীয় ডেটা ফাইল
// এখন থেকে সব ক্লাস/চ্যাপ্টার/ভিডিও ডেটা আসে Google Sheet থেকে।
// নতুন কিছু যোগ করতে হলে কোড টাচ করা লাগবে না —
// শুধু Sheet-এ নতুন সারি যোগ করলেই হবে।
//
// Sheet-এর ট্যাব দুইটা হতে হবে ঠিক এই নামে: "Classes" এবং "Chapters"
// Classes ট্যাবের কলাম: id, num, roll, ready, subjects
// Chapters ট্যাবের কলাম: classId, subject, title, youtube
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
};
// Sheet-এ নতুন subject key ব্যবহার করলে (উপরে তালিকায় নেই এমন) এই ডিফল্ট ব্যবহার হবে
function getSubject(key){
  return SUBJECTS[key] || { name: key, icon: '?', accent: '#00f0ff' };
}

let CLASSES = [];
let CHAPTERS = {};
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
  parseCSV(chaptersCsv).forEach(r => {
    if(!r.classId || !r.subject) return;
    const key = `${r.classId}_${r.subject}`;
    if(!CHAPTERS[key]) CHAPTERS[key] = [];
    CHAPTERS[key].push({ title: r.title || 'শিরোনাম নেই', youtubeId: extractYoutubeId(r.youtube) });
  });

  DATA_LOADED = true;
}

function getClass(id){
  return CLASSES.find(c => c.id === id);
}

// classId + subjectKey দিয়ে চ্যাপ্টার লিস্ট বের করে।
// Sheet-এ এন্ট্রি না থাকলে অস্থায়ী প্লেসহোল্ডার লিস্ট বানিয়ে দেয়, যাতে পেইজ খালি না লাগে।
function getChapters(classId, subjectKey){
  const key = `${classId}_${subjectKey}`;
  if(CHAPTERS[key] && CHAPTERS[key].length) return CHAPTERS[key];

  const seed = (classId + subjectKey).split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  const count = 6 + (seed % 14);
  const list = [];
  for(let i = 1; i <= count; i++){
    list.push({ title: `অধ্যায় ${String(i).padStart(2,'0')}`, youtubeId: '' });
  }
  return list;
}

function placeholderVideoCount(classId, subjectKey){
  const key = `${classId}_${subjectKey}`;
  if(CHAPTERS[key] && CHAPTERS[key].length) return CHAPTERS[key].length;
  const seed = (classId + subjectKey).split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  return 6 + (seed % 14);
}