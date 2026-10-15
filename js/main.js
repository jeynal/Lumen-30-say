// Global State & Save System
let userEmail = '';
let currentDay = 1;
let maxUnlockedDay = 1;
let dialogueQueue = [];
let masterQueue = [];
let activeRoomId = null;
let currentNotificationRoomTarget = null;

let isWaitingForPlayer = false;
let waitingForTap = false;
let speedMode = 1; // 0=Slow, 1=Normal, 2=Fast, 3=Tap
const delays = [2200, 1200, 500, 0];

let chatOrderCounter = 100;

// Hidden Affinity Points System
let characterHearts = {
  chenxu: 1, // Chen Xu likes player from Day 1
  xiyao: 0,
  wenjun: 0,
  guyan: 0,
  yingyin: 0,
  jiangyue: 0,
  tangmei: 0
};

let playerProfile = {
  name: 'Lin XinYue',
  avatarDataUrl: '',
  age: 23,
  occupation: 'Automation Engineer',
  interests: 'Reading, writing, music',
  idealType: 'Good guy, mature',
  datingStyle: 'Slow burn',
  bestQuality: 'Friendly'
};

let endingBookRecords = [];

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

// Safe DOM initialization
window.addEventListener('DOMContentLoaded', () => {
  const savedEmail = localStorage.getItem('lumen_user_email');
  if (savedEmail) {
    userEmail = savedEmail;
    loadUserData();
    const loginModal = document.getElementById('modal-email-login');
    if (loginModal) loginModal.classList.add('hidden');
  }
});

function submitEmailLogin() {
  const inputEl = document.getElementById('login-email-input');
  if (!inputEl) return;
  const input = inputEl.value.trim();
  if (!input || !input.includes('@')) {
    alert('Please enter a valid email address!');
    return;
  }
  userEmail = input;
  localStorage.setItem('lumen_user_email', userEmail);
  loadUserData();
  const loginModal = document.getElementById('modal-email-login');
  if (loginModal) loginModal.classList.add('hidden');
}

function saveUserData() {
  if (!userEmail) return;
  const storeObj = { currentDay, maxUnlockedDay, playerProfile, endingBookRecords, characterHearts };
  localStorage.setItem(`lumen_save_${userEmail}`, JSON.stringify(storeObj));
}

function loadUserData() {
  const raw = localStorage.getItem(`lumen_save_${userEmail}`);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      currentDay = data.currentDay || 1;
      maxUnlockedDay = data.maxUnlockedDay || 1;
      playerProfile = data.playerProfile || playerProfile;
      endingBookRecords = data.endingBookRecords || [];
      characterHearts = data.characterHearts || characterHearts;
    } catch (e) {
      console.error("Save data parse error:", e);
    }
  }
  updateUIFromState();
  checkWeeklyBotTrigger();
}

function updateUIFromState() {
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('my-player-name', playerProfile.name);
  setTxt('my-player-email', userEmail);
  setTxt('more-user-email-display', userEmail);
  setTxt('people-player-name', `${playerProfile.name} (You)`);
  setTxt('people-player-sub', `${playerProfile.occupation} · Participant`);
  setTxt('my-day-indicator', `${currentDay} / 30`);

  if (playerProfile.avatarDataUrl) {
    const style = `background-image: url('${playerProfile.avatarDataUrl}'); background-size: cover; background-position: center;`;
    ['people-player-avatar', 'my-player-avatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.setAttribute('style', style); el.textContent = ''; }
    });
  }
}

function checkWeeklyBotTrigger() {
  const botChannel = document.getElementById('channel-bot');
  if (!botChannel) return;

  if (currentDay > 1 && currentDay % 7 === 0) {
    botChannel.classList.remove('hidden');
    moveChannelToTop('bot');
    triggerInAppNotification('Love Counselor 💬', `Hello ${playerProfile.name}! Checking in on day ${currentDay}...`, '💬', 'bot');
  } else {
    botChannel.classList.add('hidden');
  }
}

function triggerInAppNotification(title, msg, avatarText = 'M', targetRoom = 'master', avatarImgUrl = '') {
  moveChannelToTop(targetRoom);

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  if (targetRoom === 'master') setTxt('master-last-msg', msg);
  if (targetRoom === 'group') setTxt('group-last-msg', msg);
  if (targetRoom === 'heart') setTxt('heart-last-msg', msg);
  if (targetRoom === 'bot') setTxt('bot-last-msg', msg);

  if (activeRoomId === targetRoom) return;

  currentNotificationRoomTarget = targetRoom;
  const notiBox = document.getElementById('in-app-notification');
  const avatarBox = document.getElementById('noti-avatar');
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

  const notiBox = document.getElementById('in-app-notification');
  if (notiBox) notiBox.classList.add('hidden');
}

function moveChannelToTop(channelKey) {
  chatOrderCounter--;
  const channelEl = document.getElementById(`channel-${channelKey}`);
  if (channelEl) channelEl.style.order = chatOrderCounter;
}

function openMasterChat() {
  activeRoomId = 'master';
  const header = document.getElementById('main-header');
  if (header) header.classList.add('hidden');
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  
  const insideHeader = document.getElementById('chat-inside-header');
  if (insideHeader) insideHeader.classList.remove('hidden');
  
  const title = document.getElementById('active-chat-title');
  if (title) title.textContent = 'LUMEN Master';
  
  const room = document.getElementById('room-master');
  if (room) room.classList.remove('hidden');

  const stream = document.getElementById('master-stream');
  if (stream && stream.children.length === 0) {
    const dayData = window.day1Data;
    if (dayData && dayData.masterDialogues) {
      masterQueue = [...dayData.masterDialogues];
      processMasterQueue();
    }
  }
}

function processMasterQueue() {
  if (masterQueue.length === 0) return;
  const item = masterQueue.shift();
  const stream = document.getElementById('master-stream');

  if (item.type === 'sys') {
    renderSysMsg(stream, item.text);
    setTimeout(processMasterQueue, 800);
  } else if (item.type === 'master_msg') {
    addMasterMsg(item.text);
    triggerInAppNotification('LUMEN Master', item.text, 'M', 'master');
    setTimeout(processMasterQueue, 1200);
  } else if (item.type === 'player_turn') {
    renderMasterInputBar(item.prompt, (text) => {
      addUserBubble(stream, text);
      processMasterQueue();
    });
  } else if (item.type === 'player_avatar_upload') {
    const box = document.getElementById('master-form-box');
    if (box) {
      box.innerHTML = `
        <div class="space-y-2 text-center p-3 bg-purple-50 rounded-2xl border border-purple-100 shadow-xs">
          <label class="text-xs font-semibold text-purple-900 block">Upload Profile Avatar (Optional):</label>
          <input type="file" accept="image/*" onchange="handleMasterAvatarUpload(event)" class="text-xs text-purple-900 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:bg-pink-100 file:text-fuchsia-600">
          <button onclick="skipMasterAvatarUpload()" class="block mx-auto text-[11px] text-purple-400 underline pt-1">Skip this step →</button>
        </div>
      `;
    }
  } else if (item.type === 'player_reg_flow') {
    startMasterRegQuestions(0);
  } else if (item.type === 'card') {
    renderProfileCardInChat('player', 'master-stream');
    setTimeout(processMasterQueue, 1000);
  } else if (item.type === 'master_event') {
    if (item.eventName === 'OPEN_GROUP_CHANNEL') {
      const msg = document.getElementById('master-last-msg');
      if (msg) msg.textContent = 'TDL All Group Unlocked!';
      const grp = document.getElementById('channel-group');
      if (grp) grp.classList.remove('hidden');
      moveChannelToTop('group');
      
      triggerInAppNotification('TDL : All Group', 'Lounge Activated! Tap to join.', 'G', 'group');

      const box = document.getElementById('master-form-box');
      if (box) box.innerHTML = `<button onclick="exitActiveChat(); openGroupChat();" class="w-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-md uppercase tracking-wider">Enter TDL All Group Lounge →</button>`;
      saveUserData();
    }
  }
}

function skipMasterAvatarUpload() {
  const box = document.getElementById('master-form-box');
  if (box) box.innerHTML = '';
  processMasterQueue();
}

function handleMasterAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    playerProfile.avatarDataUrl = e.target.result;
    updateUIFromState();
    addUserBubble(document.getElementById('master-stream'), '📷 Avatar photo uploaded!');
    const box = document.getElementById('master-form-box');
    if (box) box.innerHTML = '';
    processMasterQueue();
  };
  reader.readAsDataURL(file);
}

const regQuestions = [
  { key: 'name', label: 'Name / Nickname:', placeholder: 'e.g. Lin XinYue' },
  { key: 'age', label: 'Age:', placeholder: 'e.g. 23' },
  { key: 'occupation', label: 'Occupation:', placeholder: 'e.g. Automation Engineer' },
  { key: 'interests', label: 'Interests & Hobbies:', placeholder: 'e.g. Reading, writing' },
  { key: 'idealType', label: 'Ideal Type:', placeholder: 'e.g. Good guy, mature' },
  { key: 'datingStyle', label: 'Dating Style:', placeholder: 'e.g. Slow burn' }
];

function startMasterRegQuestions(idx) {
  if (idx >= regQuestions.length) {
    const box = document.getElementById('master-form-box');
    if (box) box.innerHTML = '';
    processMasterQueue();
    return;
  }
  const q = regQuestions[idx];
  addMasterMsg(`[Profile Detail ${idx+1}/6] ${q.label}`);
  renderMasterInputBar(q.placeholder, (text) => {
    playerProfile[q.key] = text;
    updateUIFromState();
    addUserBubble(document.getElementById('master-stream'), text);
    startMasterRegQuestions(idx + 1);
  });
}

function renderMasterInputBar(placeholder, cb) {
  const box = document.getElementById('master-form-box');
  if (!box) return;
  box.innerHTML = `
    <div class="flex gap-2">
      <input type="text" id="master-input-field" class="flex-1 bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2 text-xs text-purple-950 focus:outline-none" placeholder="${placeholder}">
      <button id="master-send-btn" class="bg-gradient-to-r from-fuchsia-400 to-pink-400 px-4 py-2 rounded-xl text-xs font-bold text-white">Send</button>
    </div>
  `;
  const field = document.getElementById('master-input-field');
  const btn = document.getElementById('master-send-btn');
  if (field) field.focus();
  if (btn) {
    btn.onclick = () => {
      const val = field.value.trim();
      if (!val) return;
      box.innerHTML = '';
      cb(val);
    };
  }
}

function createPolaroidCardHTML(cardData, isPlayer = false) {
  const nameAge = isPlayer ? `${playerProfile.name}, ${playerProfile.age}` : `${cardData.realName}, ${cardData.age}`;
  const occ = isPlayer ? playerProfile.occupation : cardData.occupation;
  const interests = isPlayer ? playerProfile.interests : cardData.interests;
  const type = isPlayer ? playerProfile.idealType : cardData.idealType;
  const dating = isPlayer ? playerProfile.datingStyle : cardData.datingStyle;
  const best = isPlayer ? playerProfile.bestQuality : cardData.bestQuality;

  let photoStyle = `background-color: #e9d5ff;`;
  if (isPlayer && playerProfile.avatarDataUrl) {
    photoStyle = `background-image: url('${playerProfile.avatarDataUrl}'); background-size: cover; background-position: center;`;
  } else if (!isPlayer && cardData.avatarUrl) {
    photoStyle = `background-image: url('${cardData.avatarUrl}'); background-size: cover; background-position: center;`;
  }

  return `
    <div class="bg-[#f7f5f0] text-purple-950 rounded-xl p-4 shadow-md border border-purple-200/80 max-w-xs mx-auto my-3 font-typewriter">
      <div class="text-[10px] text-purple-400 border-b border-purple-200/60 pb-1.5 mb-2.5 flex justify-between">
        <span>Day ${currentDay}. Profile : ${nameAge.split(',')[0]}</span>
        <span class="tracking-widest font-sans font-bold text-pink-400">30 DAYS TO LOVE</span>
      </div>
      <div class="bg-white p-2.5 rounded-lg border border-purple-100 shadow-sm mb-3">
        <div class="aspect-[4/3] w-full rounded overflow-hidden shadow-inner flex flex-col justify-end p-2 ${!playerProfile.avatarDataUrl && isPlayer ? 'bg-purple-200 flex items-center justify-center text-xs font-sans text-purple-700' : ''}" style="${photoStyle}">
          ${!playerProfile.avatarDataUrl && isPlayer ? '📷 Your Photo' : ''}
        </div>
        <div class="mt-2 text-[9px] text-purple-400 font-sans tracking-widest flex justify-between uppercase">
          <span>30 DAYS TO LOVE</span>
          <span>THE AFTERIMAGE PARADOX</span>
        </div>
      </div>
      <div class="space-y-2 text-xs text-purple-950 font-sans">
        <div class="border-b border-purple-200/60 pb-1 flex justify-between"><strong class="font-typewriter text-purple-800">Name/Age:</strong> <span>${nameAge}</span></div>
        <div class="border-b border-purple-200/60 pb-1 flex justify-between"><strong class="font-typewriter text-purple-800">Occupation:</strong> <span>${occ}</span></div>
        <div class="border-b border-purple-200/60 pb-1"><strong class="font-typewriter text-purple-800 block mb-0.5">Interests:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${interests}</div></div>
        <div class="border-b border-purple-200/60 pb-1"><strong class="font-typewriter text-purple-800 block mb-0.5">Type:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${type}</div></div>
        <div class="border-b border-purple-200/60 pb-1"><strong class="font-typewriter text-purple-800 block mb-0.5">Dating Style:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${dating}</div></div>
        <div><strong class="font-typewriter text-purple-800 block mb-0.5">Best Quality:</strong> <div class="bg-purple-100/70 p-1.5 rounded text-[11px]">${best}</div></div>
      </div>
    </div>
  `;
}

function renderProfileCardInChat(key, targetStreamId = 'group-stream') {
  const stream = document.getElementById(targetStreamId);
  if (!stream) return;
  const b = document.createElement('div');
  b.className = "chat-bubble my-2";
  b.innerHTML = (key === 'player') ? createPolaroidCardHTML(null, true) : createPolaroidCardHTML(contactsData[key], false);
  stream.appendChild(b);
  stream.scrollTop = stream.scrollHeight;
}

function openGroupChat() {
  activeRoomId = 'group';
  const header = document.getElementById('main-header');
  if (header) header.classList.add('hidden');
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  
  const insideHeader = document.getElementById('chat-inside-header');
  if (insideHeader) insideHeader.classList.remove('hidden');
  
  const title = document.getElementById('active-chat-title');
  if (title) title.textContent = 'TDL : All Group';
  
  const room = document.getElementById('room-group');
  if (room) room.classList.remove('hidden');
  
  const dot = document.getElementById('group-unread-dot');
  if (dot) dot.classList.add('hidden');

  if (dialogueQueue.length === 0) {
    const dayData = window[`day${currentDay}Data`];
    if (dayData) {
      dialogueQueue = [...dayData.dialogues];
      processGroupQueue();
    }
  }
}

function processGroupQueue() {
  if (dialogueQueue.length === 0) return;
  const item = dialogueQueue.shift();

  if (item.type === 'sys') {
    renderGroupSysMsg(item.text);
    scheduleGroupNext();
  } else if (item.type === 'msg') {
    showTypingIndicator(item.sender, () => {
      renderGroupMsgBubble(item.sender, item.tone, item.text);
      triggerInAppNotification('TDL : All Group', `${item.sender}: ${item.text}`, item.sender[0], 'group');
      scheduleGroupNext();
    });
  } else if (item.type === 'img') {
    showTypingIndicator(item.sender, () => {
      renderGroupImgBubble(item.sender, item.tone, item.src);
      triggerInAppNotification('TDL : All Group', `${item.sender} sent a photo 📷`, item.sender[0], 'group');
      scheduleGroupNext();
    });
  } else if (item.type === 'card') {
    renderProfileCardInChat(item.key, 'group-stream');
    scheduleGroupNext();
  } else if (item.type === 'choices') {
    renderPlayerChoices(item);
  } else if (item.type === 'master_event') {
    if (item.eventName === 'TRIGGER_HEART_SIGNAL') {
      const channel = document.getElementById('channel-heart');
      if (channel) channel.classList.remove('hidden');
      moveChannelToTop('heart');
      triggerInAppNotification('<Heart Sending>', 'Midnight Heart Signal Activated! 💌', '💌', 'heart');
      saveUserData();
    }
  }
}

// --- PICKA STYLE INPUT & CHOICE SYSTEM ---
let currentSelectedOption = null;

function renderPlayerChoices(choiceItem) {
  const panel = document.getElementById('group-choices-panel');
  const container = document.getElementById('choices-container');
  const inputText = document.getElementById('group-input-text');
  const sendBtn = document.getElementById('group-send-btn');
  
  if (!panel || !container || !inputText || !sendBtn) return;

  container.innerHTML = '';
  currentSelectedOption = null;

  // 1. Case: Single Fixed Option (คำตอบลอยในช่องส่งทันที)[span_2](start_span)[span_2](end_span)
  if (choiceItem.options && choiceItem.options.length === 1) {
    panel.classList.add('hidden');
    currentSelectedOption = choiceItem.options[0];
    
    inputText.textContent = currentSelectedOption.text;
    inputText.classList.remove('text-gray-400');
    inputText.classList.add('text-gray-800');

    sendBtn.disabled = false;
    sendBtn.className = "w-9 h-9 rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition";
    return;
  }

  // 2. Case: Multiple Choices (มีหลายช้อยส์ให้เลือกใน Popup)
  inputText.textContent = "Please select an option...";
  inputText.classList.add('text-gray-400');
  inputText.classList.remove('text-gray-800');
  sendBtn.disabled = true;
  sendBtn.className = "w-9 h-9 rounded-full bg-gray-300 text-white flex items-center justify-center shrink-0 transition-colors";

  if (choiceItem.options) {
    choiceItem.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = "w-full text-left px-4 py-3 bg-white hover:bg-purple-50 active:bg-purple-100 text-xs text-gray-700 font-medium transition border-b border-gray-100 last:border-0";
      btn.textContent = opt.text;
      btn.onclick = () => {
        currentSelectedOption = opt;
        inputText.textContent = opt.text;
        inputText.classList.remove('text-gray-400');
        inputText.classList.add('text-gray-800');

        panel.classList.add('hidden');
        sendBtn.disabled = false;
        sendBtn.className = "w-9 h-9 rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition";
      };
      container.appendChild(btn);
    });
  }

  const inputPreview = document.getElementById('group-input-preview');
  if (inputPreview) {
    inputPreview.onclick = () => {
      if (choiceItem.options && choiceItem.options.length > 1) {
        panel.classList.toggle('hidden');
      }
    };
  }

  panel.classList.remove('hidden');
}

function submitPlayerChoice() {
  if (!currentSelectedOption) return;

  const inputText = document.getElementById('group-input-text');
  const sendBtn = document.getElementById('group-send-btn');
  const opt = currentSelectedOption;

  if (inputText) {
    inputText.textContent = "Please select an option...";
    inputText.classList.add('text-gray-400');
    inputText.classList.remove('text-gray-800');
  }
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.className = "w-9 h-9 rounded-full bg-gray-300 text-white flex items-center justify-center shrink-0 transition-colors";
  }
  
  currentSelectedOption = null;
  selectChoiceOption(opt);
}

function selectChoiceOption(optionObj) {
  const panel = document.getElementById('group-choices-panel');
  if (panel) panel.classList.add('hidden');

  addUserBubble(document.getElementById('group-stream'), optionObj.text);

  if (optionObj.hearts) {
    Object.entries(optionObj.hearts).forEach(([charKey, amount]) => {
      if (characterHearts[charKey] !== undefined) {
        characterHearts[charKey] += amount;
      }
    });
    saveUserData();
  }

  if (optionObj.replySender && optionObj.replyText) {
    showTypingIndicator(optionObj.replySender, () => {
      const guyKey = Object.keys(contactsData).find(k => contactsData[k].codeName === optionObj.replySender || contactsData[k].realName === optionObj.replySender);
      const tone = guyKey ? contactsData[guyKey].bgTone : 'bg-purple-200 text-purple-800';
      
      renderGroupMsgBubble(optionObj.replySender, tone, optionObj.replyText);
      triggerInAppNotification('TDL : All Group', `${optionObj.replySender}: ${optionObj.replyText}`, optionObj.replySender[0], 'group');
      
      scheduleGroupNext();
    });
  } else {
    scheduleGroupNext();
  }
}

function openConsultantBotChat() {
  activeRoomId = 'bot';
  const header = document.getElementById('main-header');
  if (header) header.classList.add('hidden');
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  
  const insideHeader = document.getElementById('chat-inside-header');
  if (insideHeader) insideHeader.classList.remove('hidden');
  
  const title = document.getElementById('active-chat-title');
  if (title) title.textContent = 'Love Counselor 💬';
  
  const room = document.getElementById('room-bot');
  if (room) room.classList.remove('hidden');

  const dot = document.getElementById('bot-unread-dot');
  if (dot) dot.classList.add('hidden');

  const stream = document.getElementById('bot-stream');
  if (stream && stream.children.length === 0) {
    addBotBubble(`Hello ${playerProfile.name} 😊 Day ${currentDay} has passed! How are you feeling so far?`);
    setTimeout(() => {
      addBotBubble(`Would you like to know who in the group is secretly impressioned by you? Whose affinity shall I secretly check for you?`);
      showBotGuyChoices();
    }, 1000);
  }
}

function addBotBubble(txt) {
  const stream = document.getElementById('bot-stream');
  if (!stream) return;
  const b = document.createElement('div');
  b.className = "chat-bubble flex items-start space-x-2.5 my-2";
  b.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 border border-emerald-100 shadow-sm">💬</div>
    <div class="space-y-0.5 max-w-[80%]">
      <span class="text-[11px] font-semibold text-emerald-600 ml-1">Love Counselor</span>
      <div class="bg-white border border-emerald-100 text-purple-950 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm">${txt}</div>
    </div>
  `;
  stream.appendChild(b);
  stream.scrollTop = stream.scrollHeight;
  
  const lastMsgEl = document.getElementById('bot-last-msg');
  if (lastMsgEl) lastMsgEl.textContent = `Love Counselor: ${txt}`;
}

function showBotGuyChoices() {
  const panel = document.getElementById('bot-choices-panel');
  const container = document.getElementById('bot-choices-container');
  if (!panel || !container) return;

  container.innerHTML = '';
  const guysList = [
    { key: 'chenxu', name: '1. Chen Xu (Mr. Horizon)' },
    { key: 'xiyao', name: '2. Xia Xiyao (Golden Puppy)' },
    { key: 'wenjun', name: '3. Wen Jun (Velvet Noir)' },
    { key: 'guyan', name: '4. Gu Yan (Black Cat)' }
  ];

  guysList.forEach(guy => {
    const btn = document.createElement('button');
    btn.className = "w-full text-left p-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 transition active:scale-[0.99] font-medium shadow-xs";
    btn.textContent = `I want to check on ${guy.name}`;
    btn.onclick = () => selectBotGuyChoice(guy.key, guy.name);
    container.appendChild(btn);
  });

  panel.classList.remove('hidden');
}

function selectBotGuyChoice(guyKey, guyName) {
  const panel = document.getElementById('bot-choices-panel');
  if (panel) panel.classList.add('hidden');
  addUserBubble(document.getElementById('bot-stream'), `I want to check on ${guyName}`);

  const score = characterHearts[guyKey] || 0;
  const person = contactsData[guyKey];

  const analysisTexts = {
    chenxu: score >= 1 
      ? `"Chen Xu is deeply impressed by your calm and understanding nature. He feels most comfortable talking to you in the group ✨"` 
      : `"Chen Xu views you as a polite participant, but hasn't fully opened up yet. Try finding moments for deeper conversations."`,
    xiyao: score >= 2 
      ? `"Xiyao loves your bright energy! Every time you respond in group chat, he smiles without realizing it 😊"` 
      : `"Xiyao thinks you're a sweet sister/friend, but isn't sure if you're truly interested in him yet."`,
    wenjun: score >= 2 
      ? `"Wen Jun senses a subtle magnetic chemistry between you two. He secretly looks out for your replies first 😉"` 
      : `"Wen Jun observes you with polite curiosity. He's waiting to discover more of your authentic thoughts."`,
    guyan: score >= 2 
      ? `"Gu Yan, who usually ignores everyone, actually saved your words to memory! He feels you truly understand his world."` 
      : `"Gu Yan is still keeping his tsundere defense up. He hasn't rejected your messages, just needs a little more time."`
  };

  setTimeout(() => {
    addBotBubble(`From my subtle observations... [Affinity Level for ${person.realName}: ❤️ ${score} Points]`);
    setTimeout(() => {
      addBotBubble(analysisTexts[guyKey]);
    }, 1200);
  }, 800);
}

let selectedHeartTargetKey = null;

function openHeartSendingRoom() {
  activeRoomId = 'heart';
  const header = document.getElementById('main-header');
  if (header) header.classList.add('hidden');
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  
  const insideHeader = document.getElementById('chat-inside-header');
  if (insideHeader) insideHeader.classList.remove('hidden');
  
  const title = document.getElementById('active-chat-title');
  if (title) title.textContent = '<Heart Sending>';
  
  const room = document.getElementById('room-heart');
  if (room) room.classList.remove('hidden');

  const stream = document.getElementById('heart-stream');
  if (stream && stream.children.length === 0) {
    addHeartAdminMsg(`🌙 Welcome to Midnight Heart Signal, ${playerProfile.name}.`);
    setTimeout(() => {
      addHeartAdminMsg(`Another day has passed... Have you grown closer to anyone? Did anyone make you smile today?`);
      setTimeout(() => {
        addHeartAdminMsg(`It's time to send your heart signal tonight. Who would you like to send your heart to?`);
        showHeartGuyChoices();
      }, 1000);
    }, 1000);
  }
}

function addHeartAdminMsg(txt) {
  const stream = document.getElementById('heart-stream');
  if (!stream) return;
  const b = document.createElement('div');
  b.className = "chat-bubble flex items-start space-x-2.5 my-2";
  b.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-300 to-pink-300 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 border border-pink-100 shadow-sm">💌</div>
    <div class="space-y-0.5 max-w-[80%]">
      <span class="text-[11px] font-semibold text-pink-500 ml-1">Heart Manager</span>
      <div class="bg-white border border-pink-100 text-purple-950 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm">${txt}</div>
    </div>
  `;
  stream.appendChild(b);
  stream.scrollTop = stream.scrollHeight;
  const msg = document.getElementById('heart-last-msg');
  if (msg) msg.textContent = `Heart Manager: ${txt}`;
}

function showHeartGuyChoices() {
  const panel = document.getElementById('heart-choices-panel');
  const container = document.getElementById('heart-choices-container');
  if (!panel || !container) return;

  container.innerHTML = '';
  const guysList = [
    { key: 'chenxu', name: '1. Chen Xu (Mr. Horizon)' },
    { key: 'xiyao', name: '2. Xia Xiyao (Golden Puppy)' },
    { key: 'wenjun', name: '3. Wen Jun (Velvet Noir)' },
    { key: 'guyan', name: '4. Gu Yan (Black Cat)' }
  ];

  guysList.forEach(guy => {
    const btn = document.createElement('button');
    btn.className = "w-full text-left p-2.5 bg-pink-50 hover:bg-pink-100/80 border border-pink-200/80 rounded-xl text-xs text-pink-950 transition active:scale-[0.99] font-medium shadow-xs";
    btn.textContent = `Send heart to ${guy.name}`;
    btn.onclick = () => selectHeartGuyTarget(guy.key, guy.name);
    container.appendChild(btn);
  });

  panel.classList.remove('hidden');
}

function selectHeartGuyTarget(guyKey, guyName) {
  selectedHeartTargetKey = guyKey;
  const panel = document.getElementById('heart-choices-panel');
  if (panel) panel.classList.add('hidden');
  addUserBubble(document.getElementById('heart-stream'), `Sending my heart to ${guyName}`);

  setTimeout(() => {
    addHeartAdminMsg(`You can leave a short secret message along with your heart... What would you like to say to him?`);
    const inputPanel = document.getElementById('heart-input-panel');
    if (inputPanel) inputPanel.classList.remove('hidden');
  }, 800);
}

function submitHeartMessageFlow() {
  const inputEl = document.getElementById('heart-text-input');
  if (!inputEl) return;
  const msgText = inputEl.value.trim();
  if (!msgText) return;

  const inputPanel = document.getElementById('heart-input-panel');
  if (inputPanel) inputPanel.classList.add('hidden');
  
  addUserBubble(document.getElementById('heart-stream'), `"${msgText}"`);

  const popup = document.getElementById('sweet-popup');
  const pTitle = document.getElementById('sweet-popup-title');
  const pSub = document.getElementById('sweet-popup-sub');
  
  if (pTitle) pTitle.textContent = 'Delivering your feelings...';
  if (pSub) pSub.textContent = 'Heart Signal delivered successfully ❤️';
  if (popup) popup.classList.remove('hidden');

  setTimeout(() => {
    if (popup) popup.classList.add('hidden');

    addHeartAdminMsg(`Your heart and secret note have been delivered ✨`);
    
    setTimeout(() => {
      addHeartAdminMsg(`The system has gathered anonymous heart messages from the guys... Let's see who sent you a heart tonight!`);
      
      setTimeout(() => {
        renderReceivedHeartCards();
      }, 1500);
    }, 1200);

  }, 1800);
}

function renderReceivedHeartCards() {
  const stream = document.getElementById('heart-stream');
  if (!stream) return;
  
  let qualifiedGuys = ['chenxu'];

  if (characterHearts.xiyao >= 2) qualifiedGuys.push('xiyao');
  if (characterHearts.wenjun >= 2) qualifiedGuys.push('wenjun');
  if (characterHearts.guyan >= 2) qualifiedGuys.push('guyan');

  const dayKey = `day${currentDay}` in guySecretMessages.chenxu ? `day${currentDay}` : 'day1';

  qualifiedGuys.forEach((guyKey) => {
    const cardText = guySecretMessages[guyKey][dayKey] || "Thanks for the kind write-up";

    const cardBubble = document.createElement('div');
    cardBubble.className = "chat-bubble my-3 flex justify-center";
    cardBubble.innerHTML = `
      <div class="heart-card-bg text-red-900 rounded-2xl p-4 shadow-lg border border-pink-200/80 w-full max-w-xs font-typewriter relative overflow-hidden">
        <div class="text-[9px] text-red-800/80 font-sans tracking-widest font-bold flex justify-between border-b border-red-900/10 pb-1 mb-2 uppercase">
          <span>30 DAYS TO LOVE</span>
          <span>THE AFTERIMAGE PARADOX</span>
        </div>
        <div class="flex items-center space-x-1.5 text-red-900 font-bold text-sm mb-2">
          <span>❤️</span>
          <span class="tracking-wide">Heart Message</span>
        </div>
        <div class="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-white/60 shadow-inner text-center my-2">
          <p class="text-xs font-semibold text-slate-800 leading-relaxed font-sans">"${cardText}"</p>
        </div>
        <div class="flex justify-between items-end mt-3 pt-1 border-t border-red-900/10">
          <div class="text-[10px] tracking-tighter opacity-70">||||||||||||||||||||</div>
          <span class="font-serif italic font-bold text-xs opacity-80">TDL</span>
        </div>
      </div>
    `;
    stream.appendChild(cardBubble);
  });

  stream.scrollTop = stream.scrollHeight;
  saveUserData();
}

function scheduleGroupNext() {
  if (speedMode === 3) {
    waitingForTap = true;
    const bar = document.getElementById('next-tap-bar');
    if (bar) bar.classList.remove('hidden');
  } else {
    setTimeout(processGroupQueue, delays[speedMode]);
  }
}

function advanceDialogue() {
  if (waitingForTap) { waitingForTap = false; processGroupQueue(); }
}

function showTypingIndicator(sender, cb) {
  if (speedMode === 3) { cb(); return; }
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.classList.remove('hidden');
  const name = document.getElementById('typing-name');
  if (name) name.textContent = `${sender} is typing...`;
  setTimeout(() => { 
    if (indicator) indicator.classList.add('hidden'); 
    cb(); 
  }, Math.min(650, delays[speedMode]));
}

function renderGroupSysMsg(txt) {
  renderSysMsg(document.getElementById('group-stream'), txt);
}

function renderSysMsg(container, txt) {
  if (!container) return;
  const b = document.createElement('div');
  b.className = "flex justify-center my-2 chat-bubble";
  b.innerHTML = `<div class="bg-purple-100/60 text-purple-600 border border-purple-200/50 px-3.5 py-1.5 rounded-full text-[11px] max-w-[90%] text-center">${txt}</div>`;
  container.appendChild(b);
  container.scrollTop = container.scrollHeight;
}

function renderGroupMsgBubble(sender, tone, text) {
  const stream = document.getElementById('group-stream');
  if (!stream) return;
  const b = document.createElement('div');
  b.className = "chat-bubble flex items-start space-x-2.5";
  b.innerHTML = `
    <div class="w-9 h-9 rounded-full ${tone} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-purple-100 shadow-sm">${sender[0]}</div>
    <div class="space-y-0.5 max-w-[80%]">
      <span class="text-[11px] font-semibold text-purple-400 ml-1">${sender}</span>
      <div class="bg-white border border-purple-100 text-purple-950 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm">${text}</div>
    </div>
  `;
  stream.appendChild(b);
  stream.scrollTop = stream.scrollHeight;
  const msg = document.getElementById('group-last-msg');
  if (msg) msg.textContent = `${sender}: ${text}`;
}

function renderGroupImgBubble(sender, tone, imgSrc) {
  const stream = document.getElementById('group-stream');
  if (!stream) return;
  const b = document.createElement('div');
  b.className = "chat-bubble flex items-start space-x-2.5";
  b.innerHTML = `
    <div class="w-9 h-9 rounded-full ${tone} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-purple-100 shadow-sm">${sender[0]}</div>
    <div class="space-y-0.5 max-w-[75%]">
      <span class="text-[11px] font-semibold text-purple-400 ml-1">${sender}</span>
      <div class="bg-white border border-purple-100 p-1.5 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
        <img src="${imgSrc}" class="rounded-xl w-full h-auto object-cover max-h-60" alt="Chat attachment" onclick="window.open('${imgSrc}', '_blank')">
      </div>
    </div>
  `;
  stream.appendChild(b);
  stream.scrollTop = stream.scrollHeight;
  const msg = document.getElementById('group-last-msg');
  if (msg) msg.textContent = `${sender}: [Photo 📷]`;
}

function addMasterMsg(txt) {
  const stream = document.getElementById('master-stream');
  if (!stream) return;
  const b = document.createElement('div');
  b.className = "chat-bubble flex items-start space-x-2";
  b.innerHTML = `<div class="w-7 h-7 rounded-full bg-gradient-to-tr from-fuchsia-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">M</div><div class="bg-white border border-purple-100 text-purple-900 px-3.5 py-2 rounded-2xl rounded-tl-none text-xs max-w-[85%] shadow-sm">${txt}</div>`;
  stream.appendChild(b);
  stream.scrollTop = stream.scrollHeight;
}

function addUserBubble(container, txt) {
  if (!container) return;
  const b = document.createElement('div');
  b.className = "chat-bubble flex justify-end";
  b.innerHTML = `<div class="bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white px-3.5 py-2 rounded-2xl rounded-tr-none text-xs max-w-[80%] shadow-sm">${txt}</div>`;
  container.appendChild(b);
  container.scrollTop = container.scrollHeight;
}

function switchTab(tabKey) {
  exitActiveChat();
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('text-fuchsia-500');
    b.classList.add('text-purple-300');
  });

  const targetPage = document.getElementById(`tab-${tabKey}`);
  const targetBtn = document.getElementById(`nav-${tabKey}`);
  if (targetPage) targetPage.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.add('text-fuchsia-500');
    targetBtn.classList.remove('text-purple-300');
  }

  const titles = { chats: 'Chats', people: 'People', story: 'Story', my: 'MY', more: 'More' };
  const hTitle = document.getElementById('header-page-title');
  if (hTitle) hTitle.textContent = titles[tabKey] || 'Chats';

  if (tabKey === 'people') renderPeopleTab();
}

function exitActiveChat() {
  activeRoomId = null;
  ['chat-inside-header', 'room-master', 'room-group', 'room-heart', 'room-bot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const mainHeader = document.getElementById('main-header');
  if (mainHeader) mainHeader.classList.remove('hidden');
  const tabChats = document.getElementById('tab-chats');
  if (tabChats) tabChats.classList.remove('hidden');
}

function switchMySubTab(subKey) {
  ['subtab-mystory', 'subtab-ending', 'subtab-history'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  document.querySelectorAll('#tab-my button').forEach(b => {
    b.classList.remove('text-fuchsia-600', 'border-b-2', 'border-fuchsia-500');
    b.classList.add('text-purple-300');
  });

  const sub = document.getElementById(`subtab-${subKey}`);
  if (sub) sub.classList.remove('hidden');
  const btn = document.getElementById(`subtab-btn-${subKey}`);
  if (btn) {
    btn.classList.add('text-fuchsia-600', 'border-b-2', 'border-fuchsia-500');
    btn.classList.remove('text-purple-300');
  }

  if (subKey === 'history') renderHistoryTab();
  if (subKey === 'ending') renderEndingBookTab();
}

function renderHistoryTab() {
  const container = document.getElementById('history-days-list');
  if (!container) return;
  container.innerHTML = '';
  for (let d = 1; d <= maxUnlockedDay; d++) {
    const isCurrent = (d === currentDay);
    const item = document.createElement('div');
    item.className = `p-3 rounded-2xl border ${isCurrent ? 'bg-fuchsia-50 border-fuchsia-300' : 'bg-white border-purple-100'} flex justify-between items-center cursor-pointer hover:border-fuchsia-300 transition shadow-sm`;
    item.onclick = () => jumpToHistoryDay(d);
    item.innerHTML = `<div><span class="text-xs font-bold text-purple-950">Day ${d}</span><p class="text-[10px] text-purple-400">Episode ${d}</p></div><span class="text-xs ${isCurrent ? 'text-fuchsia-600 font-bold' : 'text-purple-300'}">${isCurrent ? 'Playing' : 'Jump ⏱️'}</span>`;
    container.appendChild(item);
  }
}

function jumpToHistoryDay(dayNum) {
  currentDay = dayNum;
  const ind = document.getElementById('my-day-indicator');
  if (ind) ind.textContent = `${currentDay} / 30`;
  saveUserData();
  checkWeeklyBotTrigger();
  alert(`Jumped back to Day ${dayNum}!`);
  switchTab('chats');
  openGroupChat();
}

function renderEndingBookTab() {
  const container = document.getElementById('ending-records-list');
  if (!container) return;
  if (endingBookRecords.length === 0) {
    container.innerHTML = `<div class="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm text-center py-8"><p class="text-xs text-purple-400">No saved ending records yet.</p><p class="text-[10px] text-purple-300 mt-1">Complete 30 days to save your story!</p></div>`;
    return;
  }
  container.innerHTML = '';
  endingBookRecords.forEach((rec, idx) => {
    const item = document.createElement('div');
    item.className = "p-3.5 bg-white rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between";
    item.innerHTML = `<div><h4 class="text-xs font-bold text-purple-950">${rec.title}</h4><p class="text-[10px] text-purple-400">Partner: ${rec.partner} · ${rec.date}</p></div><button onclick="viewEndingDetail(${idx})" class="text-xs bg-pink-100 text-fuchsia-600 px-3 py-1 rounded-xl font-bold hover:bg-pink-200">View</button>`;
    container.appendChild(item);
  });
}

function saveCurrentEndingRecord() {
  const newRecord = {
    title: `Season Loop #${endingBookRecords.length + 1} Ending`,
    partner: 'Chen Xu',
    date: new Date().toLocaleDateString(),
    storySummary: 'After 30 days in Shanghai, you walked along the Bund with Chen Xu under the quiet night stars.'
  };
  endingBookRecords.push(newRecord);
  saveUserData();
  renderEndingBookTab();
  alert('Ending story saved to Ending Book!');
}

function viewEndingDetail(idx) {
  const rec = endingBookRecords[idx];
  alert(`📖 [${rec.title}]\n\nPartner: ${rec.partner}\nDate: ${rec.date}\n\n"${rec.storySummary}"`);
}

function restartGameNewLoop() {
  if (confirm('Are you sure you want to restart the game from Day 1? Saved Ending Records will be kept.')) {
    currentDay = 1;
    maxUnlockedDay = 1;
    saveUserData();
    updateUIFromState();
    alert('Game reset to Day 1!');
    switchTab('chats');
  }
}

function renderPeopleTab() {
  const list = document.getElementById('people-friends-list');
  if (!list) return;
  list.innerHTML = '';
  const status = document.getElementById('people-day-status');
  if (status) status.textContent = currentDay === 1 ? 'Day 1: Anonymous Code Names' : 'Day 2+: Profile Unlocked';

  Object.entries(contactsData).forEach(([key, person]) => {
    const displayName = (currentDay === 1 && !person.isSpecial) ? person.codeName : person.realName;
    const subTitle = (currentDay === 1 && !person.isSpecial) ? 'Anonymous Participant' : (person.codeName || person.occupation);

    const item = document.createElement('div');
    item.className = "p-3.5 px-4 flex items-center space-x-3.5 hover:bg-purple-50/50 transition cursor-pointer";
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
      <span class="text-[10px] text-purple-300">View &gt;</span>
    `;
    list.appendChild(item);
  });
}

function openContactProfileModal(key) {
  const person = contactsData[key];
  if (!person) return;
  const modal = document.getElementById('modal-contact-view');
  const avatarBox = document.getElementById('modal-profile-avatar');
  const displayName = (currentDay === 1 && !person.isSpecial) ? person.codeName : person.realName;

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
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

  const details = document.getElementById('modal-profile-details');
  if (details) {
    details.innerHTML = `
      <div><strong class="text-purple-300">Occupation:</strong> ${person.occupation || 'N/A'}</div>
      ${person.interests ? `<div><strong class="text-purple-300">Interests:</strong> ${person.interests}</div>` : ''}
      ${person.idealType ? `<div><strong class="text-purple-300">Ideal Type:</strong> ${person.idealType}</div>` : ''}
    `;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeContactProfileModal() {
  const modal = document.getElementById('modal-contact-view');
  if (modal) modal.classList.add('hidden');
}

function openEditMyProfileModal() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('edit-name', playerProfile.name);
  setVal('edit-occ', playerProfile.occupation);
  setVal('edit-interests', playerProfile.interests);
  setVal('edit-type', playerProfile.idealType);
  setVal('edit-style', playerProfile.datingStyle);
  const modal = document.getElementById('modal-edit-profile');
  if (modal) modal.classList.remove('hidden');
}

function closeEditMyProfileModal() {
  const modal = document.getElementById('modal-edit-profile');
  if (modal) modal.classList.add('hidden');
}

let tempAvatarDataUrl = '';
function handleAvatarFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) { tempAvatarDataUrl = e.target.result; };
  reader.readAsDataURL(file);
}

function saveMyProfileChanges() {
  if (tempAvatarDataUrl) playerProfile.avatarDataUrl = tempAvatarDataUrl;
  const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
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
  const modal = document.getElementById('modal-chat-settings');
  if (modal) modal.classList.toggle('hidden');
}

function changeSpeedModeFromSettings(val) {
  speedMode = parseInt(val);
  const bar = document.getElementById('next-tap-bar');
  if (bar) bar.classList.toggle('hidden', speedMode !== 3);
}

function applyChatTheme(theme) {
  const bg = document.getElementById('chat-viewport-bg');
  if (!bg) return;
  if (theme === 'purple') bg.className = 'flex-1 overflow-hidden relative flex flex-col bg-[#faf5ff] pb-14';
  if (theme === 'pink') bg.className = 'flex-1 overflow-hidden relative flex flex-col bg-[#fff5f7] pb-14';
  if (theme === 'blue') bg.className = 'flex-1 overflow-hidden relative flex flex-col bg-[#f0f9ff] pb-14';
  if (theme === 'dark') bg.className = 'flex-1 overflow-hidden relative flex flex-col bg-slate-900 text-white pb-14';
}

function openSwitchAccountModal() {
  const input = document.getElementById('login-email-input');
  if (input) input.value = '';
  const modal = document.getElementById('modal-email-login');
  if (modal) modal.classList.remove('hidden');
}
