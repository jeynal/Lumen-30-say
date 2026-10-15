/* =====================================================================
   LUMEN : 30 Days in Shanghai  -  main.js  (v2: persistent chat)
   ---------------------------------------------------------------------
   แนวคิดหลัก
   1) ทุกข้อความที่แสดงบนจอ ถูกบันทึกลง chatLogs[room] (แยกตามอีเมล)
   2) ทุกห้องมี "checkpoint" = ตำแหน่งบทสนทนา (pos) + ความยาว log (len)
      เมื่อโหลดใหม่ จะตัด log ให้เหลือแค่ถึง checkpoint แล้วเล่นต่อจากตำแหน่งนั้น
   3) ทุก entry ติดป้ายวัน (day) -> กระโดดกลับวันที่ N แล้วลบเฉพาะ day >= N ได้
   ===================================================================== */

// ---------- Helpers ----------
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const $ = (id) => document.getElementById(id);
const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val; };

// ---------- Runtime state ----------
let userEmail = '';
let currentDay = 1;
let maxUnlockedDay = 1;
let activeRoomId = null;
let currentNotificationRoomTarget = null;

let waitingForTap = false;
let speedMode = 1; // 0=Slow, 1=Normal, 2=Fast, 3=Tap
const delays = [2200, 1200, 500, 0];
let chatOrderCounter = 100;

let runToken = 0;          // เพิ่มค่าเมื่อ reset/jump เพื่อยกเลิก timer เก่า
let masterRunning = false;
let groupRunning = false;
let currentSelectedOption = null;

function later(fn, ms) {
  const t = runToken;
  setTimeout(() => { if (t === runToken) fn(); }, ms);
}

// ---------- Persistent state (saved per email) ----------
const defaultHearts = () => ({ chenxu: 1, xiyao: 0, wenjun: 0, guyan: 0, yingyin: 0, jiangyue: 0, tangmei: 0 });
const defaultProfile = () => ({
  name: 'Lin XinYue', avatarDataUrl: '', age: 23, occupation: 'Automation Engineer',
  interests: 'Reading, writing, music', idealType: 'Good guy, mature',
  datingStyle: 'Slow burn', bestQuality: 'Friendly'
});
const emptyLogs = () => ({ master: [], group: [], bot: [], heart: [] });
const defaultProgress = () => ({
  master: { pos: 0, len: 0, sub: null },            // checkpoint ห้อง Master
  masterDone: false,
  group: { day: 1, pos: 0, len: 0, hearts: defaultHearts(), done: false }, // checkpoint ห้อง Group (วันปัจจุบัน)
  unlocked: { group: false, heart: false },
  heart: {},   // { [day]: { stage:'new|choose|message|sending|done', target, message } }
  bot: {},     // { [day]: { stage:'new|choose|done' } }
  dayStartHearts: { 1: defaultHearts() }            // แต้มใจตอนเริ่มแต่ละวัน (ใช้ตอนย้อนวัน)
});

let characterHearts = defaultHearts();
let playerProfile = defaultProfile();
let endingBookRecords = [];
let chatLogs = emptyLogs();
let progress = defaultProgress();

const contactsData = {
  chenxu: { codeName: 'Mr. Horizon', realName: 'Chen Xu', age: 29, occupation: 'Lead Architect', avatarUrl: 'images/chenxu.jpg', bgTone: 'bg-purple-200 text-purple-800' },
  xiyao: { codeName: 'Golden Puppy', realName: 'Xia Xiyao', age: 22, occupation: 'Idol Vocalist & Dancer', avatarUrl: 'images/xiyao.jpg', bgTone: 'bg-sky-200 text-sky-800' },
  wenjun: { codeName: 'Velvet Noir', realName: 'Wen Jun', age: 28, occupation: 'Art Gallery Owner', avatarUrl: 'images/wenjun.jpg', bgTone: 'bg-indigo-950 text-purple-200' },
  guyan: { codeName: 'Black Cat', realName: 'Gu Yan', age: 24, occupation: 'Indie Game Developer', avatarUrl: 'images/guyan.jpg', bgTone: 'bg-slate-700 text-slate-200' },
  yingyin: { codeName: 'Scarlet', realName: 'Song Yingyin', age: 26, occupation: 'Fashion Editor', avatarUrl: 'images/yingyin.jpg', bgTone: 'bg-pink-200 text-pink-800' },
  jiangyue: { codeName: 'Luna', realName: 'Jiang Yue', age: 25, occupation: 'Classical Pianist', avatarUrl: 'images/jiangyue.jpg', bgTone: 'bg-fuchsia-200 text-fuchsia-800' },
  tangmei: { codeName: 'Mochi (Foco)', realName: 'Tang Mei', age: 23, occupation: 'Food Vlogger', avatarUrl: 'images/tangmei.jpg', bgTone: 'bg-purple-200 text-purple-800' },
  master: { codeName: 'Producer', realName: 'Plan Master', occupation: 'Executive Director of LUMEN', avatarUrl: '', bgTone: 'bg-pink-100 text-fuchsia-700', isSpecial: true },
  bot: { codeName: 'Love Counselor', realName: 'Love Counselor', occupation: 'LUMEN Counselor', avatarUrl: '', bgTone: 'bg-emerald-100 text-emerald-800', isSpecial: true },
  heartAdmin: { codeName: 'Midnight Heart', realName: 'Midnight Heart', occupation: 'Heart Signal Manager', avatarUrl: '', bgTone: 'bg-pink-100 text-fuchsia-800', isSpecial: true }
};

const guySecretMessages = {
  chenxu: {
    day1: "Thanks for the kind write-up",
    day7: "I hope you are adjusting well to Shanghai's rhythm.",
    day14: "I kept the small coffee mug you mentioned.",
    day21: "Looking forward to walking along the Bund with you again.",
    day28: "My choice has always been you from Day 1."
  },
  xiyao: {
    day1: "Glad to meet you! Hope we can talk more ✨",
    day7: "Your smile in group chat brightened my whole day!",
    day14: "Let's go eat sweet milk tea together sometime!",
    day21: "I felt really happy every time you responded to me.",
    day28: "You are the sweetest part of my 30 days."
  },
  wenjun: {
    day1: "A gentle night in Shanghai. Glad you joined us.",
    day7: "Your taste in conversation is intriguing, little one.",
    day14: "I played a jazz vinyl tonight and thought of your words.",
    day21: "The gallery feels warm whenever you visit.",
    day28: "Thank you for making this season unforgettable."
  },
  guyan: {
    day1: "...Thanks for not ignoring my quiet hello.",
    day7: "I don't usually text much, but I read all your lines.",
    day14: "Finished my game level. Thought I'd send you a heart.",
    day21: "My black cat seems to like your picture too.",
    day28: "You are the only exception to my code."
  }
};

const STREAM_ID = { master: 'master-stream', group: 'group-stream', bot: 'bot-stream', heart: 'heart-stream' };
const PREVIEW_ID = { master: 'master-last-msg', group: 'group-last-msg', bot: 'bot-last-msg', heart: 'heart-last-msg' };
const PREVIEW_DEFAULT = {
  master: 'Welcome! Tap to start setup...',
  group: 'Tap to join group lounge...',
  bot: 'Hello! Checking in on your status...',
  heart: 'Activated! Tap to send midnight heart.'
};

// =====================================================================
// SAVE / LOAD
// =====================================================================
function saveUserData() {
  if (!userEmail) return;
  const storeObj = {
    version: 2, currentDay, maxUnlockedDay, playerProfile, endingBookRecords,
    characterHearts, chatLogs, progress, speedMode
  };
  try {
    localStorage.setItem(`lumen_save_${userEmail}`, JSON.stringify(storeObj));
  } catch (e) {
    console.error('Save failed (storage full?)', e);
  }
}

function resetAllState() {
  currentDay = 1;
  maxUnlockedDay = 1;
  playerProfile = defaultProfile();
  endingBookRecords = [];
  characterHearts = defaultHearts();
  chatLogs = emptyLogs();
  progress = defaultProgress();
  runToken++;
  masterRunning = false;
  groupRunning = false;
  waitingForTap = false;
}

function mergeProgress(p) {
  const base = defaultProgress();
  if (!p) return base;
  return {
    ...base, ...p,
    master: { ...base.master, ...(p.master || {}) },
    group: { ...base.group, ...(p.group || {}) },
    unlocked: { ...base.unlocked, ...(p.unlocked || {}) },
    heart: p.heart || {},
    bot: p.bot || {},
    dayStartHearts: { ...base.dayStartHearts, ...(p.dayStartHearts || {}) }
  };
}

function trimLog(room, len) {
  if (chatLogs[room].length > len) chatLogs[room].length = len;
}

function loadUserData() {
  resetAllState();
  let raw = null;
  try { raw = localStorage.getItem(`lumen_save_${userEmail}`); } catch (e) { /* ignore */ }

  if (raw) {
    try {
      const d = JSON.parse(raw);
      currentDay = d.currentDay || 1;
      maxUnlockedDay = d.maxUnlockedDay || 1;
      playerProfile = { ...defaultProfile(), ...(d.playerProfile || {}) };
      endingBookRecords = d.endingBookRecords || [];
      chatLogs = { ...emptyLogs(), ...(d.chatLogs || {}) };
      progress = mergeProgress(d.progress);
      speedMode = typeof d.speedMode === 'number' ? d.speedMode : 1;
      characterHearts = clone(progress.group.hearts || d.characterHearts || defaultHearts());
    } catch (e) {
      console.error('Save data parse error:', e);
    }
  }

  // ตัดข้อความที่ "ครึ่งๆกลางๆ" หลัง checkpoint ทิ้ง แล้วเล่นต่อจาก checkpoint
  if (!progress.masterDone) trimLog('master', progress.master.len);
  if (!progress.group.done && progress.group.day === currentDay) trimLog('group', progress.group.len);

  const sel = $('setting-speed-select');
  if (sel) sel.value = String(speedMode);

  rebuildAllStreams();
  checkWeeklyBotTrigger(true);
}

// =====================================================================
// LOGIN
// =====================================================================
window.addEventListener('DOMContentLoaded', () => {
  let savedEmail = null;
  try { savedEmail = localStorage.getItem('lumen_user_email'); } catch (e) { /* ignore */ }

  const loginModal = $('modal-email-login');
  const emailInput = $('login-email-input');

  if (emailInput) {
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitEmailLogin(); });
  }
  if (loginModal) {
    // กดพื้นหลังเพื่อปิด (เฉพาะตอนล็อกอินอยู่แล้ว)
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal && userEmail) loginModal.classList.add('hidden');
    });
  }

  if (savedEmail) {
    userEmail = savedEmail;
    loadUserData();
  } else if (loginModal) {
    loginModal.classList.remove('hidden');   // เดิม modal ซ่อนตลอด -> ไม่เคยให้ใส่อีเมลครั้งแรก
  }
});

function submitEmailLogin() {
  const inputEl = $('login-email-input');
  if (!inputEl) return;
  const input = inputEl.value.trim();
  if (!input || !input.includes('@')) {
    alert('Please enter a valid email address!');
    return;
  }
  const loginModal = $('modal-email-login');

  if (input === userEmail) {
    if (loginModal) loginModal.classList.add('hidden');
    return;
  }
  saveUserData();                       // เซฟบัญชีเดิมก่อนสลับ
  userEmail = input;
  try { localStorage.setItem('lumen_user_email', userEmail); } catch (e) { /* ignore */ }
  loadUserData();                       // โหลดของบัญชีใหม่ (ล้างของเก่าก่อน)
  if (loginModal) loginModal.classList.add('hidden');
  switchTab('chats');
}

function openSwitchAccountModal() {
  const input = $('login-email-input');
  if (input) input.value = '';
  const modal = $('modal-email-login');
  if (modal) modal.classList.remove('hidden');
}

// =====================================================================
// UI SYNC
// =====================================================================
function updateUIFromState() {
  setTxt('my-player-name', playerProfile.name);
  setTxt('my-player-email', userEmail);
  setTxt('more-user-email-display', userEmail || 'Not logged in');
  setTxt('people-player-name', `${playerProfile.name} (You)`);
  setTxt('people-player-sub', `${playerProfile.occupation} · Participant`);
  setTxt('my-day-indicator', `${currentDay} / 30`);

  ['people-player-avatar', 'my-player-avatar'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (playerProfile.avatarDataUrl) {
      el.setAttribute('style', `background-image: url('${playerProfile.avatarDataUrl}'); background-size: cover; background-position: center;`);
      el.textContent = '';
    } else {
      el.removeAttribute('style');
      el.textContent = 'You';
    }
  });
}

function applyUnlockState() {
  const grp = $('channel-group');
  if (grp) grp.classList.toggle('hidden', !progress.unlocked.group);
  const heart = $('channel-heart');
  if (heart) heart.classList.toggle('hidden', !progress.unlocked.heart);
  if (progress.masterDone) setTxt('master-last-msg', 'TDL All Group Unlocked!');
}

function checkWeeklyBotTrigger(notify = false) {
  const botChannel = $('channel-bot');
  if (!botChannel) return;
  if (currentDay > 1 && currentDay % 7 === 0) {
    botChannel.classList.remove('hidden');
    const st = progress.bot[currentDay];
    if (notify && (!st || st.stage === 'new')) {
      moveChannelToTop('bot');
      triggerInAppNotification('Love Counselor 💬', `Hello ${playerProfile.name}! Checking in on day ${currentDay}...`, '💬', 'bot');
    }
  } else {
    botChannel.classList.add('hidden');
  }
}

function clearTransientUI() {
  const mbox = $('master-form-box'); if (mbox) mbox.innerHTML = '';
  ['group-choices-panel', 'next-tap-bar', 'typing-indicator', 'bot-choices-panel', 'heart-choices-panel', 'heart-input-panel', 'sweet-popup']
    .forEach((id) => { const el = $(id); if (el) el.classList.add('hidden'); });
  currentSelectedOption = null;
  resetGroupInputBar();
}

function refreshPreviews() {
  Object.keys(PREVIEW_ID).forEach((room) => {
    const last = [...chatLogs[room]].reverse().find((e) => previewText(e));
    setTxt(PREVIEW_ID[room], last ? previewText(last) : PREVIEW_DEFAULT[room]);
  });
}

function rebuildRoom(room) {
  const s = $(STREAM_ID[room]);
  if (!s) return;
  s.innerHTML = '';
  chatLogs[room].forEach((e) => renderEntry(room, e));
}

function rebuildAllStreams() {
  Object.keys(STREAM_ID).forEach(rebuildRoom);
  clearTransientUI();
  refreshPreviews();
  applyUnlockState();
  updateUIFromState();
  exitActiveChat();
}

// =====================================================================
// CHAT LOG: บันทึก + แสดงผล
// =====================================================================
function previewText(e) {
  switch (e.kind) {
    case 'msg': return `${e.sender}: ${e.text}`;
    case 'img': return `${e.sender}: [Photo 📷]`;
    case 'master': return e.text;
    case 'bot': return `Love Counselor: ${e.text}`;
    case 'admin': return `Heart Manager: ${e.text}`;
    default: return '';
  }
}

// บันทึกลง log ทันที (กันหายตอนรีเฟรช) แต่จะ "แสดง" ช้าลงได้ด้วย renderDelay
function pushEntry(room, entry, renderDelay = 0) {
  entry.day = currentDay;
  chatLogs[room].push(entry);
  const p = previewText(entry);
  if (p) setTxt(PREVIEW_ID[room], p);
  saveUserData();
  if (renderDelay > 0) later(() => renderEntry(room, entry), renderDelay);
  else renderEntry(room, entry);
}

function removeDayEntries(room, day) {
  chatLogs[room] = chatLogs[room].filter((e) => e.day !== day);
}

function renderEntry(room, e) {
  const stream = $(STREAM_ID[room]);
  if (!stream) return;
  const wrap = document.createElement('div');

  switch (e.kind) {
    case 'sys':
      wrap.className = 'flex justify-center my-2 chat-bubble';
      wrap.innerHTML = `<div class="bg-purple-100/60 text-purple-600 border border-purple-200/50 px-3.5 py-1.5 rounded-full text-[11px] max-w-[90%] text-center">${e.text}</div>`;
      break;
    case 'user':
      wrap.className = 'chat-bubble flex justify-end';
      wrap.innerHTML = `<div class="bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white px-3.5 py-2 rounded-2xl rounded-tr-none text-xs max-w-[80%] shadow-sm">${esc(e.text)}</div>`;
      break;
    case 'master':
      wrap.className = 'chat-bubble flex items-start space-x-2';
      wrap.innerHTML = `<div class="w-7 h-7 rounded-full bg-gradient-to-tr from-fuchsia-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">M</div><div class="bg-white border border-purple-100 text-purple-900 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs max-w-[85%] shadow-sm whitespace-pre-line">${e.text}</div>`;
      break;
    case 'msg':
      wrap.className = 'chat-bubble flex items-start space-x-2.5';
      wrap.innerHTML = `
        <div class="w-9 h-9 rounded-full ${e.tone} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-purple-100 shadow-sm">${e.sender[0]}</div>
        <div class="space-y-0.5 max-w-[80%]">
          <span class="text-[11px] font-semibold text-purple-400 ml-1">${e.sender}</span>
          <div class="bg-white border border-purple-100 text-purple-950 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm">${e.text}</div>
        </div>`;
      break;
    case 'img':
      wrap.className = 'chat-bubble flex items-start space-x-2.5';
      wrap.innerHTML = `
        <div class="w-9 h-9 rounded-full ${e.tone} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-purple-100 shadow-sm">${e.sender[0]}</div>
        <div class="space-y-0.5 max-w-[75%]">
          <span class="text-[11px] font-semibold text-purple-400 ml-1">${e.sender}</span>
          <div class="bg-white border border-purple-100 p-1.5 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
            <img src="${e.src}" class="rounded-xl w-full h-auto object-cover max-h-60" alt="Chat attachment" onclick="window.open(this.src, '_blank')">
          </div>
        </div>`;
      break;
    case 'bot':
      wrap.className = 'chat-bubble flex items-start space-x-2.5 my-2';
      wrap.innerHTML = `
        <div class="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 border border-emerald-100 shadow-sm">💬</div>
        <div class="space-y-0.5 max-w-[80%]">
          <span class="text-[11px] font-semibold text-emerald-600 ml-1">Love Counselor</span>
          <div class="bg-white border border-emerald-100 text-purple-950 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm">${e.text}</div>
        </div>`;
      break;
    case 'admin':
      wrap.className = 'chat-bubble flex items-start space-x-2.5 my-2';
      wrap.innerHTML = `
        <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-300 to-pink-300 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 border border-pink-100 shadow-sm">💌</div>
        <div class="space-y-0.5 max-w-[80%]">
          <span class="text-[11px] font-semibold text-pink-500 ml-1">Heart Manager</span>
          <div class="bg-white border border-pink-100 text-purple-950 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm">${e.text}</div>
        </div>`;
      break;
    case 'card':
      wrap.className = 'chat-bubble my-2';
      wrap.innerHTML = e.key === 'player'
        ? createPolaroidCardHTML(null, true, e.snap, e.day)
        : createPolaroidCardHTML(contactsData[e.key], false, null, e.day);
      break;
    case 'heartcard':
      wrap.className = 'chat-bubble my-3 flex justify-center';
      wrap.innerHTML = `
        <div class="heart-card-bg text-red-900 rounded-2xl p-4 shadow-lg border border-pink-200/80 w-full max-w-xs font-typewriter relative overflow-hidden">
          <div class="text-[9px] text-red-800/80 font-sans tracking-widest font-bold flex justify-between border-b border-red-900/10 pb-1 mb-2 uppercase">
            <span>30 DAYS TO LOVE</span><span>THE AFTERIMAGE PARADOX</span>
          </div>
          <div class="flex items-center space-x-1.5 text-red-900 font-bold text-sm mb-2"><span>❤️</span><span class="tracking-wide">Heart Message</span></div>
          <div class="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-white/60 shadow-inner text-center my-2">
            <p class="text-xs font-semibold text-slate-800 leading-relaxed font-sans">"${e.text}"</p>
          </div>
          <div class="flex justify-between items-end mt-3 pt-1 border-t border-red-900/10">
            <div class="text-[10px] tracking-tighter opacity-70">||||||||||||||||||||</div>
            <span class="font-serif italic font-bold text-xs opacity-80">TDL</span>
          </div>
        </div>`;
      break;
    default:
      return;
  }
  stream.appendChild(wrap);
  stream.scrollTop = stream.scrollHeight;
}

// =====================================================================
// NOTIFICATION / CHANNEL LIST
// =====================================================================
function triggerInAppNotification(title, msg, avatarText = 'M', targetRoom = 'master', avatarImgUrl = '') {
  moveChannelToTop(targetRoom);
  if (activeRoomId === targetRoom) return;

  currentNotificationRoomTarget = targetRoom;
  const notiBox = $('in-app-notification');
  const avatarBox = $('noti-avatar');
  if (!notiBox || !avatarBox) return;

  setTxt('noti-title', title);
  setTxt('noti-body', msg);

  if (avatarImgUrl) {
    avatarBox.style.backgroundImage = `url('${avatarImgUrl}')`;
    avatarBox.textContent = '';
  } else {
    avatarBox.style.backgroundImage = 'none';
    avatarBox.textContent = avatarText;
  }

  notiBox.classList.remove('hidden', 'noti-slide-up');
  notiBox.classList.add('noti-slide-down');

  setTimeout(() => {
    notiBox.classList.remove('noti-slide-down');
    notiBox.classList.add('noti-slide-up');
    setTimeout(() => notiBox.classList.add('hidden'), 300);
  }, 3500);
}

function clickNotificationBanner() {
  if (currentNotificationRoomTarget === 'master') openMasterChat();
  else if (currentNotificationRoomTarget === 'group') openGroupChat();
  else if (currentNotificationRoomTarget === 'heart') openHeartSendingRoom();
  else if (currentNotificationRoomTarget === 'bot') openConsultantBotChat();
  const notiBox = $('in-app-notification');
  if (notiBox) notiBox.classList.add('hidden');
}

function moveChannelToTop(channelKey) {
  chatOrderCounter--;
  const channelEl = $(`channel-${channelKey}`);
  if (channelEl) channelEl.style.order = chatOrderCounter;
}

function enterRoomUI(room, title) {
  activeRoomId = room;
  const header = $('main-header');
  if (header) header.classList.add('hidden');
  document.querySelectorAll('.tab-page').forEach((p) => p.classList.add('hidden'));
  ['room-master', 'room-group', 'room-heart', 'room-bot'].forEach((id) => { const el = $(id); if (el) el.classList.add('hidden'); });
  const insideHeader = $('chat-inside-header');
  if (insideHeader) insideHeader.classList.remove('hidden');
  setTxt('active-chat-title', title);
  const r = $(`room-${room}`);
  if (r) r.classList.remove('hidden');
  const s = $(STREAM_ID[room]);
  if (s) s.scrollTop = s.scrollHeight;
}

// =====================================================================
// IMAGE HELPER (ย่อรูปก่อนเก็บ กัน localStorage เต็ม)
// =====================================================================
function resizeImage(dataUrl, maxSize, cb) {
  const img = new Image();
  img.onload = () => {
    const r = Math.min(1, maxSize / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * r);
    c.height = Math.round(img.height * r);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    cb(c.toDataURL('image/jpeg', 0.8));
  };
  img.onerror = () => cb(dataUrl);
  img.src = dataUrl;
}

function readImageFile(file, cb) {
  const reader = new FileReader();
  reader.onload = (e) => resizeImage(e.target.result, 400, cb);
  reader.readAsDataURL(file);
}

// =====================================================================
// POLAROID CARD
// =====================================================================
function profileSnap() {
  const s = clone(playerProfile);
  delete s.avatarDataUrl;     // รูปอ่านจาก playerProfile ปัจจุบัน ไม่เก็บซ้ำในทุก log
  return s;
}

function createPolaroidCardHTML(cardData, isPlayer = false, snap = null, day = currentDay) {
  const src = isPlayer ? (snap || playerProfile) : cardData;
  const nameAge = isPlayer ? `${src.name}, ${src.age}` : `${cardData.realName}, ${cardData.age}`;
  const f = (v) => esc(v || '—');

  let photoStyle = 'background-color: #e9d5ff;';
  if (isPlayer && playerProfile.avatarDataUrl) {
    photoStyle = `background-image: url('${playerProfile.avatarDataUrl}'); background-size: cover; background-position: center;`;
  } else if (!isPlayer && cardData.avatarUrl) {
    photoStyle = `background-image: url('${cardData.avatarUrl}'); background-size: cover; background-position: center;`;
  }
  const noPhoto = isPlayer && !playerProfile.avatarDataUrl;

  return `
    <div class="bg-[#f7f5f0] text-purple-950 rounded-xl p-4 shadow-md border border-purple-200/80 max-w-xs mx-auto my-3 font-typewriter">
      <div class="text-[10px] text-purple-400 border-b border-purple-200/60 pb-1.5 mb-2.5 flex justify-between">
        <span>Day ${day}. Profile : ${esc(nameAge.split(',')[0])}</span>
        <span class="tracking-widest font-sans font-bold text-pink-400">30 DAYS TO LOVE</span>
      </div>
      <div class="bg-white p-2.5 rounded-lg border border-purple-100 shadow-sm mb-3">
        <div class="aspect-[4/3] w-full rounded overflow-hidden shadow-inner flex flex-col justify-end p-2 ${noPhoto ? 'bg-purple-200 flex items-center justify-center text-xs font-sans text-purple-700' : ''}" style="${photoStyle}">
          ${noPhoto ? '📷 Your Photo' : ''}
        </div>
        <div class="mt-2 text-[9px] text-purple-400 font-sans tracking-widest flex justify-between uppercase">
          <span>30 DAYS TO LOVE</span><span>THE AFTERIMAGE PARADOX</span>
        </div>
      </div>
      <div class="space-y-2 text-xs text-purple-950 font-sans">
        <div class="border-b border-purple-200/60 pb-1 flex justify-between"><strong class="font-typewriter text-purple-800">Name/Age:</strong> <span>${esc(nameAge)}</span></div>
        <div class="border-b border-purple-200/60 pb-1 flex justify-between"><strong class="font-typewriter text-purple-800">Occupation:</strong> <span>${f(src.occupation)}</span></div>
        <div class="border-b border-purple-200/60 pb-1"><strong class="font-typewriter text-purple-800 block mb-0.5">Interests:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${f(src.interests)}</div></div>
        <div class="border-b border-purple-200/60 pb-1"><strong class="font-typewriter text-purple-800 block mb-0.5">Type:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${f(src.idealType)}</div></div>
        <div class="border-b border-purple-200/60 pb-1"><strong class="font-typewriter text-purple-800 block mb-0.5">Dating Style:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${f(src.datingStyle)}</div></div>
        <div><strong class="font-typewriter text-purple-800 block mb-0.5">Best Quality:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${f(src.bestQuality)}</div></div>
      </div>
    </div>`;
}

// =====================================================================
// ROOM 1 : MASTER  (checkpoint = pos + len + sub)
// =====================================================================
const masterData = () => (window.day1Data && window.day1Data.masterDialogues) || [];

const regQuestions = [
  { key: 'name', label: 'Name / Nickname:', placeholder: 'e.g. Lin XinYue' },
  { key: 'age', label: 'Age:', placeholder: 'e.g. 23' },
  { key: 'occupation', label: 'Occupation:', placeholder: 'e.g. Automation Engineer' },
  { key: 'interests', label: 'Interests & Hobbies:', placeholder: 'e.g. Reading, writing' },
  { key: 'idealType', label: 'Ideal Type:', placeholder: 'e.g. Good guy, mature' },
  { key: 'datingStyle', label: 'Dating Style:', placeholder: 'e.g. Slow burn' }
];

function saveMasterCheckpoint(sub) {
  progress.master.len = chatLogs.master.length;
  progress.master.sub = sub || null;
  saveUserData();
}

function nextMaster(delay = 0) {
  progress.master.pos++;
  saveMasterCheckpoint(null);
  if (delay) later(processMasterQueue, delay);
  else processMasterQueue();
}

function clearMasterBox() {
  const box = $('master-form-box');
  if (box) box.innerHTML = '';
}

function openMasterChat() {
  enterRoomUI('master', 'LUMEN Master');
  if (progress.masterDone) {
    showEnterGroupButton();
  } else if (!masterRunning) {
    masterRunning = true;
    ensureDayData(1, resumeMaster, () => {
      masterRunning = false;
      showFatalInRoom('master-stream', 'Cannot load js/stories/day1.js — check the file path/name and the browser Console (F12).');
    });
  }
}

// แสดงข้อผิดพลาดบนหน้าจอ (ไม่บันทึกลง log)
function showFatalInRoom(streamId, text) {
  const s = $(streamId);
  if (!s) return;
  const d = document.createElement('div');
  d.className = 'flex justify-center my-2';
  d.innerHTML = `<div class="bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-[11px] max-w-[90%] text-center">⚠️ ${esc(text)}</div>`;
  s.appendChild(d);
}

window.addEventListener('error', (ev) => {
  const room = activeRoomId ? STREAM_ID[activeRoomId] : null;
  if (room) showFatalInRoom(room, `Script error: ${ev.message}`);
});

function resumeMaster() {
  const sub = progress.master.sub;
  if (sub && sub.mode === 'reg') startMasterRegQuestions(sub.idx);
  else if (sub && sub.mode === 'edit') startMasterEditFlow(sub.idx);
  else if (sub && sub.mode === 'confirm') showMasterCardConfirmation();
  else processMasterQueue();
}

function showEnterGroupButton() {
  const box = $('master-form-box');
  if (box) box.innerHTML = `<button onclick="exitActiveChat(); openGroupChat();" class="w-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-md uppercase tracking-wider">Enter TDL All Group Lounge →</button>`;
}

function processMasterQueue() {
  const item = masterData()[progress.master.pos];
  if (!item) return;

  if (item.type === 'sys') {
    pushEntry('master', { kind: 'sys', text: item.text });
    nextMaster(800);
  } else if (item.type === 'master_msg') {
    pushEntry('master', { kind: 'master', text: item.text });
    triggerInAppNotification('LUMEN Master', item.text, 'M', 'master');
    nextMaster(1200);
  } else if (item.type === 'player_turn') {
    renderMasterInputBar(item.prompt, (text) => {
      pushEntry('master', { kind: 'user', text });
      nextMaster(0);
    });
  } else if (item.type === 'player_avatar_upload') {
    const box = $('master-form-box');
    if (box) {
      box.innerHTML = `
        <div class="space-y-2 text-center p-3 bg-purple-50 rounded-2xl border border-purple-100 shadow-xs">
          <label class="text-xs font-semibold text-purple-900 block">Upload Profile Avatar (Optional):</label>
          <input type="file" accept="image/*" onchange="handleMasterAvatarUpload(event)" class="text-xs text-purple-900 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:bg-pink-100 file:text-fuchsia-600">
          <button onclick="skipMasterAvatarUpload()" class="block mx-auto text-[11px] text-purple-400 underline pt-1">Skip this step →</button>
        </div>`;
    }
  } else if (item.type === 'player_reg_flow') {
    startMasterRegQuestions(0);
  } else if (item.type === 'card') {
    pushEntry('master', { kind: 'card', key: 'player', snap: profileSnap() });
    nextMaster(1000);
  } else if (item.type === 'master_confirm_card') {
    showMasterCardConfirmation();
  } else if (item.type === 'master_event') {
    if (item.eventName === 'OPEN_GROUP_CHANNEL') {
      progress.unlocked.group = true;
      progress.masterDone = true;
      progress.master.pos++;
      progress.master.sub = null;
      applyUnlockState();
      moveChannelToTop('group');
      triggerInAppNotification('TDL : All Group', 'Lounge Activated! Tap to join.', 'G', 'group');
      showEnterGroupButton();
      saveUserData();
    }
  }
}

function skipMasterAvatarUpload() {
  clearMasterBox();
  nextMaster(0);
}

function handleMasterAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  readImageFile(file, (dataUrl) => {
    playerProfile.avatarDataUrl = dataUrl;
    updateUIFromState();
    clearMasterBox();
    pushEntry('master', { kind: 'user', text: '📷 Avatar photo uploaded!' });
    nextMaster(0);
  });
}

function startMasterRegQuestions(idx) {
  if (idx >= regQuestions.length) {
    clearMasterBox();
    nextMaster(0);
    return;
  }
  saveMasterCheckpoint({ mode: 'reg', idx });
  const q = regQuestions[idx];
  pushEntry('master', { kind: 'master', text: `[Profile Detail ${idx + 1}/6] ${q.label}` });
  renderMasterInputBar(q.placeholder, (text) => {
    playerProfile[q.key] = text;
    updateUIFromState();
    pushEntry('master', { kind: 'user', text });
    startMasterRegQuestions(idx + 1);
  });
}

function renderMasterInputBar(placeholder, cb, defaultValue = '', btnLabel = 'Send') {
  const box = $('master-form-box');
  if (!box) return;
  box.innerHTML = `
    <div class="flex gap-2">
      <input type="text" id="master-input-field" class="flex-1 bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2 text-xs text-purple-950 focus:outline-none focus:border-fuchsia-400" placeholder="${esc(placeholder)}" value="${esc(defaultValue)}">
      <button id="master-send-btn" class="bg-gradient-to-r from-fuchsia-400 to-pink-400 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition">${btnLabel}</button>
    </div>`;
  const field = $('master-input-field');
  const btn = $('master-send-btn');
  const submit = () => {
    const val = field.value.trim();
    if (!val) return;
    box.innerHTML = '';
    cb(val);
  };
  if (field) {
    field.focus();
    if (defaultValue) field.select();
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }
  if (btn) btn.onclick = submit;
}

function showMasterCardConfirmation() {
  saveMasterCheckpoint({ mode: 'confirm' });
  const box = $('master-form-box');
  if (!box) return;

  box.innerHTML = `
    <div class="space-y-2 p-2 bg-purple-50/80 rounded-2xl border border-purple-100">
      <p class="text-[11px] font-bold text-purple-900 text-center">Is your profile card accurate?</p>
      <div class="grid grid-cols-1 gap-1.5">
        <button id="btn-confirm-card" class="w-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm hover:opacity-95 active:scale-95 transition">✨ Confirm & Continue</button>
        <button id="btn-edit-card" class="w-full bg-white border border-purple-200 text-purple-800 font-semibold py-2 rounded-xl text-xs hover:bg-purple-100/50 active:scale-95 transition">✏️ ฉันคิดว่าอยากแก้ข้อมูลใหม่</button>
      </div>
    </div>`;

  $('btn-confirm-card').onclick = () => {
    box.innerHTML = '';
    pushEntry('master', { kind: 'user', text: 'Looks perfect to me!' });
    nextMaster(0);
  };

  $('btn-edit-card').onclick = () => {
    box.innerHTML = '';
    pushEntry('master', { kind: 'user', text: 'ฉันคิดว่าอยากแก้ข้อมูลใหม่' });
    later(() => {
      pushEntry('master', { kind: 'master', text: "No problem! Let's update your details step by step." });
      startMasterEditFlow(0);
    }, 600);
  };
}

function startMasterEditFlow(idx) {
  saveMasterCheckpoint({ mode: 'edit', idx });

  if (idx >= regQuestions.length) {
    clearMasterBox();
    pushEntry('master', { kind: 'master', text: 'Here is your updated Profile Card!' });
    pushEntry('master', { kind: 'card', key: 'player', snap: profileSnap() });
    pushEntry('master', { kind: 'master', text: 'How about now? Does it look perfect?' }, 800);
    later(showMasterCardConfirmation, 800);
    return;
  }

  const q = regQuestions[idx];
  pushEntry('master', { kind: 'master', text: `[Update ${idx + 1}/6] ${q.label}` });
  renderMasterInputBar(q.placeholder, (newValue) => {
    playerProfile[q.key] = newValue;
    updateUIFromState();
    pushEntry('master', { kind: 'user', text: newValue });
    startMasterEditFlow(idx + 1);
  }, String(playerProfile[q.key] || ''), 'Save');
}

// =====================================================================
// ROOM 2 : GROUP  (checkpoint = day + pos + len + hearts)
// =====================================================================
function ensureDayData(day, ok, fail) {
  if (window[`day${day}Data`]) { ok(); return; }
  const s = document.createElement('script');
  s.src = `js/stories/day${day}.js?v=1.2`;
  s.onload = () => (window[`day${day}Data`] ? ok() : fail());
  s.onerror = fail;
  document.body.appendChild(s);
}

function resetGroupInputBar() {
  const inputText = $('group-input-text');
  const sendBtn = $('group-send-btn');
  if (inputText) {
    inputText.textContent = 'Please select an option...';
    inputText.classList.add('text-gray-400');
    inputText.classList.remove('text-gray-800');
  }
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.className = 'w-9 h-9 rounded-full bg-gray-300 text-white flex items-center justify-center shrink-0 transition-colors';
  }
}

function setGroupClosedBar() {
  resetGroupInputBar();
  setTxt('group-input-text', 'Lounge closed for today 🔒');
  const bar = $('next-tap-bar');
  if (bar) bar.classList.add('hidden');
}

function openGroupChat() {
  if (!progress.unlocked.group) { openMasterChat(); return; }
  enterRoomUI('group', 'TDL : All Group');
  const dot = $('group-unread-dot');
  if (dot) dot.classList.add('hidden');

  if (progress.group.done) {
    setGroupClosedBar();
  } else if (!groupRunning) {
    groupRunning = true;
    ensureDayData(progress.group.day, startGroupFlow, () => {
      groupRunning = false;
      alert(`Day ${progress.group.day} story file not found (js/stories/day${progress.group.day}.js).`);
    });
  }
}

function startGroupFlow() {
  const g = progress.group;
  if (g.pos === 0 && g.day > 1 && !chatLogs.group.some((e) => e.day === g.day)) {
    pushEntry('group', { kind: 'sys', text: `— Day ${g.day} —` });
  }
  processGroupQueue();
}

function afterGroupItem() {
  const g = progress.group;
  g.pos++;
  g.len = chatLogs.group.length;
  g.hearts = clone(characterHearts);
  saveUserData();
  scheduleGroupNext();
}

function finishGroupDay() {
  progress.group.done = true;
  groupRunning = false;
  saveUserData();
  if (activeRoomId === 'group') setGroupClosedBar();
}

function processGroupQueue() {
  const g = progress.group;
  const data = window[`day${g.day}Data`];
  const item = data && data.dialogues[g.pos];
  if (!item) { finishGroupDay(); return; }

  if (item.type === 'sys') {
    pushEntry('group', { kind: 'sys', text: item.text });
    afterGroupItem();
  } else if (item.type === 'msg') {
    showTypingIndicator(item.sender, () => {
      pushEntry('group', { kind: 'msg', sender: item.sender, tone: item.tone, text: item.text });
      triggerInAppNotification('TDL : All Group', `${item.sender}: ${item.text}`, item.sender[0], 'group');
      afterGroupItem();
    });
  } else if (item.type === 'img') {
    showTypingIndicator(item.sender, () => {
      pushEntry('group', { kind: 'img', sender: item.sender, tone: item.tone, src: item.src });
      triggerInAppNotification('TDL : All Group', `${item.sender} sent a photo 📷`, item.sender[0], 'group');
      afterGroupItem();
    });
  } else if (item.type === 'card') {
    pushEntry('group', { kind: 'card', key: item.key, snap: item.key === 'player' ? profileSnap() : null });
    afterGroupItem();
  } else if (item.type === 'choices') {
    renderPlayerChoices(item);
  } else if (item.type === 'master_event') {
    if (item.eventName === 'TRIGGER_HEART_SIGNAL') {
      progress.unlocked.heart = true;
      applyUnlockState();
      moveChannelToTop('heart');
      triggerInAppNotification('<Heart Sending>', 'Midnight Heart Signal Activated! 💌', '💌', 'heart');
    }
    afterGroupItem();
  } else {
    afterGroupItem();
  }
}

function scheduleGroupNext() {
  if (speedMode === 3) {
    waitingForTap = true;
    const bar = $('next-tap-bar');
    if (bar) bar.classList.remove('hidden');
  } else {
    later(processGroupQueue, delays[speedMode]);
  }
}

function advanceDialogue() {
  if (!waitingForTap) return;
  waitingForTap = false;
  const bar = $('next-tap-bar');
  if (bar) bar.classList.add('hidden');
  processGroupQueue();
}

function showTypingIndicator(sender, cb) {
  if (speedMode === 3) { cb(); return; }
  const indicator = $('typing-indicator');
  if (indicator) indicator.classList.remove('hidden');
  setTxt('typing-name', `${sender} is typing...`);
  later(() => {
    if (indicator) indicator.classList.add('hidden');
    cb();
  }, Math.min(650, delays[speedMode]));
}

// ---- Choice bar ----
function renderPlayerChoices(choiceItem) {
  const panel = $('group-choices-panel');
  const container = $('choices-container');
  const inputText = $('group-input-text');
  const sendBtn = $('group-send-btn');
  if (!panel || !container || !inputText || !sendBtn) return;

  const activeBtn = 'w-9 h-9 rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition';
  container.innerHTML = '';
  currentSelectedOption = null;

  // 1 ตัวเลือก: คำตอบลอยในช่องพิมพ์ รอกดส่ง
  if (choiceItem.options && choiceItem.options.length === 1) {
    panel.classList.add('hidden');
    currentSelectedOption = choiceItem.options[0];
    inputText.textContent = currentSelectedOption.text;
    inputText.classList.remove('text-gray-400');
    inputText.classList.add('text-gray-800');
    sendBtn.disabled = false;
    sendBtn.className = activeBtn;
    return;
  }

  // หลายตัวเลือก: popup
  resetGroupInputBar();
  (choiceItem.options || []).forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left px-4 py-3 bg-white hover:bg-purple-50 active:bg-purple-100 text-xs text-gray-700 font-medium transition border-b border-gray-100 last:border-0';
    btn.textContent = opt.text;
    btn.onclick = () => {
      currentSelectedOption = opt;
      inputText.textContent = opt.text;
      inputText.classList.remove('text-gray-400');
      inputText.classList.add('text-gray-800');
      panel.classList.add('hidden');
      sendBtn.disabled = false;
      sendBtn.className = activeBtn;
    };
    container.appendChild(btn);
  });

  const inputPreview = $('group-input-preview');
  if (inputPreview) {
    inputPreview.onclick = () => {
      if (choiceItem.options && choiceItem.options.length > 1) panel.classList.toggle('hidden');
    };
  }
  panel.classList.remove('hidden');
}

function submitPlayerChoice() {
  if (!currentSelectedOption) return;
  const opt = currentSelectedOption;
  currentSelectedOption = null;
  resetGroupInputBar();
  selectChoiceOption(opt);
}

function selectChoiceOption(opt) {
  const panel = $('group-choices-panel');
  if (panel) panel.classList.add('hidden');

  if (opt.hearts) {
    Object.entries(opt.hearts).forEach(([charKey, amount]) => {
      if (characterHearts[charKey] !== undefined) characterHearts[charKey] += amount;
    });
  }
  pushEntry('group', { kind: 'user', text: opt.text });   // (pushEntry เซฟแต้มใจไปด้วย)

  if (opt.replySender && opt.replyText) {
    showTypingIndicator(opt.replySender, () => {
      const base = (n) => String(n).split(' (')[0];
      const guyKey = Object.keys(contactsData).find((k) => base(contactsData[k].codeName) === base(opt.replySender) || contactsData[k].realName === opt.replySender);
      const tone = guyKey ? contactsData[guyKey].bgTone : 'bg-purple-200 text-purple-800';
      pushEntry('group', { kind: 'msg', sender: opt.replySender, tone, text: opt.replyText });
      triggerInAppNotification('TDL : All Group', `${opt.replySender}: ${opt.replyText}`, opt.replySender[0], 'group');
      afterGroupItem();
    });
  } else {
    afterGroupItem();
  }
}

// =====================================================================
// ROOM 3 : BOT (Love Counselor) - ต่อวัน
// =====================================================================
const guysList = [
  { key: 'chenxu', name: '1. Chen Xu (Mr. Horizon)' },
  { key: 'xiyao', name: '2. Xia Xiyao (Golden Puppy)' },
  { key: 'wenjun', name: '3. Wen Jun (Velvet Noir)' },
  { key: 'guyan', name: '4. Gu Yan (Black Cat)' }
];

function openConsultantBotChat() {
  enterRoomUI('bot', 'Love Counselor 💬');
  const dot = $('bot-unread-dot');
  if (dot) dot.classList.add('hidden');

  const st = progress.bot[currentDay] || (progress.bot[currentDay] = { stage: 'new' });

  if (st.stage === 'new') {
    removeDayEntries('bot', currentDay);
    rebuildRoom('bot');
    pushEntry('bot', { kind: 'bot', text: `Hello ${esc(playerProfile.name)} 😊 Day ${currentDay} has passed! How are you feeling so far?` });
    pushEntry('bot', { kind: 'bot', text: 'Would you like to know who in the group is secretly impressed by you? Whose affinity shall I secretly check for you?' }, 1000);
    st.stage = 'choose';
    saveUserData();
    later(showBotGuyChoices, 1000);
  } else if (st.stage === 'choose') {
    showBotGuyChoices();
  }
}

function showBotGuyChoices() {
  const panel = $('bot-choices-panel');
  const container = $('bot-choices-container');
  if (!panel || !container) return;
  container.innerHTML = '';
  guysList.forEach((guy) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 transition active:scale-[0.99] font-medium shadow-xs';
    btn.textContent = `I want to check on ${guy.name}`;
    btn.onclick = () => selectBotGuyChoice(guy.key, guy.name);
    container.appendChild(btn);
  });
  panel.classList.remove('hidden');
}

function selectBotGuyChoice(guyKey, guyName) {
  const panel = $('bot-choices-panel');
  if (panel) panel.classList.add('hidden');
  progress.bot[currentDay] = { stage: 'done' };
  pushEntry('bot', { kind: 'user', text: `I want to check on ${guyName}` });

  const score = characterHearts[guyKey] || 0;
  const person = contactsData[guyKey];
  const analysisTexts = {
    chenxu: score >= 1
      ? '"Chen Xu is deeply impressed by your calm and understanding nature. He feels most comfortable talking to you in the group ✨"'
      : '"Chen Xu views you as a polite participant, but hasn\'t fully opened up yet. Try finding moments for deeper conversations."',
    xiyao: score >= 2
      ? '"Xiyao loves your bright energy! Every time you respond in group chat, he smiles without realizing it 😊"'
      : '"Xiyao thinks you\'re a sweet sister/friend, but isn\'t sure if you\'re truly interested in him yet."',
    wenjun: score >= 2
      ? '"Wen Jun senses a subtle magnetic chemistry between you two. He secretly looks out for your replies first 😉"'
      : '"Wen Jun observes you with polite curiosity. He\'s waiting to discover more of your authentic thoughts."',
    guyan: score >= 2
      ? '"Gu Yan, who usually ignores everyone, actually saved your words to memory! He feels you truly understand his world."'
      : '"Gu Yan is still keeping his tsundere defense up. He hasn\'t rejected your messages, just needs a little more time."'
  };

  pushEntry('bot', { kind: 'bot', text: `From my subtle observations... [Affinity Level for ${person.realName}: ❤️ ${score} Points]` }, 800);
  pushEntry('bot', { kind: 'bot', text: analysisTexts[guyKey] }, 2000);
}

// =====================================================================
// ROOM 4 : HEART SENDING - ต่อวัน
// =====================================================================
function openHeartSendingRoom() {
  enterRoomUI('heart', '<Heart Sending>');
  const st = progress.heart[currentDay] || (progress.heart[currentDay] = { stage: 'new', target: null });

  if (st.stage === 'new') {
    removeDayEntries('heart', currentDay);
    rebuildRoom('heart');
    pushEntry('heart', { kind: 'admin', text: `🌙 Welcome to Midnight Heart Signal, ${esc(playerProfile.name)}.` });
    pushEntry('heart', { kind: 'admin', text: 'Another day has passed... Have you grown closer to anyone? Did anyone make you smile today?' }, 1000);
    pushEntry('heart', { kind: 'admin', text: "It's time to send your heart signal tonight. Who would you like to send your heart to?" }, 2000);
    st.stage = 'choose';
    saveUserData();
    later(showHeartGuyChoices, 2000);
  } else if (st.stage === 'choose') {
    showHeartGuyChoices();
  } else if (st.stage === 'message') {
    showHeartInputPanel();
  } else if (st.stage === 'sending') {
    finishHeartSend();
  } else if (st.stage === 'done') {
    showNextDayButton();
  }
}

function setHeartPanelTitle(txt) {
  const p = document.querySelector('#heart-choices-panel p');
  if (p) p.textContent = txt;
}

function showHeartGuyChoices() {
  const panel = $('heart-choices-panel');
  const container = $('heart-choices-container');
  if (!panel || !container) return;
  setHeartPanelTitle('Select who to send your heart to:');
  container.innerHTML = '';
  guysList.forEach((guy) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-2.5 bg-pink-50 hover:bg-pink-100/80 border border-pink-200/80 rounded-xl text-xs text-pink-950 transition active:scale-[0.99] font-medium shadow-xs';
    btn.textContent = `Send heart to ${guy.name}`;
    btn.onclick = () => selectHeartGuyTarget(guy.key, guy.name);
    container.appendChild(btn);
  });
  panel.classList.remove('hidden');
}

function showHeartInputPanel() {
  const inputPanel = $('heart-input-panel');
  if (inputPanel) inputPanel.classList.remove('hidden');
}

function selectHeartGuyTarget(guyKey, guyName) {
  const st = progress.heart[currentDay];
  st.target = guyKey;
  st.stage = 'message';
  const panel = $('heart-choices-panel');
  if (panel) panel.classList.add('hidden');

  pushEntry('heart', { kind: 'user', text: `Sending my heart to ${guyName}` });
  pushEntry('heart', { kind: 'admin', text: 'You can leave a short secret message along with your heart... What would you like to say to him?' }, 800);
  later(showHeartInputPanel, 800);
}

function submitHeartMessageFlow() {
  const inputEl = $('heart-text-input');
  if (!inputEl) return;
  const msgText = inputEl.value.trim();
  if (!msgText) return;
  inputEl.value = '';

  const st = progress.heart[currentDay];
  st.stage = 'sending';
  st.message = msgText;

  const inputPanel = $('heart-input-panel');
  if (inputPanel) inputPanel.classList.add('hidden');
  pushEntry('heart', { kind: 'user', text: `"${msgText}"` });

  setTxt('sweet-popup-title', 'Delivering your feelings...');
  setTxt('sweet-popup-sub', 'Heart Signal delivered successfully ❤️');
  const popup = $('sweet-popup');
  if (popup) popup.classList.remove('hidden');

  later(finishHeartSend, 1800);
}

function pickSecretKey(day) {
  const days = Object.keys(guySecretMessages.chenxu).map((k) => parseInt(k.replace('day', ''), 10)).filter((n) => n <= day);
  return `day${days.length ? Math.max(...days) : 1}`;
}

function finishHeartSend() {
  const popup = $('sweet-popup');
  if (popup) popup.classList.add('hidden');

  const st = progress.heart[currentDay];
  st.stage = 'done';

  const qualified = ['chenxu'];
  if (characterHearts.xiyao >= 2) qualified.push('xiyao');
  if (characterHearts.wenjun >= 2) qualified.push('wenjun');
  if (characterHearts.guyan >= 2) qualified.push('guyan');
  const dayKey = pickSecretKey(currentDay);

  pushEntry('heart', { kind: 'admin', text: 'Your heart and secret note have been delivered ✨' });
  pushEntry('heart', { kind: 'admin', text: "The system has gathered anonymous heart messages from the guys... Let's see who sent you a heart tonight!" }, 1200);
  let t = 2700;
  qualified.forEach((k) => {
    const text = (guySecretMessages[k] && (guySecretMessages[k][dayKey] || guySecretMessages[k].day1)) || 'Thanks for the kind write-up';
    pushEntry('heart', { kind: 'heartcard', text }, t);
    t += 600;
  });
  later(showNextDayButton, t);
}

function showNextDayButton() {
  const panel = $('heart-choices-panel');
  const container = $('heart-choices-container');
  if (!panel || !container) return;
  const next = currentDay + 1;
  setHeartPanelTitle(`Day ${currentDay} complete 🌙`);
  container.innerHTML = '';
  if (next > 30) {
    container.innerHTML = '<p class="text-xs text-pink-900 text-center py-2">You finished all 30 days! 🎉</p>';
  } else {
    const btn = document.createElement('button');
    btn.className = 'w-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-md';
    btn.textContent = `Continue to Day ${next} →`;
    btn.onclick = goToNextDay;
    container.appendChild(btn);
  }
  panel.classList.remove('hidden');
}

function goToNextDay() {
  const next = currentDay + 1;
  if (next > 30) return;
  ensureDayData(next, () => {
    currentDay = next;
    maxUnlockedDay = Math.max(maxUnlockedDay, next);
    progress.dayStartHearts[next] = clone(characterHearts);
    progress.group = { day: next, pos: 0, len: chatLogs.group.length, hearts: clone(characterHearts), done: false };
    groupRunning = false;
    waitingForTap = false;
    saveUserData();
    updateUIFromState();
    checkWeeklyBotTrigger(true);
    const panel = $('heart-choices-panel'); if (panel) panel.classList.add('hidden');
    exitActiveChat();
    openGroupChat();
  }, () => alert(`Day ${next} is not available yet (missing js/stories/day${next}.js).`));
}

// =====================================================================
// NAVIGATION
// =====================================================================
function switchTab(tabKey) {
  exitActiveChat();
  document.querySelectorAll('.tab-page').forEach((p) => p.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.remove('text-fuchsia-500');
    b.classList.add('text-purple-300');
  });

  const targetPage = $(`tab-${tabKey}`);
  const targetBtn = $(`nav-${tabKey}`);
  if (targetPage) targetPage.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.add('text-fuchsia-500');
    targetBtn.classList.remove('text-purple-300');
  }

  const titles = { chats: 'Chats', people: 'People', story: 'Story', my: 'MY', more: 'More' };
  setTxt('header-page-title', titles[tabKey] || 'Chats');
  if (tabKey === 'people') renderPeopleTab();
}

function exitActiveChat() {
  activeRoomId = null;
  ['chat-inside-header', 'room-master', 'room-group', 'room-heart', 'room-bot'].forEach((id) => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
  const mainHeader = $('main-header');
  if (mainHeader) mainHeader.classList.remove('hidden');
  const tabChats = $('tab-chats');
  if (tabChats) tabChats.classList.remove('hidden');
}

function switchMySubTab(subKey) {
  ['subtab-mystory', 'subtab-ending', 'subtab-history'].forEach((id) => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
  document.querySelectorAll('#tab-my button').forEach((b) => {
    b.classList.remove('text-fuchsia-600', 'border-b-2', 'border-fuchsia-500');
    b.classList.add('text-purple-300');
  });
  const sub = $(`subtab-${subKey}`);
  if (sub) sub.classList.remove('hidden');
  const btn = $(`subtab-btn-${subKey}`);
  if (btn) {
    btn.classList.add('text-fuchsia-600', 'border-b-2', 'border-fuchsia-500');
    btn.classList.remove('text-purple-300');
  }
  if (subKey === 'history') renderHistoryTab();
  if (subKey === 'ending') renderEndingBookTab();
}

// =====================================================================
// HISTORY (ย้อนวัน) / RESET
// =====================================================================
function renderHistoryTab() {
  const container = $('history-days-list');
  if (!container) return;
  container.innerHTML = '';
  for (let d = 1; d <= maxUnlockedDay; d++) {
    const isCurrent = d === currentDay;
    const item = document.createElement('div');
    item.className = `p-3 rounded-2xl border ${isCurrent ? 'bg-fuchsia-50 border-fuchsia-300' : 'bg-white border-purple-100'} flex justify-between items-center cursor-pointer hover:border-fuchsia-300 transition shadow-sm`;
    item.onclick = () => jumpToHistoryDay(d);
    item.innerHTML = `<div><span class="text-xs font-bold text-purple-950">Day ${d}</span><p class="text-[10px] text-purple-400">Episode ${d}</p></div><span class="text-xs ${isCurrent ? 'text-fuchsia-600 font-bold' : 'text-purple-300'}">${isCurrent ? 'Restart day ⏱️' : 'Jump ⏱️'}</span>`;
    container.appendChild(item);
  }
}

// ย้อนไปเริ่มวันที่ N ใหม่: เก็บข้อความก่อนวัน N ไว้ ลบตั้งแต่วัน N เป็นต้นไป
function jumpToHistoryDay(dayNum) {
  const ok = confirm(`Restart from Day ${dayNum}?\n\nMessages before Day ${dayNum} are kept.\nMessages from Day ${dayNum} onward will be erased and replayed.`);
  if (!ok) return;

  runToken++;                // ยกเลิก timer เก่าทั้งหมด
  groupRunning = false;
  waitingForTap = false;

  ['group', 'bot', 'heart'].forEach((room) => {
    chatLogs[room] = chatLogs[room].filter((e) => e.day < dayNum);
  });
  Object.keys(progress.heart).forEach((d) => { if (+d >= dayNum) delete progress.heart[d]; });
  Object.keys(progress.bot).forEach((d) => { if (+d >= dayNum) delete progress.bot[d]; });
  Object.keys(progress.dayStartHearts).forEach((d) => { if (+d > dayNum) delete progress.dayStartHearts[d]; });

  characterHearts = clone(progress.dayStartHearts[dayNum] || defaultHearts());
  progress.dayStartHearts[dayNum] = clone(characterHearts);
  progress.group = { day: dayNum, pos: 0, len: chatLogs.group.length, hearts: clone(characterHearts), done: false };

  currentDay = dayNum;
  maxUnlockedDay = dayNum;
  saveUserData();

  rebuildAllStreams();
  checkWeeklyBotTrigger(false);
  switchTab('chats');
  openGroupChat();
}

function restartGameNewLoop() {
  if (!confirm('Restart the game from the very beginning?\nAll chat messages will be erased. Saved Ending Records will be kept.')) return;
  runToken++;
  masterRunning = false;
  groupRunning = false;
  waitingForTap = false;

  currentDay = 1;
  maxUnlockedDay = 1;
  characterHearts = defaultHearts();
  chatLogs = emptyLogs();
  progress = defaultProgress();
  saveUserData();

  rebuildAllStreams();
  checkWeeklyBotTrigger(false);
  alert('Game reset to Day 1!');
  switchTab('chats');
}

// =====================================================================
// ENDING BOOK
// =====================================================================
function renderEndingBookTab() {
  const container = $('ending-records-list');
  if (!container) return;
  if (endingBookRecords.length === 0) {
    container.innerHTML = '<div class="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm text-center py-8"><p class="text-xs text-purple-400">No saved ending records yet.</p><p class="text-[10px] text-purple-300 mt-1">Complete 30 days to save your story!</p></div>';
    return;
  }
  container.innerHTML = '';
  endingBookRecords.forEach((rec, idx) => {
    const item = document.createElement('div');
    item.className = 'p-3.5 bg-white rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between';
    item.innerHTML = `<div><h4 class="text-xs font-bold text-purple-950">${esc(rec.title)}</h4><p class="text-[10px] text-purple-400">Partner: ${esc(rec.partner)} · ${esc(rec.date)}</p></div><button onclick="viewEndingDetail(${idx})" class="text-xs bg-pink-100 text-fuchsia-600 px-3 py-1 rounded-xl font-bold hover:bg-pink-200">View</button>`;
    container.appendChild(item);
  });
}

function saveCurrentEndingRecord() {
  endingBookRecords.push({
    title: `Season Loop #${endingBookRecords.length + 1} Ending`,
    partner: 'Chen Xu',
    date: new Date().toLocaleDateString(),
    storySummary: 'After 30 days in Shanghai, you walked along the Bund with Chen Xu under the quiet night stars.'
  });
  saveUserData();
  renderEndingBookTab();
  alert('Ending story saved to Ending Book!');
}

function viewEndingDetail(idx) {
  const rec = endingBookRecords[idx];
  alert(`📖 [${rec.title}]\n\nPartner: ${rec.partner}\nDate: ${rec.date}\n\n"${rec.storySummary}"`);
}

// =====================================================================
// PEOPLE TAB / CONTACT MODAL
// =====================================================================
function renderPeopleTab() {
  const list = $('people-friends-list');
  if (!list) return;
  list.innerHTML = '';
  setTxt('people-day-status', currentDay === 1 ? 'Day 1: Anonymous Code Names' : 'Day 2+: Profile Unlocked');

  Object.entries(contactsData).forEach(([key, person]) => {
    const displayName = (currentDay === 1 && !person.isSpecial) ? person.codeName : person.realName;
    const subTitle = (currentDay === 1 && !person.isSpecial) ? 'Anonymous Participant' : (person.codeName || person.occupation);

    const item = document.createElement('div');
    item.className = 'p-3.5 px-4 flex items-center space-x-3.5 hover:bg-purple-50/50 transition cursor-pointer';
    item.onclick = () => openContactProfileModal(key);

    let avatarHTML = `<div class="w-11 h-11 rounded-full ${person.bgTone} flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100 shadow-sm">${displayName[0]}</div>`;
    if (currentDay >= 2 && person.avatarUrl) {
      avatarHTML = `<div class="w-11 h-11 rounded-full border border-purple-100 shadow-sm shrink-0 bg-cover bg-center overflow-hidden" style="background-image: url('${person.avatarUrl}')"></div>`;
    }
    item.innerHTML = `
      ${avatarHTML}
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-purple-950 truncate">${displayName}</h4>
        <p class="text-[10px] text-purple-400 mt-0.5 truncate">${subTitle}</p>
      </div>
      <span class="text-[10px] text-purple-300">View &gt;</span>`;
    list.appendChild(item);
  });
}

function openContactProfileModal(key) {
  const person = contactsData[key];
  if (!person) return;
  const modal = $('modal-contact-view');
  const avatarBox = $('modal-profile-avatar');
  const displayName = (currentDay === 1 && !person.isSpecial) ? person.codeName : person.realName;

  setTxt('modal-profile-name', displayName);
  setTxt('modal-profile-sub', `${person.codeName} · ${person.occupation || 'Participant'}`);

  if (avatarBox) {
    if (currentDay >= 2 && person.avatarUrl) {
      avatarBox.style.backgroundImage = `url('${person.avatarUrl}')`;
      avatarBox.textContent = '';
    } else {
      avatarBox.style.backgroundImage = 'none';
      avatarBox.className = `w-32 h-32 rounded-full border-2 border-white/80 shadow-2xl overflow-hidden ${person.bgTone} flex items-center justify-center text-4xl font-bold`;
      avatarBox.textContent = displayName[0];
    }
  }

  const details = $('modal-profile-details');
  if (details) {
    details.innerHTML = `
      <div><strong class="text-purple-300">Occupation:</strong> ${person.occupation || 'N/A'}</div>
      ${person.interests ? `<div><strong class="text-purple-300">Interests:</strong> ${person.interests}</div>` : ''}
      ${person.idealType ? `<div><strong class="text-purple-300">Ideal Type:</strong> ${person.idealType}</div>` : ''}`;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeContactProfileModal() {
  const modal = $('modal-contact-view');
  if (modal) modal.classList.add('hidden');
}

// =====================================================================
// EDIT PROFILE / SETTINGS
// =====================================================================
function openEditMyProfileModal() {
  const setVal = (id, val) => { const el = $(id); if (el) el.value = val; };
  tempAvatarDataUrl = '';
  setVal('edit-name', playerProfile.name);
  setVal('edit-occ', playerProfile.occupation);
  setVal('edit-interests', playerProfile.interests);
  setVal('edit-type', playerProfile.idealType);
  setVal('edit-style', playerProfile.datingStyle);
  const modal = $('modal-edit-profile');
  if (modal) modal.classList.remove('hidden');
}

function closeEditMyProfileModal() {
  const modal = $('modal-edit-profile');
  if (modal) modal.classList.add('hidden');
}

let tempAvatarDataUrl = '';
function handleAvatarFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  readImageFile(file, (dataUrl) => { tempAvatarDataUrl = dataUrl; });
}

function saveMyProfileChanges() {
  if (tempAvatarDataUrl) playerProfile.avatarDataUrl = tempAvatarDataUrl;
  tempAvatarDataUrl = '';
  const getVal = (id) => { const el = $(id); return el ? el.value.trim() : ''; };
  playerProfile.name = getVal('edit-name') || 'Lin XinYue';
  playerProfile.occupation = getVal('edit-occ');
  playerProfile.interests = getVal('edit-interests');
  playerProfile.idealType = getVal('edit-type');
  playerProfile.datingStyle = getVal('edit-style');
  updateUIFromState();
  saveUserData();
  closeEditMyProfileModal();
}

function toggleChatSettingsModal() {
  const modal = $('modal-chat-settings');
  if (modal) modal.classList.toggle('hidden');
}

function changeSpeedModeFromSettings(val) {
  speedMode = parseInt(val, 10);
  const bar = $('next-tap-bar');
  if (speedMode !== 3) {
    if (bar) bar.classList.add('hidden');
    if (waitingForTap) { waitingForTap = false; processGroupQueue(); }
  }
  saveUserData();
}

function applyChatTheme(theme) {
  const bg = $('chat-viewport-bg');
  if (!bg) return;
  const base = 'flex-1 overflow-hidden relative flex flex-col pb-14';
  if (theme === 'purple') bg.className = `${base} bg-[#faf5ff]`;
  if (theme === 'pink') bg.className = `${base} bg-[#fff5f7]`;
  if (theme === 'blue') bg.className = `${base} bg-[#f0f9ff]`;
  if (theme === 'dark') bg.className = `${base} bg-slate-900 text-white`;
}
