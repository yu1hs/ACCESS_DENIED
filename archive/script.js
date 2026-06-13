// ==========================================
// HEE_ARCHIVE v6.0 - 好感度驱动解锁系统
// 文件解锁条件 = 好感度 + 特定行为
// ==========================================

let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    chatHistory: [],
    achievements: [],
    trueEnding: false,
    hiddenEnding: false,
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
    dailyConversations: {},
    trashReadCount: 0,
    gameEnded: false,
    hasShownTraceHint: false,
    // 行为记录
    hasWrittenProfile: false,
    hasReadAllTrash: false,
    hasRepairedAllPhotos: false
};

let isChatActive = false;

// ========== 好感度阈值定义 ==========
const UNLOCK_THRESHOLDS = {
    PROFILE: 30,      // 好感度≥30%解锁
    PHOTO: 45,        // 好感度≥45%解锁
    AUDIO: 60,        // 好感度≥60%解锁
    LOG: 75,          // 好感度≥75%解锁
    FAVORITES: 85,    // 好感度≥85%解锁
    LETTERS: 95       // 好感度≥95%解锁
};

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
    1: { maxMessages: 5, targetFam: 15 },
    2: { maxMessages: 6, targetFam: 30 },
    3: { maxMessages: 6, targetFam: 45 },
    4: { maxMessages: 7, targetFam: 60 },
    5: { maxMessages: 7, targetFam: 75 },
    6: { maxMessages: 8, targetFam: 90 },
    7: { maxMessages: 8, targetFam: 100 }
};

// ========== 对话树 ==========
const dialogueTree = {
    1: {
        greeting: "……你怎么进来的。",
        conversations: [
            { question: "你是谁？", answer: "一个快要被删干净的人。", fam: 8, tendency: 'curiosity' },
            { question: "这是你的网站吗？", answer: "曾经是。现在不是了。", fam: 5, tendency: 'curiosity' },
            { question: "我买了一台二手笔记本", answer: "……那台电脑我本来想格式化的。后来忘了。", fam: 8, tendency: 'stay' }
        ]
    },
    2: {
        greeting: "你又来了。第二天了。",
        conversations: [
            { question: "你在等我吗？", answer: "……没有。只是记得。", fam: 8, tendency: 'stay', optionKey: 'expect' },
            { question: "你昨天睡得好吗？", answer: "还好。你呢。", fam: 6, tendency: 'comfort' },
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
            { question: "我会一直来的。", answer: "……别说这种话。我会当真的。", fam: 12, tendency: 'stay', optionKey: 'promise' }
        ]
    },
    4: {
        greeting: "第四天了。我开始习惯这个时间了。",
        conversations: [
            { question: "习惯是好事吗？", answer: "不知道。但至少今天不是空的。", fam: 7, tendency: 'stay' },
            { question: "你最近在想什么？", answer: "想你明天会不会来。", fam: 10, tendency: 'stay', optionKey: 'think_you' },
            { question: "睡不着吗？", answer: "嗯。你也是？", fam: 8, tendency: 'night', optionKey: 'insomnia' },
            { question: "我想了解你。", answer: "了解我……为什么。", fam: 12, tendency: 'curiosity' }
        ]
    },
    5: {
        greeting: "第五天。你知道我在等你吗。",
        conversations: [
            { question: "你想说什么？", answer: "想问你……你是什么样的人。", fam: 8, tendency: 'curiosity' },
            { question: "你相信缘分吗？", answer: "以前不信。现在……不确定。", fam: 8, tendency: 'stay' },
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
    checkUnlockByFamiliarity();  // 关键：好感度解锁检查

    console.log('%c🦌 HEE v6.0 · 好感度驱动解锁', 'color: #ffd966; font-size: 14px;');
    console.log('%c文件解锁条件：好感度达到阈值自动解锁', 'color: #888; font-size: 11px;');

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

// ========== 好感度解锁检查（核心） ==========
function checkUnlockByFamiliarity() {
    let unlocked = false;
    
    // PROFILE 解锁（好感度≥30%）
    if (currentUser.familiarity >= UNLOCK_THRESHOLDS.PROFILE && !currentUser.unlockedPages.includes('profile')) {
        currentUser.unlockedPages.push('profile');
        unlocked = true;
        showNotification('🔓 PROFILE 已解锁（好感度≥30%）', 3000);
        SFX.unlock();
    }
    
    // PHOTO 解锁（好感度≥45%）
    if (currentUser.familiarity >= UNLOCK_THRESHOLDS.PHOTO && !currentUser.unlockedPages.includes('photo')) {
        currentUser.unlockedPages.push('photo');
        unlocked = true;
        showNotification('🔓 PHOTO 已解锁（好感度≥45%）', 3000);
        SFX.unlock();
    }
    
    // AUDIO 解锁（好感度≥60%）
    if (currentUser.familiarity >= UNLOCK_THRESHOLDS.AUDIO && !currentUser.unlockedPages.includes('audio')) {
        currentUser.unlockedPages.push('audio');
        unlocked = true;
        showNotification('🔓 AUDIO 已解锁（好感度≥60%）', 3000);
        SFX.unlock();
    }
    
    // LOG 解锁（好感度≥75%）
    if (currentUser.familiarity >= UNLOCK_THRESHOLDS.LOG && !currentUser.unlockedPages.includes('log')) {
        currentUser.unlockedPages.push('log');
        unlocked = true;
        showNotification('🔓 LOG 已解锁（好感度≥75%）', 3000);
        SFX.unlock();
    }
    
    // FAVORITES 解锁（好感度≥85%）
    if (currentUser.familiarity >= UNLOCK_THRESHOLDS.FAVORITES && !currentUser.unlockedPages.includes('favorites')) {
        currentUser.unlockedPages.push('favorites');
        unlocked = true;
        showNotification('🔓 FAVORITES 已解锁（好感度≥85%）', 3000);
        SFX.unlock();
    }
    
    // LETTERS 解锁（好感度≥95%）
    if (currentUser.familiarity >= UNLOCK_THRESHOLDS.LETTERS && !currentUser.unlockedPages.includes('letters')) {
        currentUser.unlockedPages.push('letters');
        unlocked = true;
        showNotification('🔓 LETTERS 已解锁（好感度≥95%）', 3000);
        SFX.unlock();
    }
    
    if (unlocked) {
        updateUI();
        saveUserData();
    }
}

// ========== 成就检测 ==========
function checkAchievements() {
    // 夜行者成就
    const hasNightWalker = currentUser.lateNightCount >= 5 && 
                           (currentUser.chosenOptions.includes('night_lover') || 
                            currentUser.chosenOptions.includes('insomnia')) &&
                           currentUser.familiarity >= 40;
    
    // 收藏家成就
    const hasCollector = currentUser.trashReadCount >= 5 && 
                         currentUser.photoRepairedCount >= 2 &&
                         currentUser.audioPlayCount >= 3 &&
                         currentUser.viewedPages.includes('log');
    
    // 共鸣者成就
    const hasResonator = currentUser.favClickCount >= 12 && 
                         !!currentUser.profileAnswer &&
                         currentUser.familiarity >= 60;
    
    if (hasNightWalker && !currentUser.achievements.includes('night_walker')) {
        currentUser.achievements.push('night_walker');
        showAchievementToast('🌙 成就解锁：夜行者', '你总是在深夜来。我们在同一个月亮下面。');
    }
    if (hasCollector && !currentUser.achievements.includes('collector')) {
        currentUser.achievements.push('collector');
        showAchievementToast('📖 成就解锁：收藏家', '你读完了每一个字。谢谢你看完。');
    }
    if (hasResonator && !currentUser.achievements.includes('resonator')) {
        currentUser.achievements.push('resonator');
        showAchievementToast('🎵 成就解锁：共鸣者', '你喜欢的和我一样。如果是你，好像也没关系。');
    }
    
    saveUserData();
    updateAchievementDisplay();
    
    // 检查真结局条件
    const hasAllAchievements = currentUser.achievements.length >= 3;
    if (hasAllAchievements && currentUser.day >= 7 && currentUser.familiarity >= 100 && !currentUser.trueEnding) {
        triggerTrueEnding();
    }
}

function showAchievementToast(title, message) {
    SFX.unlock();
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a0a2a, #0a0a0a); border: 2px solid #ffd966;
        border-radius: 20px; padding: 20px 40px; text-align: center; z-index: 20000;
        animation: fadeOut 3s ease forwards; font-family: monospace;
    `;
    toast.innerHTML = `<div style="font-size:48px;">🏆</div><div style="font-size:16px;color:#ffd966;">${title}</div><div style="font-size:11px;color:#aaa;">${message}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function triggerTrueEnding() {
    currentUser.trueEnding = true;
    currentUser.gameEnded = true;
    saveUserData();
    SFX.ending();
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a0a2a,#0a0a0a);z-index:100000;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;color:#ffd966;text-align:center;`;
    overlay.innerHTML = `
        <div style="font-size:80px;margin-bottom:30px;">🕯️</div>
        <div style="font-size:28px;margin-bottom:20px;">真结局 · 痕迹</div>
        <div style="font-size:13px;line-height:1.8;max-width:400px;margin-bottom:40px;">
            你集齐了所有成就。<br>
            他记住了你。<br>
            回到桌面看看吧。
        </div>
        <button id="exitBtn" style="padding:10px 30px;background:#ffd966;color:#0a0a0a;border:none;border-radius:30px;cursor:pointer;">返回桌面</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('exitBtn')?.addEventListener('click', () => {
        localStorage.setItem('trace_ending_triggered', 'true');
        window.location.href = '../index.html';
    });
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
        localStorage.removeItem('hee_archive_v6');
        localStorage.removeItem('trace_ending_triggered');
        localStorage.removeItem('secret_ending_triggered');
        window.location.href = '../index.html';
    }
}

// ========== 存储函数 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_v6');
    if (saved) {
        try { 
            const loaded = JSON.parse(saved);
            currentUser = { ...currentUser, ...loaded };
            if (!currentUser.dailyConversations) currentUser.dailyConversations = {};
            if (!currentUser.chatHistory) currentUser.chatHistory = [];
            if (!currentUser.achievements) currentUser.achievements = [];
        } catch(e) { resetUser(); }
        currentUser.visitCount++;
    } else {
        resetUser();
    }
    applyDayConfig();
    saveUserData();
    updateStatusBar();
    updateAchievementDisplay();
}

function resetUser() {
    currentUser = {
        visitCount: 1, firstVisit: new Date().toISOString(), lastLogin: new Date().toISOString(),
        unlockedPages: [], conversations: [], chatHistory: [], achievements: [],
        trueEnding: false, hiddenEnding: false,
        familiarity: 0, day: 1, messagesToday: 0, maxMessages: 5, dayGreetingSent: false,
        viewedPages: [], fileTriggers: {}, lateNightCount: 0, pageReadCount: {},
        favClickCount: 0, photoRepairedCount: 0, audioPlayCount: 0, profileAnswer: null,
        chosenOptions: [], dailyConversations: {}, trashReadCount: 0,
        gameEnded: false, hasShownTraceHint: false,
        hasWrittenProfile: false, hasReadAllTrash: false, hasRepairedAllPhotos: false
    };
}

function applyDayConfig() {
    const cfg = dayConfig[currentUser.day] || dayConfig[7];
    currentUser.maxMessages = cfg.maxMessages;
}

function saveUserData() {
    currentUser.lastLogin = new Date().toISOString();
    try { localStorage.setItem('hee_archive_v6', JSON.stringify(currentUser)); } catch(e) {}
}

function startAutoSave() { setInterval(saveUserData, 30000); }
function canTalk() { return currentUser.messagesToday < currentUser.maxMessages; }
function usedTalk() { currentUser.messagesToday++; currentUser.dayGreetingSent = true; saveUserData(); updateDayDisplay(); }

function trackLateNight() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 5) {
        currentUser.lateNightCount++;
        saveUserData();
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

function shutdownAndAdvance() {
    if (currentUser.day >= 7) {
        checkAchievements();
        if (!currentUser.trueEnding) {
            showNotification('⚠️ 第7天结束。未能触发真结局。再试一次吧。', 4000);
            setTimeout(() => { window.location.href = '../index.html'; }, 2000);
        }
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
        currentUser.dailyConversations = {};
        applyDayConfig();
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
            
            if (conv.optionKey && !currentUser.chosenOptions.includes(conv.optionKey)) {
                currentUser.chosenOptions.push(conv.optionKey);
            }
            
            setTimeout(() => {
                showChatMessage('heeseung', conv.answer);
                increaseFamiliarity(conv.fam);
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
    checkUnlockByFamiliarity();  // 每次增加好感度后检查解锁
    checkAchievements();
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

function updateAchievementDisplay() {
    const container = document.getElementById('achievementDisplay') || createAchievementDisplay();
    if (container) {
        const count = currentUser.achievements.length;
        const icons = { night_walker: '🌙', collector: '📖', resonator: '🎵' };
        let html = '🏆 ';
        currentUser.achievements.forEach(a => { html += icons[a] || '⭐'; });
        if (count === 0) html = '🏆 0/3';
        container.innerHTML = html;
    }
}

function createAchievementDisplay() {
    const footer = document.querySelector('.footer-right');
    if (footer) {
        const span = document.createElement('span');
        span.id = 'achievementDisplay';
        span.style.cssText = 'margin-left: 16px; font-size: 11px; color: #ffd966;';
        footer.appendChild(span);
        return span;
    }
    return null;
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
                </style></head><body><div class="icon">🚫</div><div class="msg">ACCESS DENIED</div><div class="msg" style="font-size:11px;color:#666;">好感度不够，继续对话吧</div></body></html>`);
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
window.increaseFavClick = function() { currentUser.favClickCount++; saveUserData(); checkAchievements(); };
window.repairPhoto = function() { currentUser.photoRepairedCount++; saveUserData(); checkAchievements(); };
window.playAudio = function() { currentUser.audioPlayCount++; saveUserData(); checkAchievements(); };
window.saveProfileAnswer = function(answer) { currentUser.profileAnswer = answer; currentUser.hasWrittenProfile = true; saveUserData(); checkAchievements(); };
window.markTrashRead = function(count) { currentUser.trashReadCount = count; if(count>=5) currentUser.hasReadAllTrash=true; saveUserData(); checkAchievements(); };
