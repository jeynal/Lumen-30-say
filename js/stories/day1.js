window.day1Data = {
  day: 1,
  title: "Shanghai First Night",
  
  // 1. บทสนทนาในห้อง Master (ต้อนรับ ถามความรู้สึก ยืนยันโปรไฟล์ สรุปการ์ด และบอกกฎ)
  masterDialogues: [
    { type: 'sys', text: 'The chat room is opening now' },
    { type: 'master_msg', text: 'Congratulations and welcome, Participant #8! 🎉 We are thrilled to have you here in our dating program ✨ Lumen season 1✨.' },
    { type: 'master_msg', text: 'How are you feeling right now? Excited or nervous about spending the next 30 days with us?' },
    { type: 'player_turn', prompt: 'Tell Producer how you feel...' },

    { type: 'master_msg', text: 'Haha, that reaction is totally understandable! Everyone is holding their breath right now.' },
    { type: 'master_msg', text: 'Before we unlock the main lounge, let\'s quickly confirm your Official Profile Card.' },
    { type: 'master_msg', text: 'Please upload your profile photo first.' },
    { type: 'player_avatar_upload' },

    { type: 'master_msg', text: 'Great photo! Now please answer a few quick questions to complete your card.' },
    { type: 'player_reg_flow' },

    { type: 'master_msg', text: 'All details recorded! Here is your official Polaroid Profile Card preview:' },
    { type: 'card', key: 'player' },

    { type: 'master_msg', text: 'Does everything look perfect to you?' },
    { type: 'master_confirm_card' }, // ระบบวนลูปตรวจ/แก้ไขการ์ด


    { type: 'master_msg', text: 'Awesome! Now, please keep these key rules in mind:' },
    { type: 'master_msg', text: '📌 [RULES OF DAY 1]\n1. All participants must use anonymous Code Names.\n2. Do NOT reveal your real name or exact age on Day 1.\n3. Tomorrow (Day 2), everyone\'s true profiles & photos will be officially unveiled!' },
    { type: 'master_msg', text: '🔔 The TDL All Group lounge is now OPEN! Tap below to join.' },
    { type: 'master_event', eventName: 'OPEN_GROUP_CHANNEL' }
  ],

  // 2. บทสนทนาในห้อง TDL All Group (รองรับระบบ Picka Choice Bar)
  dialogues: [
    { type: 'sys', text: '📢 TDL : All Group Lounge Activated (8 Participants Online)' },
    { type: 'msg', sender: 'Golden Puppy', tone: 'bg-sky-200 text-sky-800', text: 'Hey everyone!! Finally the room opened 🎉 Welcome to Shanghai!' },
    { type: 'msg', sender: 'Mochi', tone: 'bg-purple-200 text-purple-800', text: 'hiiii everyone!! OMG so many people here 😮 So nervous!' },
    { type: 'msg', sender: 'Scarlet', tone: 'bg-pink-200 text-pink-800', text: 'Hello all. Nice to meet everyone on this first night.' },
    { type: 'msg', sender: 'Black Cat', tone: 'bg-slate-700 text-slate-200', text: '...so many notification dings already. It’s kinda loud.' },
    { type: 'msg', sender: 'Mr. Horizon', tone: 'bg-purple-200 text-purple-800', text: 'Good evening everyone. Hope nobody had a rough flight arriving in Shanghai.' },
    { type: 'msg', sender: 'Velvet Noir', tone: 'bg-indigo-950 text-purple-200', text: 'Evening. The night breeze in the city is quite gentle today.' },
    { type: 'msg', sender: 'Luna', tone: 'bg-fuchsia-200 text-fuchsia-800', text: 'Hello! Producer said we must keep our real identity hidden today. Super mysterious!' },

    // จุดเลือกทักทายครั้งแรก (คำตอบจะไปขึ้นในช่องพิมพ์ด้านล่างพร้อมให้กดส่ง)
    {
      type: 'choices',
      options: [
        {
          text: 'Just walked in',
          hearts: { chenxu: 1 },
          replySender: 'Golden Puppy',
          replyText: 'Haha yay! Participant #8 is here! Love your vibe already!'
        },
        {
          text: 'Nice to meet everyone! Excited for this night ✨',
          hearts: { xiyao: 1 },
          replySender: 'Mochi',
          replyText: 'Yayyy! Welcome welcome! Glad you made it safely!'
        }
      ]
    },

    { type: 'msg', sender: 'Mr. Horizon', tone: 'bg-purple-200 text-purple-800', text: 'Yes, remember the Producer rules for Day 1: we are all using Code Names today.' },
    { type: 'msg', sender: 'Mr. Horizon', tone: 'bg-purple-200 text-purple-800', text: 'Tomorrow on Day 2, there will be an official identity guessing event where our real profiles will be revealed!' },
    { type: 'msg', sender: 'Mochi', tone: 'bg-purple-200 text-purple-800', text: 'Ooooh I can\'t wait for Day 2!! I want to guess who is behind these nicknames so badly!' },
    { type: 'msg', sender: 'Velvet Noir', tone: 'bg-indigo-950 text-purple-200', text: 'Patience makes the reveal sweeter, doesn\'t it?' },
    { type: 'msg', sender: 'Black Cat', tone: 'bg-slate-700 text-slate-200', text: '...Don\'t expect too much.' },

    // จุดเลือกตอบก่อนปิดห้อง (Single Fixed Choice)
    {
      type: 'choices',
      options: [
        {
          text: 'I can\'t wait to see everyone\'s real profile tomorrow too!',
          hearts: { wenjun: 1, guyan: 1 },
          replySender: 'Velvet Noir',
          replyText: 'Have a sweet dream then. See you all tomorrow under the Shanghai sun.'
        }
      ]
    },

    { type: 'sys', text: '🔒 23:55 PM: TDL All Group lounge has officially closed for Day 1.' },
    { type: 'master_event', eventName: 'TRIGGER_HEART_SIGNAL' }
  ]
};
