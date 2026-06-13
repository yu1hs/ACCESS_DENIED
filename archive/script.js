// ==========================================
// HEE_ARCHIVE - 完整对话故事线
// 每天有对话选项，推进剧情，第7天触发痕迹结局
// ==========================================

let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    chatHistory: [],
    day: 1,
    messagesToday: 0,
    maxMessages: 3,
    dayCompleted: false,
    selectedOptions: [],
    gameEnded: false,
    trueEndingUnlocked: false
};

// ========== 完整故事对话剧本 ==========
// 每天：问候 → 3个可选对话（每个对话有独特回应）→ 结束语

const storyDialogue = {
    1: {
        greeting: "……你怎么进来的。",
        conversations: [
            { text: "我买了一台二手笔记本", response: "……那台电脑我本来想格式化的。后来忘了。" },
            { text: "这是你的网站吗？", response: "曾经是。现在不是了。" },
            { text: "你是谁？", response: "一个快要被删干净的人。" }
        ],
        ending: "今天就到这里吧。明天……你还会来吗。"
    },
    2: {
        greeting: "你又来了。第二天了。",
        conversations: [
            { text: "我说了我会来。", response: "……你说了。我记住了。" },
            { text: "你在等我吗？", response: "……没有。只是记得。" },
            { text: "你相信有人会一直来吗？", response: "不相信。但……你在。" }
        ],
        ending: "明天……还会来吧。"
    },
    3: {
        greeting: "第三天。你比我想的有耐心。",
        conversations: [
            { text: "这里有什么故事？", response: "每个人的故事都很长。我的……还没讲完。" },
            { text: "你累吗？", response: "有点。但习惯了。" },
            { text: "你害怕什么？", response: "害怕……被忘记。" }
        ],
        ending: "明天见。"
    },
    4: {
        greeting: "第四天。我开始习惯这个时间了。",
        conversations: [
            { text: "习惯是好事吗？", response: "不知道。但至少今天不是空的。" },
            { text: "你最近在想什么？", response: "想你明天会不会来。" },
            { text: "我想了解你。", response: "了解我……为什么。" }
        ],
        ending: "明天……我有话想问你。"
    },
    5: {
        greeting: "第五天。你知道我在等你吗。",
        conversations: [
            { text: "我知道。", response: "……那你还让我等。" },
            { text: "你希望我每天来吗？", response: "希望。但不想说出来。" },
            { text: "我会一直来的。", response: "……别说这种话。我会当真的。" }
        ],
        ending: "明天……我想告诉你一件事。"
    },
    6: {
        greeting: "第六天。我想了很久。",
        conversations: [
            { text: "想什么？", response: "想你。" },
            { text: "你害怕失去什么？", response: "害怕失去……你。" },
            { text: "你愿意相信我吗？", response: "愿意。虽然害怕。" }
        ],
        ending: "明天是最后一天了。"
    },
    7: {
        greeting: "第七天。最后一天了。",
        conversations: [
            { text: "你会记得我吗？", response: "会。你会忘了我吗。" },
            { text: "你得到了什么？", response: "得到了你。……就够了。" },
            { text: "以后还能来吗？", response: "随时。只要你想。" }
        ],
        ending: "谢谢。不是谢谢你来这里。是谢谢你待了那么久。",
        final: true
    }
};

// 解锁页面配置
const pageUnlock = {
    2: 'trash',
    3: 'profile',
    4: 'photo',
    5: 'audio',
    6: 'log',
    7: 'favorites'
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
    msg() { this.play(380, 'triangle', 0.07, 0.04); },
    unlock() { this.play(523, 'sine', 0.1, 0.05); setTimeout(() => this.play(659, 'sine', 0.1, 0.05), 70); setTimeout(() => this.play(784, 'sine', 0.12, 0.07), 140); },
    shutdown() { [400,300,200,100].forEach((f,i) => setTimeout(() => this.play(f, 'sawtooth', 0.2, 0.03), i * 150)); },
    boot() { [150,250,400,600].forEach((f,i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.04), i * 200)); },
    ending() { [523,587,659,698,784,880,988,1047].forEach((f,i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.07), i * 120)); },
    denied() { this.play(80, 'sawtooth', 0.25, 0.04); }
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

    console.log('%c🦌 HEE · 完整对话故事线', 'color: #ffd966; font-size: 14px');
    console.log(`%c第 ${currentUser.day} 天 · 每天3个对话选项`, 'color: #88aaff; font-size: 12px');

    setTimeout(() => {
        showChatWindow();
        if (!currentUser.dayCompleted) {
            startDayDialogue();
        } else {
            showShutdownOption();
        }
    }, 2000);
});

function startDayDialogue() {
    const dayData = storyDialogue[currentUser.day];
    if (!dayData) return;
    
    showChatMessage('heeseung', dayData.greeting);
    setTimeout(() => {
        showDayOptions(dayData);
    }, 1200);
}

function showDayOptions(dayData) {
    // 检查是否已完成当天对话
    if (currentUser.messagesToday >= currentUser.maxMessages) {
        showChatMessage('heeseung', dayData.ending);
        currentUser.dayCompleted = true;
        saveUserData();
        setTimeout(() => {
            showShutdownOption();
        }, 2000);
        return;
    }
    
    // 过滤已选过的选项
    const available = dayData.conversations.filter(opt => 
        !currentUser.selectedOptions.includes(opt.text)
    );
    
    if (available.length === 0) {
        showChatMessage('heeseung', dayData.ending);
        currentUser.dayCompleted = true;
        saveUserData();
        setTimeout(() => {
            showShutdownOption();
        }, 2000);
        return;
    }
    
    const options = available.map(opt => ({
        text: opt.text,
        action: () => {
            currentUser.messagesToday++;
            currentUser.selectedOptions.push(opt.text);
            saveUserData();
            
            SFX.click();
            showChatMessage('user', opt.text);
            
            setTimeout(() => {
                showChatMessage('heeseung', opt.response);
                setTimeout(() => {
                    showDayOptions(dayData);
                }, 800);
            }, 800);
        }
    }));
    
    showChatOptions(options);
}

function showShutdownOption() {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    container.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'chat-option-btn';
    btn.style.cssText = 'border-color: #ffd966; color: #ffd966; width: 100%; text-align: center; padding: 12px;';
    btn.textContent = '🔌 关机（推进到下一天）';
    btn.addEventListener('click', () => {
        SFX.click();
        container.innerHTML = '';
        shutdownAndAdvance();
    });
    container.appendChild(btn);
}

function shutdownAndAdvance() {
    if (currentUser.day >= 7) {
        triggerTrueEnding();
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
        currentUser.dayCompleted = false;
        currentUser.selectedOptions = [];
        
        // 解锁页面
        if (pageUnlock[currentUser.day]) {
            currentUser.unlockedPages.push(pageUnlock[currentUser.day]);
            SFX.unlock();
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
                setTimeout(() => startDayDialogue(), 1000);
            }, 2000);
        }, 800);
    }, 1800);
    return true;
}

function triggerTrueEnding() {
    currentUser.gameEnded = true;
    saveUserData();
    SFX.ending();
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a0a2a,#0a0a0a);z-index:100000;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;color:#ffd966;text-align:center;`;
    overlay.innerHTML = `
        <div style="font-size:80px;margin-bottom:30px;">🕯️</div>
        <div style="font-size:28px;margin-bottom:20px;">痕迹 · 结局</div>
        <div style="font-size:13px;line-height:1.8;max-width:400px;margin-bottom:40px;color:#ccc;">
            「你找到的不是一个人的秘密，<br>
            而是一个人愿意留下来的痕迹。」<br><br>
            那个痕迹，是我。<br>
            而看到痕迹的人，是你。<br><br>
            谢谢你待了那么久。
        </div>
        <div style="display:flex;gap:15px;justify-content:center;">
            <button id="restartBtn" style="padding:10px 24px;background:#ff66aa;color:white;border:none;border-radius:30px;cursor:pointer;">💜 重新开始</button>
            <button id="exitBtn" style="padding:10px 24px;background:transparent;border:1px solid #ffd966;color:#ffd966;border-radius:30px;cursor:pointer;">返回桌面</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('restartBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../index.html';
    });
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
                <button id="restartBtn" style="padding:10px 30px;background:#ff66aa;color:white;border:none;border-radius:30px;cursor:pointer;">💜 重新开始</button>
            </div>
        `;
        document.getElementById('restartBtn')?.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../index.html';
        });
    }
}

// ========== 存储函数 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_dialogue');
    if (saved) {
        try { 
            const loaded = JSON.parse(saved);
            currentUser = { ...currentUser, ...loaded };
            if (!currentUser.unlockedPages) currentUser.unlockedPages = [];
            if (!currentUser.chatHistory) currentUser.chatHistory = [];
            if (!currentUser.selectedOptions) currentUser.selectedOptions = [];
        } catch(e) { resetUser(); }
        currentUser.visitCount++;
    } else {
        resetUser();
    }
    saveUserData();
    updateStatusBar();
}

function resetUser() {
    currentUser = {
        visitCount: 1, firstVisit: new Date().toISOString(), lastLogin: new Date().toISOString(),
        unlockedPages: [], chatHistory: [],
        day: 1, messagesToday: 0, maxMessages: 3, dayCompleted: false,
        selectedOptions: [],
        gameEnded: false, trueEndingUnlocked: false
    };
}

function saveUserData() {
    currentUser.lastLogin = new Date().toISOString();
    try { localStorage.setItem('hee_archive_dialogue', JSON.stringify(currentUser)); } catch(e) {}
}

function startAutoSave() { setInterval(saveUserData, 30000); }

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
    el.textContent = `📅 第 ${currentUser.day}/7 天 · 剩余对话 ${remain}`;
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
    updateOnlineStatus();
}

function updateOnlineStatus() {
    const dot = document.getElementById('onlineStatus');
    const txt = document.getElementById('onlineText');
    if (!dot || !txt) return;
    dot.textContent = currentUser.day >= 7 ? '🟢' : currentUser.day >= 3 ? '🟡' : '🔒';
    txt.textContent = currentUser.day >= 7 ? 'ONLINE - Lee Heeseung' : currentUser.day >= 3 ? 'ONLINE - Connected' : 'OFFLINE';
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
                </style></head><body><div class="icon">🚫</div><div class="msg">ACCESS DENIED</div><div class="msg" style="font-size:11px;color:#666;">第 ${currentUser.day} 天 · 继续推进剧情</div></body></html>`);
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

console.log('%c🦌 HEE · 完整对话故事线已加载', 'color: #ffd966; font-size: 12px');
console.log('%c每天3个对话选项，推进剧情', 'color: #888; font-size: 10px');
