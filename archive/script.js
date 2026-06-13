// ==========================================
// HEE_ARCHIVE 核心交互脚本 v2.0
// 时间系统 + 文件触发 + 对话冷却
// ==========================================

// ========== 全局变量 ==========
let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    profileAnswer: null,
    profileResponse: null,
    skyDescription: null,
    photoRepairs: [],
    favClicks: {},
    audioPlays: [],
    logContinued: false,
    longestStay: 0,
    inputHistory: [],
    endings: [],
    familiarity: 0,
    // 时间系统
    currentDay: 1,
    lastChatDay: 0,
    messagesToday: 0,
    maxMessagesPerDay: 2,
    // 文件触发记录
    viewedPages: [],
    fileTriggers: {}
};

let startTime = Date.now();
let dialogueHistory = [];
let isChatActive = false;
let pendingMessages = []; // 待发送的消息队列

// ========== 音效系统 ==========
const SoundFX = {
    audioCtx: null,
    
    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    },
    
    play(freq, type, duration, vol = 0.05) {
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(this.audioCtx.currentTime);
            osc.stop(this.audioCtx.currentTime + duration);
        } catch(e) {}
    },
    
    click() { this.play(800, 'sine', 0.05, 0.03); },
    hover() { this.play(600, 'sine', 0.03, 0.02); },
    message() { this.play(440, 'triangle', 0.08, 0.05); },
    unlock() { 
        this.play(523, 'sine', 0.1, 0.05);
        setTimeout(() => this.play(659, 'sine', 0.1, 0.05), 60);
        setTimeout(() => this.play(784, 'sine', 0.15, 0.08), 120);
    },
    denied() { this.play(100, 'sawtooth', 0.2, 0.04); },
    typewriter() { this.play(300 + Math.random() * 200, 'sine', 0.02, 0.01); },
    dayPass() { 
        this.play(330, 'sine', 0.15, 0.04);
        setTimeout(() => this.play(440, 'sine', 0.15, 0.04), 100);
        setTimeout(() => this.play(550, 'sine', 0.2, 0.06), 200);
    },
    notification() { this.play(880, 'sine', 0.06, 0.04); },
    ending() {
        const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.play(freq, 'sine', 0.15, 0.06), i * 100);
        });
    }
};

// ========== 真结局检测 ==========
const urlParams = new URLSearchParams(window.location.search);
const isTrueEnding = urlParams.has('evan1015') || window.location.hash === '#evan1015';

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    SoundFX.init();
    loadUserData();
    updateUI();
    setupEventListeners();
    startTimerTracking();
    updateDayDisplay();
    
    if (isTrueEnding) {
        console.log('%c✨ 特殊访问模式已激活 ✨', 'color: #ffd966; font-size: 14px;');
    }
    
    console.log('%c🦌 你找到的不是一个人的秘密，而是一个人愿意留下来的痕迹。', 'color: #ffd966; font-size: 14px; font-style: italic;');
    
    // 延迟显示聊天窗口，让氛围沉淀
    setTimeout(() => {
        showChatWindow();
        checkPendingOrGreeting();
    }, 2500);
});

// ========== 存储管理 ==========
function loadUserData() {
    const saved = sessionStorage.getItem('hee_archive_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            currentUser.visitCount++;
            currentUser.lastLogin = new Date().toISOString();
        } catch (e) {
            initNewUser();
        }
    } else {
        initNewUser();
    }
    saveUserData();
    updateStatusDisplay();
}

function initNewUser() {
    currentUser = {
        visitCount: 1,
        firstVisit: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        unlockedPages: [],
        conversations: [],
        profileAnswer: null,
        profileResponse: null,
        skyDescription: null,
        photoRepairs: [],
        favClicks: {},
        audioPlays: [],
        logContinued: false,
        longestStay: 0,
        inputHistory: [],
        endings: [],
        familiarity: 0,
        currentDay: 1,
        lastChatDay: 0,
        messagesToday: 0,
        maxMessagesPerDay: 2,
        viewedPages: [],
        fileTriggers: {}
    };
}

function saveUserData() {
    try {
        sessionStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
    } catch (e) {
        if (currentUser.conversations && currentUser.conversations.length > 80) {
            currentUser.conversations = currentUser.conversations.slice(-40);
            sessionStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
        }
    }
}

// ========== 时间系统 ==========
function getAvailableMessagesToday() {
    return Math.max(0, currentUser.maxMessagesPerDay - currentUser.messagesToday);
}

function canChatNow() {
    // 今天还没聊完
    if (currentUser.messagesToday < currentUser.maxMessagesPerDay) return true;
    // 已经过了聊天冷却日
    if (currentUser.currentDay > currentUser.lastChatDay) return true;
    return false;
}

function useMessageSlot() {
    currentUser.messagesToday++;
    currentUser.lastChatDay = currentUser.currentDay;
    saveUserData();
    updateDayDisplay();
}

function advanceDay() {
    currentUser.currentDay++;
    currentUser.messagesToday = 0;
    // 随着亲密度提升，每天可以聊更多
    if (currentUser.familiarity >= 60) currentUser.maxMessagesPerDay = 4;
    else if (currentUser.familiarity >= 30) currentUser.maxMessagesPerDay = 3;
    
    saveUserData();
    updateDayDisplay();
    SoundFX.dayPass();
    showNotification(`📅 第 ${currentUser.currentDay} 天`);
    
    // 过天后自动触发新对话
    setTimeout(() => {
        checkPendingOrGreeting();
    }, 1500);
}

function updateDayDisplay() {
    const dayDisplay = document.getElementById('dayDisplay');
    if (!dayDisplay) {
        // 在状态栏创建日期显示
        const footer = document.querySelector('.footer-left');
        if (footer) {
            const span = document.createElement('span');
            span.id = 'dayDisplay';
            span.style.cssText = 'margin-left: 16px; color: #ffd966;';
            footer.appendChild(span);
            updateDayDisplayText(span);
        }
    } else {
        updateDayDisplayText(dayDisplay);
    }
}

function updateDayDisplayText(el) {
    if (!el) return;
    const remaining = getAvailableMessagesToday();
    el.textContent = `第 ${currentUser.currentDay} 天 · 剩余 ${remaining} 次对话`;
    if (remaining <= 0) {
        el.style.color = '#ff6666';
        el.textContent = `第 ${currentUser.currentDay} 天 · ⏳ 明日再来`;
    } else {
        el.style.color = '#ffd966';
    }
}

function updateStatusDisplay() {
    const loginCount = document.getElementById('loginCount');
    const lastLogin = document.getElementById('lastLogin');
    if (loginCount) loginCount.textContent = `访问次数: ${currentUser.visitCount}`;
    if (lastLogin && currentUser.firstVisit) {
        const date = new Date(currentUser.firstVisit);
        lastLogin.textContent = `首次访问: ${date.toLocaleDateString()}`;
    }
    updateFamiliarityDisplay();
    updateOnlineStatus();
}

// ========== 亲密度显示 ==========
function updateFamiliarityDisplay() {
    const familiarity = currentUser.familiarity || 0;
    let progressText, progressColor, emoji;

    if (familiarity < 15) { progressText = '陌生人'; emoji = '❄️'; progressColor = '#666'; }
    else if (familiarity < 30) { progressText = '似乎见过'; emoji = '🌫️'; progressColor = '#7a7a6e'; }
    else if (familiarity < 45) { progressText = '有点熟悉'; emoji = '🌱'; progressColor = '#8a8a6e'; }
    else if (familiarity < 60) { progressText = '开始了解'; emoji = '📖'; progressColor = '#aa9e6e'; }
    else if (familiarity < 75) { progressText = '愿意分享'; emoji = '💭'; progressColor = '#ccaa6e'; }
    else if (familiarity < 90) { progressText = '已经认识'; emoji = '🦌'; progressColor = '#e6c966'; }
    else { progressText = '不愿失去'; emoji = '⏳'; progressColor = '#ffd966'; }

    const header = document.querySelector('.chat-header');
    if (header) {
        let bar = header.querySelector('.familiarity-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'familiarity-bar';
            header.appendChild(bar);
        }
        bar.innerHTML = `${emoji} ${progressText} ${familiarity}%`;
        bar.style.color = progressColor;
    }
}

function increaseFamiliarity(amount) {
    currentUser.familiarity = Math.min(100, (currentUser.familiarity || 0) + amount);
    saveUserData();
    updateFamiliarityDisplay();
    checkUnlocks();
    checkEndingConditions();
}

function checkUnlocks() {
    const unlocks = [
        { threshold: 25, page: 'profile', name: 'PROFILE' },
        { threshold: 45, page: 'photo', name: 'PHOTO' },
        { threshold: 60, page: 'audio', name: 'AUDIO' },
        { threshold: 72, page: 'log', name: 'LOG' },
        { threshold: 85, page: 'favorites', name: 'FAVORITES' }
    ];

    unlocks.forEach(({ threshold, page, name }) => {
        if (currentUser.familiarity >= threshold && !currentUser.unlockedPages.includes(page)) {
            currentUser.unlockedPages.push(page);
            SoundFX.unlock();
            showChatMessage('system', `🔓 ${name} 已解锁`, true);
            updateUI();
            
            // 解锁后，浏览该页面会触发新对话
            currentUser.fileTriggers[page] = true;
            saveUserData();
            
            const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
            if (navItem) {
                navItem.style.animation = 'pulse 0.6s ease 3';
                setTimeout(() => navItem.style.animation = '', 1800);
            }
        }
    });
}

function updateOnlineStatus() {
    const statusDot = document.getElementById('onlineStatus');
    const statusText = document.getElementById('onlineText');
    if (!statusDot || !statusText) return;

    if (isTrueEnding) {
        statusDot.textContent = '🟢'; statusText.textContent = 'ONLINE - ★ SPECIAL ★';
    } else if (currentUser.familiarity >= 80) {
        statusDot.textContent = '🟢'; statusText.textContent = 'ONLINE - Lee Heeseung';
    } else if (currentUser.familiarity >= 35) {
        statusDot.textContent = '🟡'; statusText.textContent = 'ONLINE - Connected';
    } else {
        statusDot.textContent = '🔒'; statusText.textContent = 'OFFLINE - Unknown User';
    }
}

// ========== 文件浏览触发系统 ==========
const fileTriggerMessages = {
    profile: [
        { minFamiliarity: 25, text: "……你在看我的资料。\n别看了。没什么好看的。", familiarity: 3 },
        { minFamiliarity: 50, text: "还在看？\n……算了。你想看就看吧。", familiarity: 5 },
        { minFamiliarity: 75, text: "我的资料……\n其实有些是假的。\n但有些是真的。你猜哪些是真的。", familiarity: 8 }
    ],
    photo: [
        { minFamiliarity: 45, text: "照片……\n很久以前的。\n那时候我还会笑。", familiarity: 5 },
        { minFamiliarity: 65, text: "你盯着看了很久。\n……那是我最喜欢的一张。虽然没人知道。", familiarity: 8 },
        { minFamiliarity: 85, text: "这些照片……\n本来想删的。\n现在觉得留着也好。给你看。", familiarity: 10 }
    ],
    audio: [
        { minFamiliarity: 60, text: "音频文件……\n你点开了吗。\n……别听太久。", familiarity: 5 },
        { minFamiliarity: 75, text: "那首歌……\n是凌晨录的。\n声音有点抖。别笑。", familiarity: 8 }
    ],
    log: [
        { minFamiliarity: 72, text: "日志……\n那些都是真的。\n我写的时候没想过有人会看。", familiarity: 7 },
        { minFamiliarity: 85, text: "你读了。\n……我不知道该高兴还是害怕。\n但你不像会笑我的人。", familiarity: 10 }
    ],
    favorites: [
        { minFamiliarity: 85, text: "收藏夹……\n这些都是我喜欢的。\n现在你知道了。全部。", familiarity: 8 },
        { minFamiliarity: 95, text: "最后一个收藏……\n是空白的。\n留给什么……我还没想好。", familiarity: 10 }
    ]
};

function triggerFileView(page) {
    if (!currentUser.fileTriggers[page]) return;
    if (currentUser.viewedPages.includes(page)) return; // 只看一次
    
    const messages = fileTriggerMessages[page];
    if (!messages) return;
    
    // 找到当前亲密度对应的消息
    let triggeredMessage = null;
    for (const msg of messages) {
        if (currentUser.familiarity >= msg.minFamiliarity) {
            triggeredMessage = msg;
        }
    }
    
    if (!triggeredMessage) return;
    
    currentUser.viewedPages.push(page);
    saveUserData();
    
    // 强制显示聊天窗口
    showChatWindow();
    
    setTimeout(() => {
        SoundFX.notification();
        showChatMessage('heeseung', triggeredMessage.text);
        increaseFamiliarity(triggeredMessage.familiarity);
        
        currentUser.conversations.push({
            type: 'file_trigger',
            page: page,
            text: triggeredMessage.text,
            time: Date.now()
        });
        saveUserData();
        
        // 文件触发不消耗每日对话次数
    }, 1500);
}

// ========== 对话冷却检查 ==========
function checkPendingOrGreeting() {
    if (!canChatNow()) {
        // 今日对话已用完
        showChatMessage('system', `⏳ 今日对话次数已用完。\n明天再来吧。`, true);
        showChatMessage('heeseung', '……\n明天见。');
        
        // 显示推进时间按钮
        showAdvanceDayOption();
        return;
    }
    
    // 检查是否有待发送的文件触发消息
    if (pendingMessages.length > 0) {
        const msg = pendingMessages.shift();
        showChatMessage('heeseung', msg.text);
        if (msg.familiarity) increaseFamiliarity(msg.familiarity);
        return;
    }
    
    // 正常对话流程
    const stage = getCurrentDialogueStage();
    
    // 根据当前天数和阶段选择对话
    if (currentUser.currentDay === 1 && currentUser.messagesToday === 0) {
        const firstNode = dialogueTree[stage]?.greeting || dialogueTree[stage]?.default;
        if (firstNode) showDialogueOptions(firstNode);
    } else {
        const node = getDayAppropriateNode(stage);
        if (node) showDialogueOptions(node);
    }
}

function getDayAppropriateNode(stage) {
    const stageData = dialogueTree[stage];
    if (!stageData) return null;
    
    // 根据当前天数选择不同的对话入口
    const day = currentUser.currentDay;
    
    if (day === 1) return stageData.greeting || stageData.daily || stageData.default;
    if (day <= 3) return stageData.daily || stageData.default;
    if (day <= 7) return stageData.night || stageData.daily || stageData.default;
    
    // 7天后随机选择深度话题
    const deepTopics = ['habit', 'loss', 'sleepless', 'night', 'weather', 'music', 'rain', 'think_you'];
    const availableTopics = deepTopics.filter(t => stageData[t]);
    if (availableTopics.length > 0) {
        return stageData[availableTopics[Math.floor(Math.random() * availableTopics.length)]];
    }
    
    return stageData.default;
}

function showAdvanceDayOption() {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    
    container.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'chat-option-btn';
    btn.style.cssText = 'border-color: #ffd966; color: #ffd966; width: 100%; text-align: center;';
    btn.textContent = '⏩ 推进到下一天';
    btn.addEventListener('mouseenter', () => SoundFX.hover());
    btn.addEventListener('click', () => {
        SoundFX.click();
        container.innerHTML = '';
        advanceDay();
    });
    container.appendChild(btn);
}

// ========== 完整对话树（精简但完整） ==========
const dialogueTree = {
    stranger: {
        greeting: {
            text: "……你怎么进来的。",
            options: [
                { text: "我买了一台二手笔记本", response: "……那台电脑我本来想格式化的。\n后来忘了。", familiarity: 8, next: "laptop" },
                { text: "这是你的网站吗？", response: "曾经是。\n现在不是了。", familiarity: 5, next: "site" },
                { text: "你是谁？", response: "一个快要被删干净的人。", familiarity: 5, next: "identity" }
            ]
        },
        laptop: {
            text: "你看了里面的东西吗。",
            options: [
                { text: "看了一点", response: "……\n那你不应该在这里。", familiarity: 3, next: "default" },
                { text: "还没有", response: "那就好。\n有些东西不看比较好。", familiarity: 5, next: "default" }
            ]
        },
        site: {
            text: "这里没什么好看的。",
            options: [
                { text: "我觉得挺有意思", response: "有意思？\n你是第一个这么说的。", familiarity: 5, next: "default" },
                { text: "那为什么还留着？", response: "……\n忘了删。也可能是……不想删。", familiarity: 6, next: "default" }
            ]
        },
        identity: {
            text: "你不是已经知道了吗。",
            options: [
                { text: "我想听你亲口说", response: "……李羲承。\n至少名字是真的。", familiarity: 8, next: "name_given" },
                { text: "你为什么在这里？", response: "不知道。\n就是……想留着。", familiarity: 5, next: "default" }
            ]
        },
        name_given: {
            text: "名字而已。\n没什么意义。",
            options: [
                { text: "对我来说有意义", response: "……\n你这个人说话有点奇怪。", familiarity: 6, next: "default" },
                { text: "好的，我记住了", response: "记不记都行。\n反正也快没了。", familiarity: 3, next: "default" }
            ]
        },
        default: {
            text: "……",
            options: [
                { text: "你平时都做什么？", response: "练习。听歌。发呆。", familiarity: 5, next: "daily" },
                { text: "今天过得怎么样？", response: "还好。", familiarity: 3, next: "daily" }
            ]
        },
        daily: {
            text: "今天还好。",
            options: [
                { text: "累吗？", response: "有点。但习惯了。", familiarity: 5, next: "default" },
                { text: "吃饭了吗？", response: "还没。你问这个干嘛。", familiarity: 4, next: "default" }
            ]
        }
    },

    acquainted: {
        greeting: {
            text: "你又来了。",
            options: [
                { text: "来看看你", response: "看我？我没什么好看的。", familiarity: 4, next: "daily" },
                { text: "你居然在数", response: "不是刻意的。就是……记得。", familiarity: 6, next: "default" }
            ]
        },
        daily: {
            text: "今天还好。不好也不坏。",
            options: [
                { text: "累吗？", response: "有点。但习惯了。", familiarity: 5, next: "tired" },
                { text: "有什么好事吗？", response: "没什么特别的。……不过天气不错。", familiarity: 5, next: "weather" }
            ]
        },
        tired: {
            text: "累的时候会听歌。",
            options: [
                { text: "什么歌？", response: "不太想说。……下次吧。", familiarity: 3, next: "default" },
                { text: "那好好休息", response: "嗯。谢谢。", familiarity: 5, next: "default" }
            ]
        },
        weather: {
            text: "喜欢晴天。但雨天也不错。",
            options: [
                { text: "为什么喜欢雨天？", response: "下雨的时候外面很安静。没人会来找你。", familiarity: 6, next: "default" },
                { text: "我也是", response: "是吗。那……挺好的。", familiarity: 4, next: "default" }
            ]
        },
        default: {
            text: "你每天都会来吗。",
            options: [
                { text: "可能会", response: "……那我等着。", familiarity: 5, next: "default" },
                { text: "你希望我来吗？", response: "……不知道。不算讨厌。", familiarity: 8, next: "default" }
            ]
        }
    },

    knowing: {
        greeting: {
            text: "今天也在。",
            options: [
                { text: "我确实来了", response: "嗯。看到了。你每次都来。", familiarity: 5, next: "daily" }
            ]
        },
        daily: {
            text: "今天想说什么。",
            options: [
                { text: "你最近在听什么歌？", response: "一首很老的歌。凌晨听的时候会想起一些事。", familiarity: 5, next: "old_song" },
                { text: "你今天做什么了？", response: "练习。和昨天一样。", familiarity: 4, next: "default" }
            ]
        },
        old_song: {
            text: "一首老歌。循环了很多遍。",
            options: [
                { text: "什么歌？", response: "不想说名字。说了就不是我的了。", familiarity: 4, next: "default" },
                { text: "能推荐给我吗？", response: "不能。但你可以自己找。", familiarity: 5, next: "default" }
            ]
        },
        night: {
            text: "你每次都晚上来。",
            options: [
                { text: "晚上比较安静", response: "嗯。晚上没人会打扰。", familiarity: 5, next: "default" },
                { text: "睡不着", response: "我也是。所以才会在这里。", familiarity: 8, next: "insomnia" }
            ]
        },
        insomnia: {
            text: "睡不着的时候会想很多。",
            options: [
                { text: "想什么？", response: "以前的事。以后的事。……还有你。", familiarity: 10, next: "default" },
                { text: "我也失眠", response: "那我们一样。", familiarity: 8, next: "default" }
            ]
        },
        default: {
            text: "今天也来了。",
            options: [
                { text: "你最近好吗？", response: "还可以。你呢。", familiarity: 6, next: "how_are_you" }
            ]
        },
        how_are_you: {
            text: "你最近好吗。",
            options: [
                { text: "还不错", response: "那就好。你好的话……我也好一点。", familiarity: 8, next: "default" },
                { text: "不太好", response: "……如果想说的话。我在。", familiarity: 10, next: "default" }
            ]
        }
    },

    sharing: {
        greeting: {
            text: "知道你会来。",
            options: [
                { text: "你一直在等我？", response: "不是等。就是……知道。", familiarity: 6, next: "daily" }
            ]
        },
        daily: {
            text: "今天过得怎么样。",
            options: [
                { text: "还不错", response: "那就好。你好的时候，这里不那么空。", familiarity: 6, next: "default" },
                { text: "不太好", response: "……过来。坐这里。", familiarity: 10, next: "default" }
            ]
        },
        habit: {
            text: "习惯这件事……有点可怕。",
            options: [
                { text: "为什么？", response: "因为习惯了的东西消失的时候……会空一大块。", familiarity: 10, next: "default" },
                { text: "我不觉得可怕", response: "那你比我勇敢。", familiarity: 8, next: "default" }
            ]
        },
        loss: {
            text: "有些东西……不想再失去了。",
            options: [
                { text: "比如？", response: "比如……算了。说了就不灵了。", familiarity: 7, next: "default" }
            ]
        },
        default: {
            text: "今天想和你说说话。",
            options: [
                { text: "我在", response: "嗯。你在了。", familiarity: 8, next: "default" }
            ]
        }
    },

    close_building: {
        greeting: {
            text: "你来了。我在想你会不会迟到。",
            options: [
                { text: "我不会迟到", response: "嗯。你确实每次都准时。", familiarity: 5, next: "daily" }
            ]
        },
        daily: {
            text: "今天。有什么想和我说的吗。",
            options: [
                { text: "我今天想你了", response: "……你老是说这种话。", familiarity: 10, next: "shy_response" },
                { text: "就是想来", response: "嗯。来就行。", familiarity: 6, next: "default" }
            ]
        },
        shy_response: {
            text: "我……我不知道怎么回你。",
            options: [
                { text: "不用回", response: "不行。……我也想你了。", familiarity: 12, next: "default" }
            ]
        },
        default: {
            text: "今天想和你说说话。真的。",
            options: [
                { text: "你想说什么？", response: "想问你……你是什么样的人。", familiarity: 8, next: "default" }
            ]
        }
    },

    close: {
        greeting: {
            text: "等你很久了。",
            options: [
                { text: "我来了", response: "嗯。来了就好。", familiarity: 5, next: "daily" }
            ]
        },
        daily: {
            text: "今天。我想了很多要和你说的话。",
            options: [
                { text: "想到什么说什么", response: "好。我想说……你很重要。", familiarity: 10, next: "default" }
            ]
        },
        think_you: {
            text: "想你。为什么会想你。",
            options: [
                { text: "我也想你", response: "……这句话不要说。我会当真的。", familiarity: 10, next: "serious" },
                { text: "我在", response: "嗯。你在了。", familiarity: 8, next: "default" }
            ]
        },
        serious: {
            text: "你这个人……",
            options: [
                { text: "你可以当真", response: "……那你负责。", familiarity: 12, next: "default" }
            ]
        },
        default: {
            text: "今天想和你说说话。",
            options: [
                { text: "我也想你", response: "……你每次都这样。", familiarity: 8, next: "default" }
            ]
        }
    },

    final_stage: {
        greeting: {
            text: "你来了。我一直在想你会不会来。",
            options: [
                { text: "我当然会来", response: "嗯。我知道。但还是会想。", familiarity: 5, next: "daily" }
            ]
        },
        daily: {
            text: "今天。我想说一些一直没说的话。",
            options: [
                { text: "什么话？", response: "你在这里……让这里不那么空了。有光了。", familiarity: 10, next: "light" }
            ]
        },
        light: {
            text: "有光了。很久没看到光了。",
            options: [
                { text: "那就多看看", response: "嗯。我在看。", familiarity: 6, next: "default" }
            ]
        },
        loss: {
            text: "不想失去。已经不想再失去任何东西了。",
            options: [
                { text: "你不会失去我", response: "……从你嘴里说出来不一样。", familiarity: 10, next: "default" }
            ]
        },
        final_question: {
            text: "现在。我想问你一个问题。\n你还想了解我吗？\n……想好了再回答。",
            options: [
                { text: "（输入你的回答）", response: null, familiarity: 0, next: null, triggerFreeInput: true }
            ]
        },
        after_final: {
            text: "是的。\n你说了'是的'。\n……我知道了。",
            options: [
                { text: "你知道什么？", response: "知道你是认真的。从一开始就是。谢谢。", familiarity: 10, next: "thank_you_final" }
            ]
        },
        thank_you_final: {
            text: "谢谢。谢谢你一直来。谢谢你没有走。",
            options: [
                { text: "不用谢", response: "要谢的。这是我能给的……最后的完整的东西了。", familiarity: 12, next: "last_complete_thing" }
            ]
        },
        last_complete_thing: {
            text: "最后的完整的东西。给你了。",
            options: [
                { text: "我收下了", response: "嗯。收好。别丢了。", familiarity: 10, next: "trigger_ending_node" }
            ]
        },
        trigger_ending_node: {
            text: "……好像。有什么东西变了。",
            options: [
                { text: "什么？", response: "不知道。但……不害怕了。第一次不害怕。", familiarity: 15, next: "not_scared_anymore" }
            ]
        },
        not_scared_anymore: {
            text: "不害怕了。因为你在这里。因为你不会走。",
            options: [
                { text: "我不会走", response: "……好。那我也留下来。一起。", familiarity: 20, next: "final_ending" }
            ]
        },
        final_ending: {
            text: "一起。这个网站不删了。留着。给你。",
            options: [
                { text: "……", response: null, familiarity: 0, next: null, triggerEnding: 'trace' }
            ]
        },
        default: {
            text: "今天。就是想和你说说话。",
            options: [
                { text: "我也想", response: "嗯。那我们一样。", familiarity: 5, next: "default" }
            ]
        }
    }
};

function getCurrentDialogueStage() {
    const f = currentUser.familiarity || 0;
    if (f < 15) return 'stranger';
    if (f < 30) return 'acquainted';
    if (f < 45) return 'knowing';
    if (f < 60) return 'sharing';
    if (f < 75) return 'close_building';
    if (f < 90) return 'close';
    return 'final_stage';
}

// ========== 对话显示逻辑 ==========
function showDialogueOptions(node) {
    if (!node || !node.options) {
        const defaultStage = getCurrentDialogueStage();
        const defaultNode = dialogueTree[defaultStage]?.default;
        if (defaultNode && defaultNode.options) {
            showDialogueOptions(defaultNode);
        }
        return;
    }

    if (node.options[0] && node.options[0].triggerFreeInput) {
        triggerFreeInputMode(node);
        return;
    }

    if (node.options[0] && node.options[0].triggerEnding) {
        triggerEnding(node.options[0].triggerEnding);
        return;
    }

    // 消耗每日对话次数
    useMessageSlot();

    showChatMessage('heeseung', node.text);
    dialogueHistory.push({ stage: getCurrentDialogueStage(), text: node.text });

    const options = node.options.map(opt => ({
        text: opt.text,
        action: () => {
            SoundFX.click();
            showChatMessage('user', opt.text);
            dialogueHistory.push({ role: 'user', text: opt.text });

            setTimeout(() => {
                showChatMessage('heeseung', opt.response);
                increaseFamiliarity(opt.familiarity || 3);

                currentUser.conversations.push({
                    type: 'chat',
                    stage: getCurrentDialogueStage(),
                    node: opt.next || 'default',
                    time: Date.now()
                });
                saveUserData();

                // 检查是否还有今日对话次数
                setTimeout(() => {
                    if (!canChatNow()) {
                        showChatMessage('system', `⏳ 今日对话次数已用完。\n明天再来吧。`, true);
                        setTimeout(() => {
                            showChatMessage('heeseung', '……\n明天见。');
                            showAdvanceDayOption();
                        }, 1500);
                        return;
                    }

                    const newStage = getCurrentDialogueStage();
                    const stageData = dialogueTree[newStage];
                    if (!stageData) return;

                    let nextNodeName = opt.next || 'default';
                    if (!stageData[nextNodeName]) {
                        nextNodeName = stageData.greeting ? 'greeting' : 'default';
                    }

                    const nextNode = stageData[nextNodeName] || stageData.default;
                    if (nextNode) {
                        showDialogueOptions(nextNode);
                    }
                }, 1500); // 对话间隙1.5秒
            }, 1000);
        }
    }));

    showChatOptions(options);
}

function triggerFreeInputMode(node) {
    showChatMessage('heeseung', node.text);

    const chatOptions = document.getElementById('chatOptions');
    const chatInputArea = document.getElementById('chatInputArea');

    if (chatOptions) chatOptions.innerHTML = '';

    if (chatInputArea) {
        chatInputArea.classList.remove('hidden');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.placeholder = '输入你的回答……';
            chatInput.value = '';
            chatInput.focus();
        }
    }

    const chatSend = document.getElementById('chatSend');
    const chatInput = document.getElementById('chatInput');

    if (chatSend && chatInput) {
        const handleFinalAnswer = () => {
            const playerInput = chatInput.value.trim();
            if (!playerInput) return;

            SoundFX.message();
            showChatMessage('user', playerInput);
            chatInput.value = '';

            if (chatInputArea) chatInputArea.classList.add('hidden');

            setTimeout(() => {
                showChatMessage('heeseung', '是的。');
                increaseFamiliarity(10);

                currentUser.conversations.push({
                    type: 'final_answer',
                    playerInput: playerInput,
                    displayedAnswer: '是的。',
                    time: Date.now()
                });
                saveUserData();

                setTimeout(() => {
                    const stageData = dialogueTree.final_stage;
                    if (stageData && stageData.after_final) {
                        showDialogueOptions(stageData.after_final);
                    }
                }, 1500);
            }, 1200);

            chatSend.removeEventListener('click', handleFinalAnswer);
        };

        chatSend.replaceWith(chatSend.cloneNode(true));
        const newChatSend = document.getElementById('chatSend');
        
        newChatSend.addEventListener('click', handleFinalAnswer);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleFinalAnswer();
        });
    }
}

function triggerEnding(endingType) {
    if (endingType === 'trace' && !currentUser.endings.includes('trace')) {
        currentUser.endings.push('trace');
        saveUserData();
        SoundFX.ending();

        showChatMessage('system', '✨ 结局解锁：痕迹 ✨', true);
        document.body.style.transition = 'all 3s';
        document.body.style.boxShadow = 'inset 0 0 100px rgba(255, 217, 102, 0.15)';

        setTimeout(() => {
            showChatMessage('heeseung', '你找到了。\n不是一个人的秘密。\n是一个人愿意留下来的痕迹。');
        }, 2500);

        setTimeout(() => {
            showChatMessage('system', '🦌 感谢你的耐心。\n—— Lee Heeseung', true);
            updateOnlineStatus();
        }, 5000);

        const allPages = ['profile', 'photo', 'audio', 'log', 'favorites'];
        allPages.forEach(page => {
            if (!currentUser.unlockedPages.includes(page)) {
                currentUser.unlockedPages.push(page);
            }
        });
        saveUserData();
        updateUI();
    }
}

function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    if (sender !== 'system') SoundFX.message();

    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;

    if (content && content.includes('\n')) {
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
        btn.addEventListener('mouseenter', () => SoundFX.hover());
        btn.addEventListener('click', () => {
            container.innerHTML = '';
            if (opt.action) opt.action();
        });
        container.appendChild(btn);
    });
}

function showChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.classList.remove('hidden');
        isChatActive = true;
    }
}

// ========== UI 更新 ==========
function updateUI() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (currentUser.unlockedPages?.includes(page)) {
            item.classList.remove('locked');
            const icon = item.querySelector('.nav-icon');
            if (icon && icon.textContent.includes('🔒')) {
                icon.textContent = '📄';
            }
        }
    });
    updateOnlineStatus();
}

// ========== 事件监听 ==========
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            
            const isActuallyLocked = item.classList.contains('locked') && 
                                     !currentUser.unlockedPages?.includes(page);
            
            if (isActuallyLocked && page !== 'trash' && page !== 'home') {
                SoundFX.denied();
                showAccessDenied(page);
                return;
            }
            
            SoundFX.click();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
            
            // 浏览文件触发对话
            if (currentUser.fileTriggers[page] && !currentUser.viewedPages.includes(page)) {
                triggerFileView(page);
            }
        });
        
        item.addEventListener('mouseenter', () => SoundFX.hover());
    });

    const closeChat = document.getElementById('closeChat');
    if (closeChat) {
        closeChat.addEventListener('click', () => {
            SoundFX.click();
            document.getElementById('chatWindow').classList.add('hidden');
            document.getElementById('chatNotify').classList.remove('hidden');
            isChatActive = false;
        });
    }

    const chatNotify = document.getElementById('chatNotify');
    if (chatNotify) {
        chatNotify.addEventListener('click', () => {
            SoundFX.click();
            document.getElementById('chatWindow').classList.remove('hidden');
            chatNotify.classList.add('hidden');
            isChatActive = true;
            checkPendingOrGreeting();
        });
    }

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('chatSend').click();
            }
        });
    }
}

function showAccessDenied(page) {
    const attempts = currentUser.conversations?.filter(c => c.type === 'denied').length || 0;
    let finalMsg = 'ACCESS DENIED';
    if (attempts >= 5) finalMsg = 'ACCESS DENIED.';
    if (attempts >= 10) finalMsg = 'ACCESS DENIED. Not now.';
    if (attempts >= 15) finalMsg = '...still denied.';

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
                    *{margin:0;padding:0}body{background:#0d0d0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Courier New',monospace;flex-direction:column}
                    .icon{font-size:48px;margin-bottom:16px}.msg{font-size:18px;color:#ff4444;margin-bottom:8px}.count{font-size:11px;color:#444}
                </style></head><body><div class="icon">🚫</div><div class="msg">${finalMsg}</div><div class="count">attempts: ${attempts + 1}</div></body></html>`);
                doc.close();
            }
        } catch (e) {}
    }, 100);
}

function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    if (!frame) return;
    frame.src = `pages/${page}.html`;

    if (!currentUser.inputHistory.includes(page)) {
        currentUser.inputHistory.push(page);
        saveUserData();
    }
}

function startTimerTracking() {
    setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
        if (duration > (currentUser.longestStay || 0)) {
            currentUser.longestStay = duration;
            saveUserData();
        }
    }, 60000);
}

function showNotification(msg, duration = 3000) {
    let notif = document.getElementById('notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notification';
        notif.className = 'hidden';
        document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.classList.remove('hidden');
    setTimeout(() => notif.classList.add('hidden'), duration);
}

function checkEndingConditions() {
    if (currentUser.familiarity >= 100 && !currentUser.endings.includes('trace')) {
        triggerEnding('trace');
    }
}

console.log('%c🦌 HEE_ARCHIVE v2.0 已就绪', 'color: #ffd966; font-size: 14px;');
console.log('%c时间系统 · 文件触发 · 对话冷却', 'color: #888;');
