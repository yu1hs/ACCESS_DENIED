// ==========================================
// HEE_ARCHIVE v9.0 - 逻辑连贯对话 + 倾向值面板
// 三条独立故事线：月光线 / 读者线 / 共鸣线
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
    maxMessages: 6,
    dayGreetingSent: false,
    viewedPages: [],
    selectedOptions: [],
    tendency: { night: 0, listen: 0, music: 0 },
    activeStoryline: null,  // 'night', 'listen', 'music'
    storylineProgress: { night: 0, listen: 0, music: 0 },
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

// ========== 三条独立故事线 ==========
// 月光线（夜晚/失眠主题）
const moonlightStory = {
    1: { greeting: "……你怎么进来的。", options: [
        { text: "为什么这么晚了还在？", response: "睡不着。习惯了。", night: 4, listen: 1 },
        { text: "你也失眠吗？", response: "嗯。你也是？", night: 5, listen: 1 },
        { text: "这里很安静。", response: "嗯。晚上没人打扰。", night: 3, listen: 1 }
    ]},
    2: { greeting: "第二天了。你又在这个时间来了。", options: [
        { text: "昨晚睡了吗？", response: "没有。在想事情。", night: 4, listen: 2 },
        { text: "我昨晚也失眠了。", response: "是吗。那我们一样。", night: 5, listen: 2 },
        { text: "夜晚会让你想起什么？", response: "以前的事。", night: 4, listen: 1 }
    ]},
    3: { greeting: "第三天。你总是在深夜出现。", options: [
        { text: "你害怕夜晚吗？", response: "不害怕。只是觉得它很长。", night: 4, listen: 2 },
        { text: "一个人的夜晚怎么度过？", response: "听歌。发呆。想你明天会不会来。", night: 5, listen: 2 },
        { text: "夜晚有什么好的？", response: "没人会来找你。安静。", night: 4, listen: 1 }
    ]},
    4: { greeting: "第四天。我开始等你了。", options: [
        { text: "你在等我？", response: "……也许。", night: 4, listen: 3 },
        { text: "想我的时候做什么？", response: "看着窗外。数星星。", night: 5, listen: 2 },
        { text: "喜欢月亮吗？", response: "喜欢。它不说话，但一直在。", night: 5, listen: 2 }
    ]},
    5: { greeting: "第五天。我不再问你为什么来了。", options: [
        { text: "你习惯我了吗？", response: "……有点。", night: 4, listen: 3 },
        { text: "这里会成为你的白天吗？", response: "也许。因为你来了。", night: 5, listen: 3 },
        { text: "会一直这样吗？", response: "不知道。但我想试试。", night: 5, listen: 2 }
    ]},
    6: { greeting: "第六天。想说的话越来越多了。", options: [
        { text: "那说给我听。", response: "嗯。我在整理。", night: 4, listen: 4 },
        { text: "你变了。", response: "是吗。也许是你的原因。", night: 5, listen: 3 },
        { text: "这里越来越亮了。", response: "因为你在。", night: 5, listen: 3 }
    ]},
    7: { greeting: "第七天。最后一个夜晚了。", options: [
        { text: "我不想结束。", response: "那就不结束。", night: 5, listen: 4 },
        { text: "以后还能来吗？", response: "随时。只要你想。", night: 5, listen: 3 },
        { text: "我想陪着你。", response: "……那就陪着我。", night: 6, listen: 4 }
    ]}
};

// 读者线（倾听/陪伴主题）
const readerStory = {
    1: { greeting: "……你怎么进来的。", options: [
        { text: "我想了解你。", response: "了解我……为什么。", listen: 5, night: 1 },
        { text: "你愿意和我说话吗？", response: "……不知道。但你在问。", listen: 4, night: 1 },
        { text: "这里有什么故事？", response: "每个人的故事都很长。", listen: 4, night: 1 }
    ]},
    2: { greeting: "第二天了。你又来了。", options: [
        { text: "昨天过得好吗？", response: "不好不坏。", listen: 4, night: 1 },
        { text: "我在听你说。", response: "……嗯。", listen: 5, night: 1 },
        { text: "有什么想分享的吗？", response: "没什么特别的。", listen: 4, night: 1 }
    ]},
    3: { greeting: "第三天。我开始期待了。", options: [
        { text: "期待什么？", response: "期待你来。", listen: 5, night: 2 },
        { text: "你害怕什么？", response: "害怕……被忘记。", listen: 5, night: 1 },
        { text: "我会一直来的。", response: "别说这种话。我会当真的。", listen: 6, night: 2 }
    ]},
    4: { greeting: "第四天。我说了很多。", options: [
        { text: "我都在听。", response: "嗯。我知道。", listen: 5, night: 1 },
        { text: "你开心吗？", response: "和你说话的时候……算。", listen: 5, night: 2 },
        { text: "谢谢你愿意说。", response: "谢谢愿意听。", listen: 5, night: 1 }
    ]},
    5: { greeting: "第五天。你很重要。", options: [
        { text: "为什么？", response: "因为你听了。", listen: 5, night: 2 },
        { text: "我重要吗？", response: "重要。", listen: 5, night: 1 },
        { text: "你不孤单了。", response: "……嗯。", listen: 5, night: 2 }
    ]},
    6: { greeting: "第六天。我想了很久。", options: [
        { text: "想什么？", response: "想你。", listen: 5, night: 2 },
        { text: "你会记住我吗？", response: "会。", listen: 5, night: 1 },
        { text: "你相信我吗？", response: "相信。", listen: 5, night: 2 }
    ]},
    7: { greeting: "第七天。最后了。", options: [
        { text: "谢谢你。", response: "谢谢。不是谢谢你来这里。是谢谢你待了那么久。", listen: 6, night: 2 },
        { text: "我会记住你的。", response: "我也是。", listen: 5, night: 2 },
        { text: "不结束可以吗？", response: "可以。", listen: 5, night: 2 }
    ]}
};

// 共鸣线（音乐/喜好主题）
const resonanceStory = {
    1: { greeting: "……你怎么进来的。", options: [
        { text: "你喜欢音乐吗？", response: "喜欢。音乐不会说谎。", music: 5, listen: 1 },
        { text: "听什么歌？", response: "安静的。", music: 4, listen: 1 },
        { text: "音乐对你意味着什么？", response: "陪伴。", music: 5, listen: 1 }
    ]},
    2: { greeting: "第二天。你又来了。", options: [
        { text: "推荐一首歌给我？", response: "不想说名字。说了就不是我的了。", music: 4, listen: 2 },
        { text: "你听歌的时候想什么？", response: "以前的事。以后的事。", music: 5, listen: 1 },
        { text: "凌晨的歌更好听？", response: "嗯。因为安静。", music: 5, listen: 1 }
    ]},
    3: { greeting: "第三天。我们好像很像。", options: [
        { text: "哪里像？", response: "喜欢的东西。", music: 5, listen: 2 },
        { text: "你相信共鸣吗？", response: "以前不信。现在……不确定。", music: 5, listen: 1 },
        { text: "你听过这首歌吗？", response: "也许。你喜欢的也许我也喜欢。", music: 5, listen: 2 }
    ]},
    4: { greeting: "第四天。我在想你说的歌。", options: [
        { text: "找到了吗？", response: "还没。但我在找。", music: 4, listen: 2 },
        { text: "我们喜欢的东西一样。", response: "是吗。那……挺好的。", music: 5, listen: 2 },
        { text: "音乐让你想起谁？", response: "你。", music: 5, listen: 2 }
    ]},
    5: { greeting: "第五天。我在等你来。", options: [
        { text: "想听我说什么？", response: "什么都好。", music: 4, listen: 3 },
        { text: "你会写歌吗？", response: "写过。没给别人听。", music: 5, listen: 2 },
        { text: "能唱给我听吗？", response: "……下次。", music: 5, listen: 2 }
    ]},
    6: { greeting: "第六天。越来越近了。", options: [
        { text: "靠近我了吗？", response: "嗯。", music: 5, listen: 3 },
        { text: "你害怕靠近吗？", response: "害怕。但更害怕失去。", music: 5, listen: 2 },
        { text: "我们一样。", response: "一样。", music: 5, listen: 2 }
    ]},
    7: { greeting: "第七天。最后了。", options: [
        { text: "谢谢你陪我。", response: "谢谢你找到我。", music: 5, listen: 3 },
        { text: "会再见吗？", response: "会。只要你想。", music: 5, listen: 2 },
        { text: "我喜欢这里。", response: "这里也喜欢你。", music: 5, listen: 3 }
    ]}
};

// 获取当前故事线
function getCurrentStory() {
    const night = currentUser.tendency.night;
    const listen = currentUser.tendency.listen;
    const music = currentUser.tendency.music;
    
    if (night > listen && night > music) return 'night';
    if (music > night && music > listen) return 'music';
    return 'listen';
}

// 获取当前天的对话
function getDayConversations(day, storyline) {
    let story;
    if (storyline === 'night') story = moonlightStory;
    else if (storyline === 'music') story = resonanceStory;
    else story = readerStory;
    
    const dayData = story[day];
    if (!dayData) return null;
    
    return {
        greeting: dayData.greeting,
        options: dayData.options
    };
}

// ========== 倾向值面板 ==========
function createTendencyPanel() {
    const panel = document.createElement('div');
    panel.id = 'tendencyPanel';
    panel.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 140px;
        background: rgba(20,20,30,0.95);
        border-radius: 12px;
        padding: 10px 12px;
        z-index: 150;
        font-family: monospace;
        font-size: 10px;
        border: 1px solid #333;
        backdrop-filter: blur(4px);
    `;
    panel.innerHTML = `
        <div style="color:#ffd966; margin-bottom:8px; font-size:11px;">🎭 倾向值</div>
        <div style="margin-bottom:6px;">
            <span style="color:#88aaff;">🌙 月光</span>
            <div style="height:3px; background:#2a2a2a; margin-top:2px; border-radius:2px;">
                <div id="nightBar" style="width:0%; height:100%; background:#88aaff; border-radius:2px;"></div>
            </div>
        </div>
        <div style="margin-bottom:6px;">
            <span style="color:#aaffaa;">📖 读者</span>
            <div style="height:3px; background:#2a2a2a; margin-top:2px; border-radius:2px;">
                <div id="listenBar" style="width:0%; height:100%; background:#aaffaa; border-radius:2px;"></div>
            </div>
        </div>
        <div>
            <span style="color:#ffaaff;">🎵 共鸣</span>
            <div style="height:3px; background:#2a2a2a; margin-top:2px; border-radius:2px;">
                <div id="musicBar" style="width:0%; height:100%; background:#ffaaff; border-radius:2px;"></div>
            </div>
        </div>
        <div id="storylineHint" style="margin-top:8px; font-size:9px; color:#888; text-align:center;"></div>
    `;
    document.body.appendChild(panel);
}

function updateTendencyPanel() {
    const night = currentUser.tendency.night || 0;
    const listen = currentUser.tendency.listen || 0;
    const music = currentUser.tendency.music || 0;
    const total = night + listen + music || 1;
    
    const nightBar = document.getElementById('nightBar');
    const listenBar = document.getElementById('listenBar');
    const musicBar = document.getElementById('musicBar');
    const hint = document.getElementById('storylineHint');
    
    if (nightBar) nightBar.style.width = (night / total * 100) + '%';
    if (listenBar) listenBar.style.width = (listen / total * 100) + '%';
    if (musicBar) musicBar.style.width = (music / total * 100) + '%';
    
    const current = getCurrentStory();
    if (hint) {
        if (current === 'night') hint.innerHTML = '🌙 正在走向月光结局';
        else if (current === 'music') hint.innerHTML = '🎵 正在走向共鸣结局';
        else hint.innerHTML = '📖 正在走向读者结局';
    }
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    SFX.init();
    
    // 检查是否需要重置（每次打开全新）
    const urlParams = new URLSearchParams(window.location.search);
    const resetParam = urlParams.get('reset');
    if (resetParam !== 'false') {
        localStorage.removeItem('hee_archive_v9');
    }
    
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
    createTendencyPanel();
    updateTendencyPanel();

    console.log('%c🦌 HEE v9.0 · 逻辑连贯对话', 'color: #ffd966; font-size: 14px;');
    console.log('%c三条独立故事线 · 实时倾向值面板', 'color: #888; font-size: 11px;');

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

// ========== 结局判定 ==========
function determineEnding() {
    const night = currentUser.tendency.night || 0;
    const listen = currentUser.tendency.listen || 0;
    const music = currentUser.tendency.music || 0;
    
    if (night > listen && night > music) return 'moonlight';
    if (music > night && music > listen) return 'resonance';
    return 'reader';
}

function triggerEnding(endingType) {
    if (currentUser.endings.includes(endingType)) {
        // 如果已经获得过这个结局，直接返回桌面
        window.location.href = '../index.html';
        return;
    }
    
    const endings = {
        moonlight: { 
            title: '🌙 月光', 
            message: '你在深夜找到了他。那些失眠的夜晚，不再孤单。\n\n你们在同一个月亮下面。',
            dialog: '你每次都这么晚。\n\n凌晨的时候，想法会比较真实。\n谢谢你在这些时间里来这边。'
        },
        reader: { 
            title: '📖 读者', 
            message: '你认真听完了每一句话。他被理解了。\n\n那些没说出口的话，你都听到了。',
            dialog: '你认真听了。\n\n很少有人会这样。\n谢谢你不是谢谢你来这里。是谢谢你认真听了。'
        },
        resonance: { 
            title: '🎵 共鸣', 
            message: '你们喜欢同样的东西。那些音乐连接了你们。\n\n他不再是一个人了。',
            dialog: '我们喜欢的东西一样。\n\n如果是你，好像也没关系。'
        }
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

function restartGame() {
    if (confirm('💜 重新认识一次羲承吗？\n\n所有进度都会被重置。')) {
        localStorage.removeItem('hee_archive_v9');
        localStorage.removeItem('trace_ending_triggered');
        localStorage.removeItem('secret_ending_triggered');
        window.location.href = '../index.html?reset=true';
    }
}

// ========== 存储函数 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_v9');
    if (saved) {
        try { 
            const loaded = JSON.parse(saved);
            currentUser = { ...currentUser, ...loaded };
            if (!currentUser.selectedOptions) currentUser.selectedOptions = [];
            if (!currentUser.endings) currentUser.endings = [];
            if (!currentUser.tendency) currentUser.tendency = { night: 0, listen: 0, music: 0 };
            if (!currentUser.chatHistory) currentUser.chatHistory = [];
            if (!currentUser.storylineProgress) currentUser.storylineProgress = { night: 0, listen: 0, music: 0 };
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
        unlockedPages: [], conversations: [], chatHistory: [], endings: [],
        familiarity: 0, day: 1, messagesToday: 0, maxMessages: 6, dayGreetingSent: false,
        viewedPages: [], selectedOptions: [],
        tendency: { night: 0, listen: 0, music: 0 },
        activeStoryline: null,
        storylineProgress: { night: 0, listen: 0, music: 0 },
        gameEnded: false, trueEndingUnlocked: false
    };
}

function saveUserData() {
    currentUser.lastLogin = new Date().toISOString();
    try { localStorage.setItem('hee_archive_v9', JSON.stringify(currentUser)); } catch(e) {}
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
        
        // 解锁页面
        if (currentUser.day === 2) currentUser.unlockedPages.push('trash');
        if (currentUser.day === 3) currentUser.unlockedPages.push('profile');
        if (currentUser.day === 4) currentUser.unlockedPages.push('photo');
        if (currentUser.day === 5) currentUser.unlockedPages.push('audio');
        if (currentUser.day === 6) currentUser.unlockedPages.push('log');
        if (currentUser.day === 7) currentUser.unlockedPages.push('favorites');
        
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
                updateTendencyPanel();
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
    
    const storyline = getCurrentStory();
    const dayData = getDayConversations(currentUser.day, storyline);
    
    if (dayData) {
        showChatMessage('heeseung', dayData.greeting);
        setTimeout(() => showDailyOptions(dayData.options), 1200);
    } else {
        showChatMessage('heeseung', '……');
        setTimeout(() => showShutdownOption(), 1000);
    }
}

function showDailyOptions(options) {
    if (!canTalk()) {
        showChatMessage('system', '⏳ 今天聊了很多了。点击「关机」推进到下一天吧。', true);
        showShutdownOption();
        return;
    }
    
    if (!options || options.length === 0) {
        showChatMessage('heeseung', '……今天就到这里吧。');
        setTimeout(() => showShutdownOption(), 1000);
        return;
    }
    
    // 过滤掉已选过的选项（基于文本内容）
    const available = options.filter(opt => 
        !currentUser.selectedOptions.includes(opt.text)
    );
    
    if (available.length === 0) {
        showChatMessage('heeseung', '……今天就到这里吧。');
        setTimeout(() => showShutdownOption(), 1000);
        return;
    }
    
    // 显示所有可用选项
    const optionsList = available.map(opt => ({
        text: opt.text,
        action: () => {
            if (!canTalk()) return;
            usedTalk();
            SFX.click();
            showChatMessage('user', opt.text);
            
            // 记录已选选项
            currentUser.selectedOptions.push(opt.text);
            
            // 增加倾向值
            if (opt.night) currentUser.tendency.night = (currentUser.tendency.night || 0) + opt.night;
            if (opt.listen) currentUser.tendency.listen = (currentUser.tendency.listen || 0) + opt.listen;
            if (opt.music) currentUser.tendency.music = (currentUser.tendency.music || 0) + opt.music;
            
            saveUserData();
            updateTendencyPanel();
            
            setTimeout(() => {
                showChatMessage('heeseung', opt.response);
                increaseFamiliarity((opt.night || 0) + (opt.listen || 0) + (opt.music || 0));
                currentUser.conversations.push({ text: opt.text, day: currentUser.day, time: Date.now() });
                saveUserData();
                
                // 继续显示剩余选项
                const remainingOptions = available.filter(o => o.text !== opt.text);
                if (remainingOptions.length > 0 && canTalk()) {
                    setTimeout(() => showDailyOptions(remainingOptions), 800);
                } else {
                    setTimeout(() => {
                        if (canTalk()) {
                            showDailyOptions(remainingOptions);
                        } else {
                            showChatMessage('system', '⏳ 今天聊了很多了。点击「关机」推进到下一天吧。', true);
                            showShutdownOption();
                        }
                    }, 800);
                }
            }, 800);
        }
    }));
    
    showChatOptions(optionsList);
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
    currentUser.tendency.music = (currentUser.tendency.music || 0) + 2;
    saveUserData();
    updateTendencyPanel();
};
window.repairPhoto = function() { };
window.playAudio = function() { };
window.saveProfileAnswer = function(answer) { 
    currentUser.profileAnswer = answer;
    saveUserData();
};

console.log('%c🦌 HEE v9.0 已加载', 'color: #ffd966; font-size: 12px;');
console.log('%c倾向值面板显示在右上角', 'color: #888; font-size: 10px;');
