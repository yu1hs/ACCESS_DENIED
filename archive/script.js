// ==========================================
// HEE_ARCHIVE v3.0 - 7天进程 + 四结局系统
// 结局基于：对话选择 + 资料收集 + 玩家倾向
// ==========================================

// ========== 全局状态 ==========
let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    endings: [],
    familiarity: 0,
    day: 1,
    messagesToday: 0,
    maxMessages: 5,
    dayGreetingSent: false,
    viewedPages: [],
    fileTriggers: {},
    // 结局条件记录（基于选择和收集）
    lateNightCount: 0,           // 深夜访问次数
    pageReadCount: {},           // 各页面阅读次数
    favClickCount: 0,            // FAVORITES点击次数
    photoRepairedCount: 0,       // 照片修复数量
    audioPlayCount: 0,           // 音频播放次数
    profileAnswer: null,         // PROFILE填写内容
    // 对话倾向（影响结局）
    chosenOptions: [],           // 记录玩家选择的关键选项
    comfortLevel: 0,             // 安慰/关心倾向
    curiosityLevel: 0,           // 好奇/探索倾向
    stayLevel: 0,                // 陪伴/停留倾向
    // 结局触发标记
    endingsTriggered: []
};

let startTime = Date.now();
let isChatActive = false;

// ========== 音效 ==========
const SFX = {
    ctx: null,
    init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
    play(f, t, d, v = 0.04) {
        if (!this.ctx) return;
        try {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = t; o.frequency.value = f;
            g.gain.setValueAtTime(v, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
            o.connect(g); g.connect(this.ctx.destination);
            o.start(); o.stop(this.ctx.currentTime + d);
        } catch(e) {}
    },
    click() { this.play(800, 'sine', 0.04, 0.03); },
    hover() { this.play(500, 'sine', 0.03, 0.02); },
    msg() { this.play(380, 'triangle', 0.07, 0.04); },
    unlock() { this.play(523, 'sine', 0.1, 0.05); setTimeout(() => this.play(659, 'sine', 0.1, 0.05), 70); setTimeout(() => this.play(784, 'sine', 0.12, 0.07), 140); },
    shutdown() { [400,300,200,100].forEach((f,i) => setTimeout(() => this.play(f, 'sawtooth', 0.2, 0.03), i * 150)); },
    boot() { [150,250,400,600].forEach((f,i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.04), i * 200)); },
    ending() { [523,587,659,698,784,880,988,1047].forEach((f,i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.07), i * 120)); },
    denied() { this.play(80, 'sawtooth', 0.25, 0.04); }
};

// ========== 每日配置 ==========
const dayConfig = {
    1: { maxMessages: 5, targetFam: 15, unlock: null },
    2: { maxMessages: 6, targetFam: 30, unlock: 'profile' },
    3: { maxMessages: 6, targetFam: 45, unlock: 'photo' },
    4: { maxMessages: 7, targetFam: 60, unlock: 'audio' },
    5: { maxMessages: 7, targetFam: 75, unlock: 'log' },
    6: { maxMessages: 8, targetFam: 90, unlock: 'favorites' },
    7: { maxMessages: 8, targetFam: 100, unlock: null }
};

// ========== 结局条件检查 ==========
function checkEndings() {
    // 结局一：月光（需要：深夜访问≥5次 + 选择过"晚上安静""我也失眠"等选项）
    const hasMoonlightChoice = currentUser.chosenOptions.includes('night_lover') || currentUser.chosenOptions.includes('insomnia');
    if (currentUser.lateNightCount >= 4 && hasMoonlightChoice && !currentUser.endings.includes('moonlight')) {
        triggerEnding('moonlight');
    }
    
    // 结局二：读者（需要：解锁所有页面 + 阅读TRASH + 阅读LOG + 听过AUDIO + 修复过照片）
    const allPagesUnlocked = ['profile','photo','audio','log','favorites'].every(p => currentUser.unlockedPages.includes(p));
    const hasReadTrash = currentUser.viewedPages.includes('trash');
    const hasReadLog = currentUser.viewedPages.includes('log');
    const hasListenedAudio = currentUser.audioPlayCount >= 2;
    const hasRepairedPhoto = currentUser.photoRepairedCount >= 1;
    if (allPagesUnlocked && hasReadTrash && hasReadLog && hasListenedAudio && hasRepairedPhoto && !currentUser.endings.includes('reader')) {
        triggerEnding('reader');
    }
    
    // 结局三：共鸣（需要：FAV点击≥10 + 选择过音乐/电影相关选项 + 写过PROFILE）
    const hasMusicChoice = currentUser.chosenOptions.includes('music_lover') || currentUser.chosenOptions.includes('same_taste');
    const hasProfile = !!currentUser.profileAnswer;
    if (currentUser.favClickCount >= 8 && hasMusicChoice && hasProfile && !currentUser.endings.includes('resonance')) {
        triggerEnding('resonance');
    }
    
    // 结局四：痕迹（需要：选择过"我会一直来""我不会走"等陪伴选项 + 亲密度100% + 第7天）
    const hasStayChoice = currentUser.chosenOptions.includes('will_stay') || currentUser.chosenOptions.includes('promise');
    if (hasStayChoice && currentUser.familiarity >= 100 && currentUser.day >= 7 && !currentUser.endings.includes('trace')) {
        triggerEnding('trace');
    }
}

function triggerEnding(type) {
    if (currentUser.endings.includes(type)) return;
    
    const endings = {
        moonlight: { 
            title: '🌙 月光', 
            message: '你总是在深夜来。我也是。我们在同一个月亮下面。',
            dialog: '你每次都这么晚。\n\n凌晨的时候，想法会比较真实。\n谢谢你在这些时间里来这边。'
        },
        reader: { 
            title: '📖 读者', 
            message: '你读完了每一个字。谢谢你看完。',
            dialog: '你都看完了。\n\n很少有人会这样。\n谢谢你不是谢谢你来这里。是谢谢你认真看了。'
        },
        resonance: { 
            title: '🎵 共鸣', 
            message: '你喜欢的和我一样吗。如果是你，好像也没关系。',
            dialog: '你点了很多次。\n\n我在想你是不是和我喜欢一样的东西。\n如果是你...好像也没关系。'
        },
        trace: { 
            title: '🕯️ 痕迹', 
            message: '你找到的不是一个人的秘密。而是一个人愿意留下来的痕迹。',
            dialog: '你找到了。\n不是一个人的秘密。\n是一个人愿意留下来的痕迹。'
        }
    };
    
    const ending = endings[type];
    currentUser.endings.push(type);
    saveUserData();
    SFX.ending();
    
    showChatMessage('system', `✨ 结局解锁：${ending.title} ✨`, true);
    showChatMessage('heeseung', ending.dialog);
    
    if (type === 'trace') {
        setTimeout(() => {
            showChatMessage('heeseung', '谢谢。不是谢谢你来这里。是谢谢你待了那么久。');
        }, 2000);
        setTimeout(() => {
            showChatMessage('system', '🦌 感谢你的陪伴。\n—— Lee Heeseung', true);
        }, 4000);
    }
    
    // 记录结局
    if (!currentUser.endingsTriggered) currentUser.endingsTriggered = [];
    currentUser.endingsTriggered.push(type);
    saveUserData();
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    SFX.init();
    loadUserData();
    updateUI();
    setupListeners();
    updateDayDisplay();
    startAutoSave();
    trackLateNight();

    console.log('%c🦌 HEE v3.0 · 7天进程 + 四结局（选择驱动）', 'color: #ffd966; font-size: 14px;');
    console.log('%c🌙月光 📖读者 🎵共鸣 🕯️痕迹', 'color: #888; font-size: 11px;');
    console.log('%c结局由你的选择和收集决定', 'color: #666; font-size: 10px;');

    setTimeout(() => {
        showChatWindow();
        triggerDayStart();
    }, 2000);
});

// 追踪深夜访问
function trackLateNight() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 5) {
        currentUser.lateNightCount++;
        saveUserData();
    }
}

// ========== 存储 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_v3');
    if (saved) {
        try { currentUser = JSON.parse(saved); } catch(e) { resetUser(); }
        currentUser.visitCount++;
    } else {
        resetUser();
    }
    applyDayConfig();
    saveUserData();
    updateStatusBar();
}

function resetUser() {
    currentUser = {
        visitCount: 1,
        firstVisit: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        unlockedPages: [],
        conversations: [],
        endings: [],
        familiarity: 0,
        day: 1,
        messagesToday: 0,
        maxMessages: 5,
        dayGreetingSent: false,
        viewedPages: [],
        fileTriggers: {},
        lateNightCount: 0,
        pageReadCount: {},
        favClickCount: 0,
        photoRepairedCount: 0,
        audioPlayCount: 0,
        profileAnswer: null,
        chosenOptions: [],
        comfortLevel: 0,
        curiosityLevel: 0,
        stayLevel: 0,
        endingsTriggered: []
    };
}

function applyDayConfig() {
    const cfg = dayConfig[currentUser.day] || dayConfig[7];
    currentUser.maxMessages = cfg.maxMessages;
}

function saveUserData() {
    currentUser.lastLogin = new Date().toISOString();
    try { localStorage.setItem('hee_archive_v3', JSON.stringify(currentUser)); } catch(e) {}
}

function startAutoSave() { setInterval(saveUserData, 30000); }

function canTalk() { return currentUser.messagesToday < currentUser.maxMessages; }

function usedTalk() {
    currentUser.messagesToday++;
    currentUser.dayGreetingSent = true;
    saveUserData();
    updateDayDisplay();
}

// ========== 关机推进 ==========
function shutdownAndAdvance() {
    if (canTalk() && currentUser.dayGreetingSent) {
        showNotification('⚠️ 今天还有对话没完成。再待一会儿吧。', 2500);
        return false;
    }
    if (currentUser.day >= 7) {
        showNotification('✨ 第七天已经结束。感谢你的陪伴。', 3000);
        return false;
    }

    SFX.shutdown();
    
    const overlay = document.createElement('div');
    overlay.id = 'shutdownOverlay';
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;opacity:0;transition:opacity 1.5s;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:'Courier New',monospace;color:#444;`;
    overlay.innerHTML = `<div style="font-size:24px;margin-bottom:16px;">⬤</div><div style="font-size:12px;">正在关机...</div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');

    setTimeout(() => {
        currentUser.day++;
        currentUser.messagesToday = 0;
        currentUser.dayGreetingSent = false;
        applyDayConfig();
        
        const cfg = dayConfig[currentUser.day];
        if (cfg && cfg.unlock && !currentUser.unlockedPages.includes(cfg.unlock)) {
            currentUser.unlockedPages.push(cfg.unlock);
            currentUser.fileTriggers[cfg.unlock] = true;
            SFX.unlock();
            showChatMessage('system', `🔓 ${cfg.unlock.toUpperCase()} 已解锁！`, true);
        }
        
        saveUserData();
        SFX.boot();
        
        setTimeout(() => {
            overlay.innerHTML = `<div style="font-size:48px;margin-bottom:12px;">☀️</div><div style="font-size:18px;color:#ffd966;margin-bottom:8px;">第 ${currentUser.day} 天</div><div style="font-size:11px;color:#666;">${getDayLabel()}</div>`;
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 1500);
                const msgs = document.getElementById('chatMessages');
                const opts = document.getElementById('chatOptions');
                if (msgs) msgs.innerHTML = '';
                if (opts) opts.innerHTML = '';
                showChatWindow();
                updateDayDisplay();
                updateUI();
                setTimeout(() => triggerDayStart(), 1000);
            }, 2000);
        }, 800);
    }, 1800);
    return true;
}

function getDayLabel() {
    const labels = { 1:'第一天 · 初遇', 2:'第二天 · 试探', 3:'第三天 · 习惯', 4:'第四天 · 靠近', 5:'第五天 · 信任', 6:'第六天 · 依赖', 7:'第七天 · 痕迹' };
    return labels[currentUser.day] || `第 ${currentUser.day} 天`;
}

// ========== 每日对话树（带倾向标记）==========
const dialogueTree = {
    1: {
        greeting: "……你怎么进来的。",
        conversations: [
            { question: "你是谁？", answer: "一个快要被删干净的人。", fam: 8, tendency: 'curiosity' },
            { question: "这是你的网站吗？", answer: "曾经是。现在不是了。", fam: 5, tendency: 'curiosity' },
            { question: "为什么还留着？", answer: "……忘了删。也可能是……不想删。", fam: 6, tendency: 'curiosity' },
            { question: "你平时都做什么？", answer: "练习。听歌。发呆。", fam: 5, tendency: 'comfort' },
            { question: "你看起来很累", answer: "……你看出来了。", fam: 8, tendency: 'comfort', optionKey: 'care' }
        ]
    },
    2: {
        greeting: "你又来了。第二天了。",
        conversations: [
            { question: "你在等我吗？", answer: "……没有。只是记得。", fam: 8, tendency: 'stay', optionKey: 'expect' },
            { question: "你昨天睡得好吗？", answer: "还好。你呢。", fam: 6, tendency: 'comfort' },
            { question: "你不觉得一个人很孤单吗？", answer: "孤单。但习惯了。", fam: 8, tendency: 'comfort', optionKey: 'lonely' },
            { question: "你为什么总是晚上在？", answer: "晚上安静。没人会打扰。", fam: 6, tendency: 'night', optionKey: 'night_lover' },
            { question: "你相信有人会一直来吗？", answer: "不相信。但……你在。", fam: 10, tendency: 'stay', optionKey: 'will_stay' }
        ]
    },
    3: {
        greeting: "第三天。你比我想的有耐心。",
        conversations: [
            { question: "你有什么梦想吗？", answer: "梦想？……以前有。现在……不知道。", fam: 7, tendency: 'curiosity' },
            { question: "你累吗？", answer: "有点。但习惯了。", fam: 6, tendency: 'comfort' },
            { question: "你害怕什么？", answer: "害怕……被忘记。", fam: 10, tendency: 'stay', optionKey: 'fear_forget' },
            { question: "你听过最安慰的话是什么？", answer: "「辛苦了」。虽然很少听到。", fam: 7, tendency: 'comfort' },
            { question: "我会一直来的。", answer: "……别说这种话。我会当真的。", fam: 12, tendency: 'stay', optionKey: 'promise' }
        ]
    },
    4: {
        greeting: "第四天了。我开始习惯这个时间了。",
        conversations: [
            { question: "习惯是好事吗？", answer: "不知道。但至少今天不是空的。", fam: 7, tendency: 'stay' },
            { question: "你最近在想什么？", answer: "想你明天会不会来。", fam: 10, tendency: 'stay', optionKey: 'think_you' },
            { question: "你有想分享的事吗？", answer: "今天看到一片很好看的云。但没人可以说。", fam: 8, tendency: 'comfort' },
            { question: "睡不着吗？", answer: "嗯。你也是？", fam: 8, tendency: 'night', optionKey: 'insomnia' },
            { question: "我想了解你。", answer: "了解我……为什么。", fam: 12, tendency: 'curiosity' }
        ]
    },
    5: {
        greeting: "第五天。你知道我在等你吗。",
        conversations: [
            { question: "你想说什么？", answer: "想问你……你是什么样的人。", fam: 8, tendency: 'curiosity' },
            { question: "你相信缘分吗？", answer: "以前不信。现在……不确定。", fam: 8, tendency: 'stay' },
            { question: "你喜欢现在的自己吗？", answer: "不喜欢。但也没办法。", fam: 8, tendency: 'comfort' },
            { question: "我不觉得你不好。", answer: "……你是第一个这么说的。", fam: 12, tendency: 'comfort', optionKey: 'accept' },
            { question: "你希望我每天来吗？", answer: "希望。但不想说出来。", fam: 10, tendency: 'stay', optionKey: 'hope_come' }
        ]
    },
    6: {
        greeting: "第六天。我想了很多要和你说的话。但现在忘了。",
        conversations: [
            { question: "你重要吗？", answer: "对你来说……重要吗。", fam: 10, tendency: 'stay' },
            { question: "你害怕失去什么？", answer: "害怕失去……你。", fam: 12, tendency: 'stay', optionKey: 'fear_lose' },
            { question: "你愿意相信我吗？", answer: "愿意。虽然害怕。", fam: 10, tendency: 'stay', optionKey: 'trust' },
            { question: "你喜欢什么音乐？", answer: "安静的。凌晨听的那种。", fam: 8, tendency: 'music', optionKey: 'music_lover' },
            { question: "我们喜欢的东西好像差不多", answer: "是吗。那……挺好的。", fam: 10, tendency: 'music', optionKey: 'same_taste' }
        ]
    },
    7: {
        greeting: "第七天。最后一个晚上了。……也可能是最后一个。",
        conversations: [
            { question: "你会记得我吗？", answer: "会。你会忘了我吗。", fam: 12, tendency: 'stay' },
            { question: "你得到了什么？", answer: "得到了你。……就够了。", fam: 15, tendency: 'stay' },
            { question: "你有什么想对我说的？", answer: "谢谢。不是谢谢你来这里。是谢谢你待了那么久。", fam: 15, tendency: 'stay' },
            { question: "（输入你的回答）", answer: null, fam: 0, freeInput: true }
        ]
    }
};

// 处理选项倾向
function handleTendency(tendency, optionKey) {
    if (tendency === 'comfort') currentUser.comfortLevel++;
    if (tendency === 'curiosity') currentUser.curiosityLevel++;
    if (tendency === 'stay') currentUser.stayLevel++;
    if (optionKey && !currentUser.chosenOptions.includes(optionKey)) {
        currentUser.chosenOptions.push(optionKey);
    }
    saveUserData();
}

// ========== 每日开始对话 ==========
function triggerDayStart() {
    if (currentUser.dayGreetingSent) return;
    if (!canTalk()) return;
    
    usedTalk();
    const dayData = dialogueTree[currentUser.day] || dialogueTree[7];
    
    showChatMessage('heeseung', dayData.greeting);
    
    setTimeout(() => {
        showDailyOptions();
    }, 1200);
}

function showDailyOptions() {
    if (!canTalk()) {
        showChatMessage('system', '⏳ 今天聊了很多了。关机休息吧，明天再来。', true);
        showShutdownOption();
        return;
    }
    
    const dayData = dialogueTree[currentUser.day] || dialogueTree[7];
    const remaining = dayData.conversations.filter(c => 
        !currentUser.conversations.some(conv => conv.question === c.question && conv.day === currentUser.day)
    );
    
    if (remaining.length === 0) {
        showChatMessage('heeseung', '……今天就到这里吧。');
        setTimeout(() => showShutdownOption(), 1000);
        return;
    }
    
    // 随机选3-4个未聊过的话题
    const shuffled = [...remaining];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const optionsToShow = shuffled.slice(0, Math.min(4, shuffled.length));
    
    const options = optionsToShow.map(conv => ({
        text: conv.question,
        action: () => {
            if (!canTalk()) return;
            usedTalk();
            SFX.click();
            showChatMessage('user', conv.question);
            
            // 处理倾向
            handleTendency(conv.tendency, conv.optionKey);
            
            setTimeout(() => {
                if (conv.answer) {
                    showChatMessage('heeseung', conv.answer);
                    increaseFamiliarity(conv.fam);
                } else if (conv.freeInput) {
                    triggerFreeInput();
                    return;
                }
                currentUser.conversations.push({ question: conv.question, day: currentUser.day, time: Date.now() });
                saveUserData();
                checkEndings();  // 每次对话后检查结局
                setTimeout(() => showDailyOptions(), 800);
            }, 800);
        }
    }));
    
    showChatOptions(options);
}

function triggerFreeInput() {
    const chatOptions = document.getElementById('chatOptions');
    const inputArea = document.getElementById('chatInputArea');
    if (chatOptions) chatOptions.innerHTML = '';
    if (inputArea) {
        inputArea.classList.remove('hidden');
        const inp = document.getElementById('chatInput');
        if (inp) { inp.placeholder = '输入你的回答……'; inp.value = ''; inp.focus(); }
    }

    const send = document.getElementById('chatSend');
    const inp = document.getElementById('chatInput');
    if (send && inp) {
        const handler = () => {
            const text = inp.value.trim();
            if (!text) return;
            SFX.msg();
            showChatMessage('user', text);
            inp.value = '';
            if (inputArea) inputArea.classList.add('hidden');

            setTimeout(() => {
                showChatMessage('heeseung', '谢谢你。\n这是我能给的……最后的东西。');
                increaseFamiliarity(20);
                saveUserData();
                checkEndings();
                setTimeout(() => {
                    if (!currentUser.endings.includes('trace')) {
                        triggerEnding('trace');
                    }
                }, 1500);
            }, 1200);

            send.removeEventListener('click', handler);
        };
        send.replaceWith(send.cloneNode(true));
        document.getElementById('chatSend').addEventListener('click', handler);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
    }
}

function increaseFamiliarity(amount) {
    currentUser.familiarity = Math.min(100, (currentUser.familiarity || 0) + amount);
    saveUserData();
    updateFamiliarityDisplay();
}

function showShutdownOption() {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    container.innerHTML = '';
    
    const btn = document.createElement('button');
    btn.className = 'chat-option-btn';
    btn.style.cssText = 'border-color: #ffd966; color: #ffd966; width: 100%; text-align: center; font-size: 13px; padding: 10px;';
    btn.textContent = '🔌 关机（推进到下一天）';
    btn.addEventListener('mouseenter', () => SFX.hover());
    btn.addEventListener('click', () => {
        SFX.click();
        container.innerHTML = '';
        shutdownAndAdvance();
    });
    container.appendChild(btn);
}

// ========== UI 函数 ==========
function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (sender !== 'system') SFX.msg();
    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;
    if (content?.includes('\n')) {
        content.split('\n').forEach((line, i) => {
            if (i > 0) div.appendChild(document.createElement('br'));
            div.appendChild(document.createTextNode(line));
        });
    } else {
        div.textContent = content;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showChatOptions(options) {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    container.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.textContent = opt.text;
        btn.addEventListener('mouseenter', () => SFX.hover());
        btn.addEventListener('click', () => {
            container.innerHTML = '';
            if (opt.action) opt.action();
        });
        container.appendChild(btn);
    });
}

function showChatWindow() {
    const w = document.getElementById('chatWindow');
    if (w) { w.classList.remove('hidden'); isChatActive = true; }
}

function updateUI() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (currentUser.unlockedPages?.includes(page)) {
            item.classList.remove('locked');
        }
    });
    updateStatusBar();
}

function updateDayDisplay() {
    const el = document.getElementById('dayDisplay') || createDayDisplay();
    const remain = currentUser.maxMessages - currentUser.messagesToday;
    el.textContent = `📅 第 ${currentUser.day}/7 天 · 剩余 ${remain} 次对话`;
    el.style.color = remain <= 0 ? '#ff6666' : '#ffd966';
}

function createDayDisplay() {
    const footer = document.querySelector('.footer-left');
    if (footer) {
        const span = document.createElement('span');
        span.id = 'dayDisplay';
        span.style.cssText = 'margin-left: 16px; font-size: 11px;';
        footer.appendChild(span);
        return span;
    }
    return null;
}

function updateStatusBar() {
    const lc = document.getElementById('loginCount');
    const ll = document.getElementById('lastLogin');
    if (lc) lc.textContent = `访问: ${currentUser.visitCount}`;
    if (ll && currentUser.firstVisit) ll.textContent = `首次: ${new Date(currentUser.firstVisit).toLocaleDateString()}`;
    updateFamiliarityDisplay();
    updateOnlineStatus();
    
    // 显示已获得的结局
    if (currentUser.endings.length > 0) {
        const endingsStr = currentUser.endings.map(e => {
            if (e === 'moonlight') return '🌙';
            if (e === 'reader') return '📖';
            if (e === 'resonance') return '🎵';
            if (e === 'trace') return '🕯️';
            return '';
        }).join(' ');
        const endingsEl = document.getElementById('endingsDisplay') || createEndingsDisplay();
        if (endingsEl) endingsEl.textContent = `🏆 ${endingsStr}`;
    }
}

function createEndingsDisplay() {
    const footer = document.querySelector('.footer-right');
    if (footer) {
        const span = document.createElement('span');
        span.id = 'endingsDisplay';
        span.style.cssText = 'margin-left: 16px; font-size: 11px; color: #ffd966;';
        footer.appendChild(span);
        return span;
    }
    return null;
}

function updateFamiliarityDisplay() {
    const f = currentUser.familiarity || 0;
    let text, emoji, color;
    if (f < 15) { text = '陌生人'; emoji = '❄️'; color = '#666'; }
    else if (f < 30) { text = '似乎见过'; emoji = '🌫️'; color = '#7a7a6e'; }
    else if (f < 45) { text = '有点熟悉'; emoji = '🌱'; color = '#8a8a6e'; }
    else if (f < 60) { text = '开始了解'; emoji = '📖'; color = '#aa9e6e'; }
    else if (f < 75) { text = '愿意分享'; emoji = '💭'; color = '#ccaa6e'; }
    else if (f < 90) { text = '已经认识'; emoji = '🦌'; color = '#e6c966'; }
    else { text = '不愿失去'; emoji = '⏳'; color = '#ffd966'; }

    const header = document.querySelector('.chat-header');
    if (header) {
        let bar = header.querySelector('.familiarity-bar');
        if (!bar) { bar = document.createElement('div'); bar.className = 'familiarity-bar'; header.appendChild(bar); }
        bar.innerHTML = `${emoji} ${text} ${f}%`;
        bar.style.color = color;
    }
}

function updateOnlineStatus() {
    const dot = document.getElementById('onlineStatus');
    const txt = document.getElementById('onlineText');
    if (!dot || !txt) return;
    dot.textContent = currentUser.familiarity >= 80 ? '🟢' : currentUser.familiarity >= 35 ? '🟡' : '🔒';
    txt.textContent = currentUser.familiarity >= 80 ? 'ONLINE - Lee Heeseung' : currentUser.familiarity >= 35 ? 'ONLINE - Connected' : 'OFFLINE';
}

// ========== 事件监听 ==========
function setupListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            const locked = item.classList.contains('locked') && !currentUser.unlockedPages?.includes(page);
            if (locked && page !== 'trash' && page !== 'home') {
                SFX.denied();
                showAccessDenied(page);
                return;
            }
            SFX.click();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
            
            // 记录页面阅读
            if (!currentUser.viewedPages.includes(page)) {
                currentUser.viewedPages.push(page);
                saveUserData();
                checkEndings();
            }
            if (!currentUser.pageReadCount[page]) currentUser.pageReadCount[page] = 0;
            currentUser.pageReadCount[page]++;
            saveUserData();
        });
        item.addEventListener('mouseenter', () => SFX.hover());
    });

    document.getElementById('closeChat')?.addEventListener('click', () => {
        SFX.click();
        document.getElementById('chatWindow').classList.add('hidden');
        document.getElementById('chatNotify').classList.remove('hidden');
        isChatActive = false;
    });

    document.getElementById('chatNotify')?.addEventListener('click', () => {
        SFX.click();
        document.getElementById('chatWindow').classList.remove('hidden');
        document.getElementById('chatNotify').classList.add('hidden');
        isChatActive = true;
    });
}

function showAccessDenied(page) {
    const attempts = currentUser.conversations?.filter(c => c.type === 'denied').length || 0;
    let msg = 'ACCESS DENIED';
    if (attempts >= 5) msg = 'ACCESS DENIED.';
    if (attempts >= 10) msg = 'ACCESS DENIED. Not now.';
    currentUser.conversations.push({ type: 'denied', page, time: Date.now() });
    saveUserData();

    const frame = document.getElementById('pageFrame');
    if (!frame) return;
    frame.src = 'about:blank';
    setTimeout(() => {
        try {
            const doc = frame.contentDocument || frame.contentWindow.document;
            if (doc) {
                doc.open();
                doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                    *{margin:0}body{background:#0d0d0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Courier New',monospace;flex-direction:column}
                    .icon{font-size:48px;margin-bottom:16px}.msg{font-size:18px;color:#ff4444}.cnt{font-size:11px;color:#444;margin-top:8px}
                </style></head><body><div class="icon">🚫</div><div class="msg">${msg}</div><div class="cnt">attempts: ${attempts + 1}</div></body></html>`);
                doc.close();
            }
        } catch(e) {}
    }, 100);
}

function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    if (!frame) return;
    frame.src = `pages/${page}.html`;
}

function showNotification(msg, dur = 3000) {
    let n = document.getElementById('notification');
    if (!n) { n = document.createElement('div'); n.id = 'notification'; n.className = 'hidden'; document.body.appendChild(n); }
    n.textContent = msg;
    n.classList.remove('hidden');
    setTimeout(() => n.classList.add('hidden'), dur);
}

// ========== 供其他页面调用的函数 ==========
window.increaseFavClick = function() {
    currentUser.favClickCount++;
    saveUserData();
    checkEndings();
};

window.repairPhoto = function() {
    currentUser.photoRepairedCount++;
    saveUserData();
    checkEndings();
};

window.playAudio = function() {
    currentUser.audioPlayCount++;
    saveUserData();
    checkEndings();
};

window.saveProfileAnswer = function(answer) {
    currentUser.profileAnswer = answer;
    saveUserData();
    checkEndings();
};

// ========== 调试 ==========
window.resetGame = () => {
    localStorage.removeItem('hee_archive_v3');
    resetUser();
    saveUserData();
    location.reload();
};
console.log('%c输入 resetGame() 重置所有进度', 'color: #888; font-size: 11px;');
