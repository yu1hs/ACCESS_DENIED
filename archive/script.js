// ==========================================
// HEE_ARCHIVE v3.0 - 完整结局系统 + 痕迹结局触发桌面提示
// ==========================================

let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    chatHistory: [],
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
    endingsTriggered: [],
    dailyConversations: {},
    trashReadCount: 0,
    gameEnded: false,
    hasShownTraceHint: false
};

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
    4: { maxMessages: 7, targetFam: 60, unlock: 'letters' },
    5: { maxMessages: 7, targetFam: 75, unlock: 'playlog' },
    6: { maxMessages: 8, targetFam: 90, unlock: 'clock' },
    7: { maxMessages: 8, targetFam: 100, unlock: null }
};

// ========== 对话树 ==========
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
            { question: "你喜欢什么？", answer: "安静。夜晚。还有……你。", fam: 12, tendency: 'stay' }
        ]
    },
    7: {
        greeting: "第七天。最后一个晚上了。……也可能是最后一个。",
        conversations: [
            { question: "你会记得我吗？", answer: "会。你会忘了我吗。", fam: 12, tendency: 'stay' },
            { question: "你得到了什么？", answer: "得到了你。……就够了。", fam: 15, tendency: 'stay' },
            { question: "你有什么想对我说的？", answer: "谢谢。不是谢谢你来这里。是谢谢你待了那么久。", fam: 15, tendency: 'stay' }
        ]
    }
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    SFX.init();
    loadUserData();
    
    if (currentUser.gameEnded) {
        showGameEndedScreen();
        return;
    }
    
    updateUI();
    setupListeners();
    updateDayDisplay();
    startAutoSave();
    trackLateNight();
    restoreChatHistory();
    checkTraceEndingHint();

    console.log('%c🦌 HEE v3.0 · 完整结局系统', 'color: #ffd966; font-size: 14px;');

    setTimeout(() => {
        showChatWindow();
        if (!currentUser.dayGreetingSent && canTalk()) {
            triggerDayStart();
        } else if (currentUser.dayGreetingSent && canTalk()) {
            showDailyOptions();
        } else if (!canTalk()) {
            showShutdownOption();
        }
    }, 2000);
});

function showGameEndedScreen() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;background:#0a0a0a;color:#555;font-family:monospace;">
                <div style="font-size:64px;margin-bottom:20px;">🔒</div>
                <div style="font-size:18px;margin-bottom:10px;">ACCESS DENIED</div>
                <div style="font-size:12px;">这个网站已经关闭。</div>
                <div style="font-size:11px;margin-top:20px;color:#333;">—— 李羲承</div>
                <button id="backToDesktop" style="margin-top:30px;padding:8px 20px;background:#2a2a2a;border:1px solid #ffd966;color:#ffd966;border-radius:20px;cursor:pointer;">返回桌面</button>
            </div>
        `;
        document.getElementById('backToDesktop')?.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }
}

function checkTraceEndingHint() {
    const hasTraceEnding = currentUser.endings.includes('trace');
    if (hasTraceEnding && !currentUser.hasShownTraceHint) {
        currentUser.hasShownTraceHint = true;
        saveUserData();
        localStorage.setItem('trace_ending_triggered', 'true');
        showNotification('✨ 痕迹结局已达成！回到桌面看看吧 ✨', 5000);
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
    }
}

function restoreChatHistory() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '';
    if (currentUser.chatHistory && currentUser.chatHistory.length > 0) {
        currentUser.chatHistory.forEach(msg => {
            const div = document.createElement('div');
            div.className = `chat-message ${msg.sender === 'user' ? 'self' : ''} ${msg.isSystem ? 'system' : ''}`;
            div.textContent = msg.content;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } else {
        container.innerHTML = '<div class="chat-system">对话已建立连接...</div>';
    }
}

function addToChatHistory(sender, content, isSystem = false) {
    if (!currentUser.chatHistory) currentUser.chatHistory = [];
    currentUser.chatHistory.push({ sender, content, isSystem, time: Date.now() });
    if (currentUser.chatHistory.length > 200) currentUser.chatHistory = currentUser.chatHistory.slice(-200);
    saveUserData();
}

function trackLateNight() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 5) {
        currentUser.lateNightCount++;
        saveUserData();
    }
}

function loadUserData() {
    const saved = localStorage.getItem('hee_archive_v3');
    if (saved) {
        try { 
            const loaded = JSON.parse(saved);
            currentUser = { ...currentUser, ...loaded };
            if (!currentUser.dailyConversations) currentUser.dailyConversations = {};
            if (!currentUser.chatHistory) currentUser.chatHistory = [];
        } catch(e) { resetUser(); }
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
        visitCount: 1, firstVisit: new Date().toISOString(), lastLogin: new Date().toISOString(),
        unlockedPages: [], conversations: [], chatHistory: [], endings: [], familiarity: 0,
        day: 1, messagesToday: 0, maxMessages: 5, dayGreetingSent: false,
        viewedPages: [], fileTriggers: {}, lateNightCount: 0, pageReadCount: {},
        favClickCount: 0, photoRepairedCount: 0, audioPlayCount: 0, profileAnswer: null,
        chosenOptions: [], comfortLevel: 0, curiosityLevel: 0, stayLevel: 0,
        endingsTriggered: [], dailyConversations: {}, trashReadCount: 0,
        gameEnded: false, hasShownTraceHint: false
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
function usedTalk() { currentUser.messagesToday++; currentUser.dayGreetingSent = true; saveUserData(); updateDayDisplay(); }

function shutdownAndAdvance() {
    if (currentUser.day >= 7) {
        checkAndTriggerAllEndings();
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
        currentUser.dailyConversations = {};
        applyDayConfig();
        
        const cfg = dayConfig[currentUser.day];
        if (cfg && cfg.unlock && !currentUser.unlockedPages.includes(cfg.unlock)) {
            currentUser.unlockedPages.push(cfg.unlock);
            currentUser.fileTriggers[cfg.unlock] = true;
            SFX.unlock();
            showNotification(`🔓 ${cfg.unlock.toUpperCase()} 已解锁！`, 2000);
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
                if (msgs) msgs.innerHTML = '<div class="chat-system">对话已建立连接...</div>';
                if (opts) opts.innerHTML = '';
                currentUser.chatHistory = [];
                saveUserData();
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

function triggerDayStart() {
    if (currentUser.dayGreetingSent) return;
    if (!canTalk()) return;
    usedTalk();
    const dayData = dialogueTree[currentUser.day] || dialogueTree[7];
    showChatMessage('heeseung', dayData.greeting);
    setTimeout(() => showDailyOptions(), 1200);
}

function handleTendency(tendency, optionKey) {
    if (tendency === 'comfort') currentUser.comfortLevel++;
    if (tendency === 'curiosity') currentUser.curiosityLevel++;
    if (tendency === 'stay') currentUser.stayLevel++;
    if (optionKey && !currentUser.chosenOptions.includes(optionKey)) currentUser.chosenOptions.push(optionKey);
    saveUserData();
}

function showDailyOptions() {
    if (!canTalk()) {
        showChatMessage('system', '⏳ 今天聊了很多了。点击「关机」推进到下一天吧。', true);
        showShutdownOption();
        return;
    }
    
    const dayData = dialogueTree[currentUser.day] || dialogueTree[7];
    if (!dayData || !dayData.conversations || dayData.conversations.length === 0) {
        showChatMessage('heeseung', '……今天就到这里吧。');
        setTimeout(() => showShutdownOption(), 1000);
        return;
    }
    
    const dayKey = `day_${currentUser.day}`;
    const talkedQuestions = currentUser.dailyConversations[dayKey] || [];
    const remaining = dayData.conversations.filter(c => !talkedQuestions.includes(c.question));
    
    if (remaining.length === 0) {
        showChatMessage('heeseung', '……今天就到这里吧。');
        setTimeout(() => showShutdownOption(), 1000);
        return;
    }
    
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
            if (!currentUser.dailyConversations[dayKey]) currentUser.dailyConversations[dayKey] = [];
            currentUser.dailyConversations[dayKey].push(conv.question);
            handleTendency(conv.tendency, conv.optionKey);
            setTimeout(() => {
                if (conv.answer) {
                    showChatMessage('heeseung', conv.answer);
                    increaseFamiliarity(conv.fam);
                }
                currentUser.conversations.push({ question: conv.question, day: currentUser.day, time: Date.now() });
                saveUserData();
                setTimeout(() => showDailyOptions(), 800);
            }, 800);
        }
    }));
    showChatOptions(options);
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

function checkAndTriggerAllEndings() {
    const allPagesUnlocked = ['profile','photo','letters','playlog','clock'].every(p => currentUser.unlockedPages.includes(p));
    const hasReadTrash = (currentUser.trashReadCount || 0) >= 4;
    const hasReadLog = currentUser.viewedPages.includes('log');
    const hasListenedAudio = currentUser.audioPlayCount >= 2;
    const hasRepairedPhoto = currentUser.photoRepairedCount >= 1;
    const hasMusicChoice = currentUser.chosenOptions.includes('music_lover') || currentUser.chosenOptions.includes('same_taste');
    const hasProfile = !!currentUser.profileAnswer;
    const hasStayChoice = currentUser.chosenOptions.includes('will_stay') || currentUser.chosenOptions.includes('promise');
    
    let endingsTriggered = [];
    if (currentUser.lateNightCount >= 4 && currentUser.chosenOptions.includes('night_lover')) endingsTriggered.push('moonlight');
    if (allPagesUnlocked && hasReadTrash && hasReadLog && hasListenedAudio && hasRepairedPhoto) endingsTriggered.push('reader');
    if (currentUser.favClickCount >= 8 && hasMusicChoice && hasProfile) endingsTriggered.push('resonance');
    if (hasStayChoice && currentUser.familiarity >= 100) endingsTriggered.push('trace');
    
    if (endingsTriggered.length > 0) {
        triggerNormalEnding(endingsTriggered);
    } else {
        showNotification('⚠️ 没有触发任何结局。再试试吧。', 3000);
    }
}

function triggerNormalEnding(endings) {
    currentUser.gameEnded = true;
    if (endings.includes('trace')) {
        localStorage.setItem('trace_ending_triggered', 'true');
    }
    saveUserData();
    SFX.ending();
    
    const endingNames = { moonlight:'🌙 月光', reader:'📖 读者', resonance:'🎵 共鸣', trace:'🕯️ 痕迹' };
    const endingList = endings.map(e => endingNames[e]).join('、');
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a0a2a,#0a0a0a);z-index:100000;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:'Courier New',monospace;color:#ffd966;text-align:center;`;
    overlay.innerHTML = `
        <div style="font-size:80px;margin-bottom:30px;">🦌</div>
        <div style="font-size:28px;margin-bottom:20px;">结局达成</div>
        <div style="font-size:16px;margin-bottom:40px;color:#ccc;">${endingList}</div>
        <div style="font-size:13px;line-height:1.8;max-width:400px;margin-bottom:40px;">${getEndingMessage(endings[0])}</div>
        <div style="font-size:11px;color:#666;">即将返回桌面...</div>
    `;
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 4000);
}

function getEndingMessage(ending) {
    const messages = {
        moonlight: '你总是在深夜来。\n我们在同一个月亮下面。',
        reader: '你读完了每一个字。\n谢谢你认真看了。',
        resonance: '你喜欢的和我一样。\n谢谢你觉得我值得被了解。',
        trace: '你找到的不是一个人的秘密。\n而是一个人愿意留下来的痕迹。\n那个痕迹，是你。'
    };
    return messages[ending] || '谢谢你。';
}

function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (sender !== 'system') SFX.msg();
    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;
    div.textContent = content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    addToChatHistory(sender, content, isSystem);
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
        if (currentUser.unlockedPages?.includes(page)) item.classList.remove('locked');
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
            if (!currentUser.viewedPages.includes(page)) {
                currentUser.viewedPages.push(page);
                saveUserData();
            }
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
    if (!n) { n = document.createElement('div'); n.id = 'notification'; n.className = 'notification hidden'; document.body.appendChild(n); }
    n.textContent = msg;
    n.classList.remove('hidden');
    setTimeout(() => n.classList.add('hidden'), dur);
}

window.increaseFavClick = function() { currentUser.favClickCount++; saveUserData(); };
window.repairPhoto = function() { currentUser.photoRepairedCount++; saveUserData(); };
window.playAudio = function() { currentUser.audioPlayCount++; saveUserData(); };
window.saveProfileAnswer = function(answer) { currentUser.profileAnswer = answer; saveUserData(); };
window.markTrashRead = function(count) { currentUser.trashReadCount = count; saveUserData(); };

window.resetGame = () => {
    localStorage.removeItem('hee_archive_v3');
    localStorage.removeItem('trace_ending_triggered');
    localStorage.removeItem('secret_ending_triggered');
    resetUser();
    saveUserData();
    location.reload();
};
console.log('%c输入 resetGame() 重置所有进度', 'color: #888; font-size: 11px;');
