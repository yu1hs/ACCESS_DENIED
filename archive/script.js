// ==========================================
// HEE_ARCHIVE v8.0 - 选项驱动对话树
// 每个选项只能选一次 · 结局由选项倾向决定
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
    maxMessages: 7,
    dayGreetingSent: false,
    viewedPages: [],
    // 记录已选过的选项（防止重复）
    selectedOptions: [],
    // 结局倾向（每次选择增加对应倾向值）
    tendency: {
        night: 0,      // 月光结局倾向
        listen: 0,     // 读者结局倾向
        music: 0       // 共鸣结局倾向
    },
    gameEnded: false,
    trueEndingUnlocked: false
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
    msg() { this.play(380, 'triangle', 0.07, 0.04); },
    unlock() { this.play(523, 'sine', 0.1, 0.05); setTimeout(() => this.play(659, 'sine', 0.1, 0.05), 70); setTimeout(() => this.play(784, 'sine', 0.12, 0.07), 140); },
    shutdown() { [400,300,200,100].forEach((f,i) => setTimeout(() => this.play(f, 'sawtooth', 0.2, 0.03), i * 150)); },
    boot() { [150,250,400,600].forEach((f,i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.04), i * 200)); },
    ending() { [523,587,659,698,784,880,988,1047].forEach((f,i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.07), i * 120)); },
    denied() { this.play(80, 'sawtooth', 0.25, 0.04); }
};

// ========== 每日配置 ==========
const dayConfig = {
    1: { maxMessages: 7, targetFam: 15, unlock: null },
    2: { maxMessages: 7, targetFam: 30, unlock: 'trash' },
    3: { maxMessages: 7, targetFam: 45, unlock: 'profile' },
    4: { maxMessages: 7, targetFam: 60, unlock: 'photo' },
    5: { maxMessages: 7, targetFam: 75, unlock: 'audio' },
    6: { maxMessages: 7, targetFam: 90, unlock: 'log' },
    7: { maxMessages: 7, targetFam: 100, unlock: 'favorites' }
};

// ========== 对话树（丰富选项，每个选项独立）==========
const dialogueTree = {
    1: {
        greeting: "……你怎么进来的。",
        conversations: [
            { id: "d1_q1", question: "这是你的网站吗？", answer: "曾经是。现在不是了。", fam: 5, tendency: 'listen', value: 2 },
            { id: "d1_q2", question: "你是谁？", answer: "一个快要被删干净的人。", fam: 8, tendency: 'listen', value: 3 },
            { id: "d1_q3", question: "为什么还留着这个网站？", answer: "……忘了删。也可能是……不想删。", fam: 6, tendency: 'listen', value: 2 },
            { id: "d1_q4", question: "你平时都做什么？", answer: "练习。听歌。发呆。", fam: 5, tendency: 'music', value: 2 },
            { id: "d1_q5", question: "你看起来很累。", answer: "……你看出来了。", fam: 8, tendency: 'listen', value: 3 },
            { id: "d1_q6", question: "一个人不孤单吗？", answer: "孤单。但习惯了。", fam: 7, tendency: 'listen', value: 3 },
            { id: "d1_q7", question: "我买了一台二手笔记本", answer: "……那台电脑我本来想格式化的。后来忘了。", fam: 8, tendency: 'listen', value: 3 }
        ]
    },
    2: {
        greeting: "你又来了。第二天了。",
        conversations: [
            { id: "d2_q1", question: "你在等我吗？", answer: "……没有。只是记得。", fam: 8, tendency: 'listen', value: 3 },
            { id: "d2_q2", question: "你昨天睡得好吗？", answer: "还好。你呢。", fam: 6, tendency: 'listen', value: 2 },
            { id: "d2_q3", question: "你为什么总是晚上在？", answer: "晚上安静。没人会打扰。", fam: 6, tendency: 'night', value: 4 },
            { id: "d2_q4", question: "失眠的时候做什么？", answer: "听歌。或者发呆。", fam: 7, tendency: 'night', value: 3 },
            { id: "d2_q5", question: "你这里有什么故事？", answer: "每个人的故事都很长。我的……还没讲完。", fam: 7, tendency: 'listen', value: 3 },
            { id: "d2_q6", question: "今天发生了什么吗？", answer: "没什么特别的。", fam: 5, tendency: 'listen', value: 2 },
            { id: "d2_q7", question: "你相信有人会一直来吗？", answer: "不相信。但……你在。", fam: 10, tendency: 'listen', value: 4 }
        ]
    },
    3: {
        greeting: "第三天。你比我想的有耐心。",
        conversations: [
            { id: "d3_q1", question: "你有什么梦想吗？", answer: "梦想？……以前有。现在……不知道。", fam: 7, tendency: 'listen', value: 2 },
            { id: "d3_q2", question: "今天累吗？", answer: "有点。但习惯了。", fam: 6, tendency: 'listen', value: 2 },
            { id: "d3_q3", question: "你害怕什么？", answer: "害怕……被忘记。", fam: 10, tendency: 'listen', value: 4 },
            { id: "d3_q4", question: "你平时听什么歌？", answer: "安静的。凌晨听的那种。", fam: 8, tendency: 'music', value: 4 },
            { id: "d3_q5", question: "可以推荐一首歌吗？", answer: "不想说名字。说了就不是我的了。", fam: 7, tendency: 'music', value: 3 },
            { id: "d3_q6", question: "你会想家吗？", answer: "……偶尔。", fam: 7, tendency: 'listen', value: 3 },
            { id: "d3_q7", question: "我会一直来的。", answer: "……别说这种话。我会当真的。", fam: 12, tendency: 'listen', value: 5 }
        ]
    },
    4: {
        greeting: "第四天了。我开始习惯这个时间了。",
        conversations: [
            { id: "d4_q1", question: "习惯是好事吗？", answer: "不知道。但至少今天不是空的。", fam: 7, tendency: 'listen', value: 2 },
            { id: "d4_q2", question: "你最近在想什么？", answer: "想你明天会不会来。", fam: 10, tendency: 'night', value: 4 },
            { id: "d4_q3", question: "你也失眠吗？", answer: "嗯。你也是？", fam: 8, tendency: 'night', value: 4 },
            { id: "d4_q4", question: "凌晨的时候会想什么？", answer: "以前的事。以后的事。……还有你。", fam: 10, tendency: 'night', value: 4 },
            { id: "d4_q5", question: "我想了解你。", answer: "了解我……为什么。", fam: 12, tendency: 'listen', value: 5 },
            { id: "d4_q6", question: "你最喜欢的季节是什么？", answer: "秋天。安静。", fam: 6, tendency: 'listen', value: 2 },
            { id: "d4_q7", question: "你有想去的地方吗？", answer: "海边。安静的地方。", fam: 7, tendency: 'listen', value: 3 }
        ]
    },
    5: {
        greeting: "第五天。你知道我在等你吗。",
        conversations: [
            { id: "d5_q1", question: "你想说什么？", answer: "想问你……你是什么样的人。", fam: 8, tendency: 'listen', value: 3 },
            { id: "d5_q2", question: "你相信缘分吗？", answer: "以前不信。现在……不确定。", fam: 8, tendency: 'listen', value: 3 },
            { id: "d5_q3", question: "我们喜欢的东西好像差不多", answer: "是吗。那……挺好的。", fam: 10, tendency: 'music', value: 5 },
            { id: "d5_q4", question: "我不觉得你不好。", answer: "……你是第一个这么说的。", fam: 12, tendency: 'listen', value: 5 },
            { id: "d5_q5", question: "你希望我每天来吗？", answer: "希望。但不想说出来。", fam: 10, tendency: 'night', value: 4 },
            { id: "d5_q6", question: "音乐对你来说意味着什么？", answer: "陪伴。就像你一样。", fam: 10, tendency: 'music', value: 4 },
            { id: "d5_q7", question: "你觉得我是什么样的人？", answer: "……愿意留下来的人。", fam: 10, tendency: 'listen', value: 4 }
        ]
    },
    6: {
        greeting: "第六天。我想了很多要和你说的话。但现在忘了。",
        conversations: [
            { id: "d6_q1", question: "你重要吗？", answer: "对你来说……重要吗。", fam: 10, tendency: 'listen', value: 4 },
            { id: "d6_q2", question: "你害怕失去什么？", answer: "害怕失去……你。", fam: 12, tendency: 'listen', value: 5 },
            { id: "d6_q3", question: "你愿意相信我吗？", answer: "愿意。虽然害怕。", fam: 10, tendency: 'listen', value: 5 },
            { id: "d6_q4", question: "晚上一个人的时候会想什么？", answer: "想你。", fam: 12, tendency: 'night', value: 5 },
            { id: "d6_q5", question: "你最喜欢什么颜色？", answer: "深蓝色。夜晚的颜色。", fam: 7, tendency: 'night', value: 3 },
            { id: "d6_q6", question: "如果有机会改变什么，你会改变吗？", answer: "不会。因为改变就不会遇见你了。", fam: 12, tendency: 'listen', value: 5 },
            { id: "d6_q7", question: "你快乐吗？", answer: "和你说话的时候……算。", fam: 10, tendency: 'listen', value: 4 }
        ]
    },
    7: {
        greeting: "第七天。最后一个晚上了。……也可能是最后一个。",
        conversations: [
            { id: "d7_q1", question: "你会记得我吗？", answer: "会。你会忘了我吗。", fam: 12, tendency: 'listen', value: 5 },
            { id: "d7_q2", question: "你得到了什么？", answer: "得到了你。……就够了。", fam: 15, tendency: 'listen', value: 6 },
            { id: "d7_q3", question: "以后还能来吗？", answer: "随时。只要你想。", fam: 10, tendency: 'night', value: 4 },
            { id: "d7_q4", question: "谢谢你。", answer: "谢谢。不是谢谢你来这里。是谢谢你待了那么久。", fam: 15, tendency: 'listen', value: 6 },
            { id: "d7_q5", question: "最后想对你说……", answer: "嗯。我在听。", fam: 12, tendency: 'listen', value: 5 },
            { id: "d7_q6", question: "（输入你的回答）", answer: null, fam: 0, freeInput: true }
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
    restoreChatHistory();

    console.log('%c🦌 HEE v8.0 · 选项驱动对话树', 'color: #ffd966; font-size: 14px;');
    console.log('%c每个选项只能选一次 · 结局由选择决定', 'color: #888; font-size: 11px;');

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

// ========== 结局判定（基于倾向值）==========
function determineEnding() {
    const night = currentUser.tendency.night || 0;
    const listen = currentUser.tendency.listen || 0;
    const music = currentUser.tendency.music || 0;
    
    console.log(`倾向值 - 夜晚:${night} 倾听:${listen} 音乐:${music}`);
    
    let maxTendency = 'listen';
    let maxValue = listen;
    if (night > maxValue) { maxTendency = 'night'; maxValue = night; }
    if (music > maxValue) { maxTendency = 'music'; maxValue = music; }
    
    if (maxTendency === 'night') return 'moonlight';
    if (maxTendency === 'music') return 'resonance';
    return 'reader';
}

// ========== 结局触发 ==========
function triggerEnding(endingType) {
    if (currentUser.endings.includes(endingType)) return;
    
    const endings = {
        moonlight: { title: '🌙 月光', message: '你总是在深夜来。我也一样。我们在同一个月亮下面。', dialog: '你每次都这么晚。\n\n凌晨的时候，想法会比较真实。\n谢谢你在这些时间里来这边。' },
        reader: { title: '📖 读者', message: '你认真听完了每一句话。谢谢你在。', dialog: '你都听完了。\n\n很少有人会这样。\n谢谢你不是谢谢你来这里。是谢谢你认真听了。' },
        resonance: { title: '🎵 共鸣', message: '你喜欢的和我一样。如果是你，好像也没关系。', dialog: '你点了很多次。\n\n我在想你是不是和我喜欢一样的东西。\n如果是你...好像也没关系。' }
    };
    
    const ending = endings[endingType];
    currentUser.endings.push(endingType);
    saveUserData();
    SFX.ending();
    
    // 检查是否集齐3个结局
    if (currentUser.endings.length >= 3 && !currentUser.trueEndingUnlocked) {
        triggerTraceEnding();
        return;
    }
    
    showEndingScreen(endingType, ending.title, ending.message, ending.dialog);
}

function triggerTraceEnding() {
    currentUser.trueEndingUnlocked = true;
    saveUserData();
    SFX.ending();
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a0a2a,#0a0a0a);z-index:100000;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;color:#ffd966;text-align:center;`;
    overlay.innerHTML = `
        <div style="font-size:80px;margin-bottom:30px;">🕯️</div>
        <div style="font-size:28px;margin-bottom:20px;">痕迹 · 完整</div>
        <div style="font-size:13px;line-height:1.8;max-width:400px;margin-bottom:40px;color:#ccc;">
            你集齐了所有结局。<br>
            月光下读过他的文字，<br>
            倾听过他的声音，<br>
            共鸣过他的喜好。<br><br>
            他记住了你。<br>
            回到桌面看看吧。
        </div>
        <div style="display:flex;gap:15px;">
            <button id="restartBtn" style="padding:10px 24px;background:#ff66aa;color:white;border:none;border-radius:30px;cursor:pointer;">💜 重新认识一次吧？</button>
            <button id="exitBtn" style="padding:10px 24px;background:transparent;border:1px solid #ffd966;color:#ffd966;border-radius:30px;cursor:pointer;">返回桌面</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('restartBtn')?.addEventListener('click', () => restartGame());
    document.getElementById('exitBtn')?.addEventListener('click', () => {
        localStorage.setItem('trace_ending_triggered', 'true');
        window.location.href = '../index.html';
    });
}

function showEndingScreen(type, title, message, dialog) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a0a2a,#0a0a0a);z-index:100000;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;color:#ffd966;text-align:center;`;
    overlay.innerHTML = `
        <div style="font-size:80px;margin-bottom:30px;">${type === 'moonlight' ? '🌙' : type === 'reader' ? '📖' : '🎵'}</div>
        <div style="font-size:28px;margin-bottom:20px;">${title}</div>
        <div style="font-size:13px;line-height:1.8;max-width:400px;margin-bottom:40px;color:#ccc;">${message}</div>
        <div style="font-size:12px;color:#888;margin-bottom:30px;">${dialog}</div>
        <div style="display:flex;gap:15px;">
            <button id="restartBtn" style="padding:10px 24px;background:#ff66aa;color:white;border:none;border-radius:30px;cursor:pointer;">💜 重新认识一次吧？</button>
            <button id="exitBtn" style="padding:10px 24px;background:transparent;border:1px solid #ffd966;color:#ffd966;border-radius:30px;cursor:pointer;">返回桌面</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('restartBtn')?.addEventListener('click', () => restartGame());
    document.getElementById('exitBtn')?.addEventListener('click', () => window.location.href = '../index.html');
}

function showGameEndedScreen() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;background:#0a0a0a;font-family:monospace;text-align:center;">
                <div style="font-size:64px;margin-bottom:20px;">🦌</div>
                <div style="font-size:18px;color:#ffd966;margin-bottom:10px;">✦ 故事已完结 ✦</div>
                <div style="font-size:12px;color:#888;margin-bottom:30px;">你找到了羲承留下的痕迹。</div>
                <div style="display:flex;gap:15px;">
                    <button id="restartBtn" style="padding:10px 24px;background:#ff66aa;color:white;border:none;border-radius:30px;cursor:pointer;">💜 重新认识一次吧？</button>
                    <button id="exitBtn" style="padding:10px 24px;background:transparent;border:1px solid #ffd966;color:#ffd966;border-radius:30px;cursor:pointer;">返回桌面</button>
                </div>
            </div>
        `;
        document.getElementById('restartBtn')?.addEventListener('click', () => restartGame());
        document.getElementById('exitBtn')?.addEventListener('click', () => window.location.href = '../index.html');
    }
}

function restartGame() {
    if (confirm('💜 重新认识一次羲承吗？\n\n所有进度都会被重置。')) {
        localStorage.removeItem('hee_archive_v8');
        localStorage.removeItem('trace_ending_triggered');
        localStorage.removeItem('secret_ending_triggered');
        window.location.href = '../index.html';
    }
}

// ========== 存储函数 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_v8');
    if (saved) {
        try { 
            const loaded = JSON.parse(saved);
            currentUser = { ...currentUser, ...loaded };
            if (!currentUser.selectedOptions) currentUser.selectedOptions = [];
            if (!currentUser.endings) currentUser.endings = [];
            if (!currentUser.tendency) currentUser.tendency = { night: 0, listen: 0, music: 0 };
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
        unlockedPages: [], conversations: [], chatHistory: [], endings: [],
        familiarity: 0, day: 1, messagesToday: 0, maxMessages: 7, dayGreetingSent: false,
        viewedPages: [], selectedOptions: [],
        tendency: { night: 0, listen: 0, music: 0 },
        gameEnded: false, trueEndingUnlocked: false
    };
}

function applyDayConfig() {
    const cfg = dayConfig[currentUser.day] || dayConfig[7];
    currentUser.maxMessages = cfg.maxMessages;
}

function saveUserData() {
    currentUser.lastLogin = new Date().toISOString();
    try { localStorage.setItem('hee_archive_v8', JSON.stringify(currentUser)); } catch(e) {}
}

function startAutoSave() { setInterval(saveUserData, 30000); }
function canTalk() { return currentUser.messagesToday < currentUser.maxMessages; }
function usedTalk() { currentUser.messagesToday++; currentUser.dayGreetingSent = true; saveUserData(); updateDayDisplay(); }

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

function shutdownAndAdvance() {
    if (currentUser.day >= 7) {
        const ending = determineEnding();
        triggerEnding(ending);
        return false;
    }

    SFX.shutdown();
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;opacity:0;transition:opacity 1.5s;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;color:#444;`;
    overlay.innerHTML = `<div style="font-size:24px;">⬤</div><div style="font-size:12px;">正在关机...</div>`;
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
            SFX.unlock();
            showNotification(`🔓 ${cfg.unlock.toUpperCase()} 已解锁！`, 2000);
        }
        
        saveUserData();
        SFX.boot();
        
        setTimeout(() => {
            overlay.innerHTML = `<div style="font-size:48px;">☀️</div><div style="font-size:18px;color:#ffd966;">第 ${currentUser.day} 天</div>`;
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

function triggerDayStart() {
    if (currentUser.dayGreetingSent) return;
    if (!canTalk()) return;
    usedTalk();
    const dayData = dialogueTree[currentUser.day] || dialogueTree[7];
    showChatMessage('heeseung', dayData.greeting);
    setTimeout(() => showDailyOptions(), 1200);
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
    
    // 过滤掉已选过的选项
    const available = dayData.conversations.filter(conv => 
        !currentUser.selectedOptions.includes(conv.id)
    );
    
    if (available.length === 0) {
        showChatMessage('heeseung', '……今天就到这里吧。');
        setTimeout(() => showShutdownOption(), 1000);
        return;
    }
    
    // 随机选4个未选过的选项
    const shuffled = [...available];
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
            
            // 记录已选选项
            currentUser.selectedOptions.push(conv.id);
            
            // 增加倾向值
            if (conv.tendency && conv.value) {
                currentUser.tendency[conv.tendency] = (currentUser.tendency[conv.tendency] || 0) + conv.value;
                saveUserData();
            }
            
            setTimeout(() => {
                if (conv.answer) {
                    showChatMessage('heeseung', conv.answer);
                    increaseFamiliarity(conv.fam);
                } else if (conv.freeInput) {
                    triggerFreeInput();
                    return;
                }
                currentUser.conversations.push({ id: conv.id, question: conv.question, day: currentUser.day, time: Date.now() });
                saveUserData();
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
                setTimeout(() => {
                    const ending = determineEnding();
                    triggerEnding(ending);
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
    
    // 检查文件解锁
    const cfg = dayConfig[currentUser.day];
    if (cfg && cfg.unlock && !currentUser.unlockedPages.includes(cfg.unlock) && currentUser.familiarity >= cfg.targetFam) {
        currentUser.unlockedPages.push(cfg.unlock);
        SFX.unlock();
        showNotification(`🔓 ${cfg.unlock.toUpperCase()} 已解锁！`, 2000);
        updateUI();
    }
}

function showShutdownOption() {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    container.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'chat-option-btn';
    btn.style.cssText = 'border-color: #ffd966; color: #ffd966; width: 100%; text-align: center; padding: 10px;';
    btn.textContent = '🔌 关机（推进到下一天）';
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
    });

    document.getElementById('closeChat')?.addEventListener('click', () => {
        document.getElementById('chatWindow').classList.add('hidden');
        document.getElementById('chatNotify').classList.remove('hidden');
    });

    document.getElementById('chatNotify')?.addEventListener('click', () => {
        document.getElementById('chatWindow').classList.remove('hidden');
        document.getElementById('chatNotify').classList.add('hidden');
    });
}

function showAccessDenied(page) {
    const frame = document.getElementById('pageFrame');
    if (!frame) return;
    frame.src = 'about:blank';
    setTimeout(() => {
        try {
            const doc = frame.contentDocument || frame.contentWindow.document;
            if (doc) {
                doc.open();
                doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                    body{background:#0d0d0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;flex-direction:column}
                    .icon{font-size:48px;margin-bottom:16px}.msg{font-size:18px;color:#ff4444}
                </style></head><body><div class="icon">🚫</div><div class="msg">ACCESS DENIED</div><div class="msg" style="font-size:11px;color:#666;">继续对话解锁</div></body></html>`);
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

// 外部调用
window.increaseFavClick = function() { 
    currentUser.tendency.music = (currentUser.tendency.music || 0) + 1;
    saveUserData();
};
window.repairPhoto = function() { };
window.playAudio = function() { };
window.saveProfileAnswer = function(answer) { 
    currentUser.profileAnswer = answer;
    saveUserData();
};

console.log('%c🦌 HEE v8.0 已加载', 'color: #ffd966; font-size: 12px;');
